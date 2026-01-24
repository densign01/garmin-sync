import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findGarminExerciseWithSuggestions, type ExerciseSuggestion } from '@/lib/garmin-exercises'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Common aliases not in the Garmin database
const EXERCISE_ALIASES: Record<string, string> = {
  // Abbreviations
  'rdl': 'romanian deadlift',
  'ohp': 'overhead press',
  'ghr': 'ghd sit-ups',
  'db': 'dumbbell',

  // Compound words (no space/hyphen variants)
  'pullup': 'pull-up',
  'pullups': 'pull-up',
  'chinup': 'chin-up',
  'chinups': 'chin-up',
  'pushup': 'push-up',
  'pushups': 'push-up',
  'pulldown': 'lat pull-down',
  'lat pulldown': 'lat pull-down',
  'deadlift': 'barbell deadlift',

  // Farmer's walk variants
  'farmers walk': "farmer's walk",
  'farmer walk': "farmer's walk",
  'farmers carry': "farmer's carry",
  'farmer carry': "farmer's carry",

  // Bench press variants
  'dumbbell press': 'dumbbell bench press',
  'db press': 'dumbbell bench press',
  'db bench': 'dumbbell bench press',
  'incline db press': 'incline dumbbell bench press',
  'incline dumbbell press': 'incline dumbbell bench press',
  'flat bench': 'barbell bench press',

  // Deadlift variants
  'trap bar deadlift': 'trap-bar deadlift',
  'hex bar deadlift': 'trap-bar deadlift',

  // Other common names
  'skull crushers': 'lying triceps extension',
  'skullcrushers': 'lying triceps extension',
  'glute ham raise': 'ghd sit-ups',
  'glute ham developer': 'ghd sit-ups',
  'dead hang': 'bar holds',  // closest match - passive hang
  'hanging': 'bar holds',

  // Core stability (bird dog → dead bug, similar exercises)
  'bird dog': 'dead bug',
  'bird dogs': 'dead bug',
  'dead bugs': 'dead bug',
  'mountain climbers': 'mountain climber',
  'lunges': 'lunge',
  'squats': 'squat',
  'curls': 'curl',
  'rows': 'row',
  'dips': 'dip',
  'shrugs': 'shrug',
}

// Distance-based exercises (use meters instead of reps)
const DISTANCE_EXERCISES = ['farmer walk', 'farmers walk', 'farmer carry', 'farmers carry', "farmer's walk", "farmer's carry"]

const PARSE_PROMPT = `You are a workout parser. Convert the user's plain text workout description into structured JSON.

Output ONLY valid JSON with this structure:
{
  "name": "Workout name",
  "exercises": [
    {
      "name": "exercise name (lowercase)",
      "original_input": "Exercise Name (Qualifier) - exactly as written by user",
      "sets": 3,
      "reps": 10,
      "weight_lbs": 135,
      "rest_seconds": 90,
      "distance_meters": null
    }
  ]
}

Rules:
- If no weight specified, omit weight_lbs
- Default rest is 90 seconds unless specified
- "3x10" means 3 sets of 10 reps
- "135lbs" or "135 lbs" or "135#" or "@ 135" all mean weight in pounds
- If workout has no name, generate one based on exercises (e.g., "Upper Body", "Push Day")
- Normalize exercise names to common form (e.g., "DB bench" -> "dumbbell bench press")
- IMPORTANT: Preserve the original_input field with the exercise name EXACTLY as written by the user, including any qualifiers like "(Warm-up)", "(Work)", "(Heavy)", etc. This helps distinguish duplicate exercises.
- For farmer's walk/carry: use distance_meters instead of reps
  - "40 yards" = 37 meters, "50 yards" = 46 meters, "100 feet" = 30 meters
  - If distance given, set reps to 1 and include distance_meters
  - Example: "farmer's walk 3x40 yards @ 70lbs" -> sets: 3, reps: 1, distance_meters: 37, weight_lbs: 70

User input:
`

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Call Gemini
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PARSE_PROMPT + text }] }],
        generationConfig: {
          temperature: 0.1, // Low for consistent parsing
          maxOutputTokens: 1000,
        },
      }),
    })

    if (!response.ok) {
      console.error('Gemini API error:', await response.text())
      return NextResponse.json({ error: 'Gemini API error' }, { status: 500 })
    }

    const result = await response.json()
    let textResult = result?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extract JSON from response (handle markdown code blocks)
    if (textResult.includes('```json')) {
      textResult = textResult.split('```json')[1].split('```')[0]
    } else if (textResult.includes('```')) {
      textResult = textResult.split('```')[1].split('```')[0]
    }

    try {
      const parsed = JSON.parse(textResult.trim())

      // Map exercise names to Garmin IDs using 1,500+ exercise database
      const exerciseWarnings: { exercise: string; message: string; suggestions: ExerciseSuggestion[] }[] = []

      for (const ex of parsed.exercises || []) {
        let nameLower = ex.name.toLowerCase().trim()

        // Check aliases first (e.g., "rdl" -> "romanian deadlift")
        if (EXERCISE_ALIASES[nameLower]) {
          nameLower = EXERCISE_ALIASES[nameLower]
        }

        // Look up in Garmin exercise database with confidence scoring
        const result = findGarminExerciseWithSuggestions(nameLower)

        if (result.match) {
          ex.category = result.match.category
          ex.garmin_name = result.match.garminName
          ex.confidence = result.match.confidence
          ex.garmin_display_name = result.match.displayName

          // Add warning for low-confidence matches
          if (result.match.confidence === 'none') {
            exerciseWarnings.push({
              exercise: ex.name,
              message: `"${ex.name}" not found in Garmin database. Will show as "Core" on watch.`,
              suggestions: result.suggestions,
            })
          } else if (result.match.confidence === 'medium' && result.suggestions.length > 0) {
            exerciseWarnings.push({
              exercise: ex.name,
              message: `"${ex.name}" matched to "${result.match.displayName}" (medium confidence)`,
              suggestions: result.suggestions,
            })
          }
        }
      }

      return NextResponse.json({
        parsed,
        raw_input: text,
        warnings: exerciseWarnings.length > 0 ? exerciseWarnings : undefined,
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw:', textResult)
      return NextResponse.json(
        { error: 'Failed to parse workout', raw: textResult },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Parse workout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
