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

const PARSE_PROMPT = `You are a workout parser. Convert the user's plain text workout description into structured JSON.

Output ONLY valid JSON with this structure:
{
  "name": "Workout name",
  "exercises": [
    {
      "name": "exercise name (lowercase)",
      "original_input": "Exercise Name (Qualifier) - exactly as written by user",
      "target_type": "reps",
      "sets": 3,
      "reps": 10,
      "duration_seconds": null,
      "weight_lbs": 135,
      "rest_seconds": null,
      "distance_meters": null
    }
  ]
}

Rules:
- If no weight specified, omit weight_lbs
- If no rest is specified, omit rest_seconds or set it to null. Do not invent a default rest.
- If rest is specified, convert it to rest_seconds
- "3x10" means 3 sets of 10 reps
- "135lbs" or "135 lbs" or "135#" or "@ 135" all mean weight in pounds
- If workout has no name, generate one based on exercises (e.g., "Upper Body", "Push Day")
- Normalize exercise names to common form (e.g., "DB bench" -> "dumbbell bench press")
- IMPORTANT: Preserve the original_input field with the exercise name EXACTLY as written by the user, including any qualifiers like "(Warm-up)", "(Work)", "(Heavy)", etc. This helps distinguish duplicate exercises.
- Use target_type "reps" for normal rep-based exercises
- Use target_type "time" for exercises done for seconds/minutes
  - "plank 3x45 sec" -> sets: 3, reps: 1, target_type: "time", duration_seconds: 45
  - "wall sit 4x1 min" -> sets: 4, reps: 1, target_type: "time", duration_seconds: 60
  - "battle ropes 8x30s, rest 30s" -> target_type: "time", duration_seconds: 30, rest_seconds: 30
- For farmer's walk/carry: use distance_meters instead of reps
  - Use target_type "distance"
  - "40 yards" = 37 meters, "50 yards" = 46 meters, "100 feet" = 30 meters
  - If distance given, set reps to 1 and include distance_meters
  - Example: "farmer's walk 3x40 yards @ 70lbs" -> target_type: "distance", sets: 3, reps: 1, distance_meters: 37, weight_lbs: 70

User input:
`

type TargetType = 'reps' | 'time' | 'distance'

type ParsedExercise = {
  name?: string
  original_input?: string
  target_type?: TargetType
  sets?: number
  reps?: number
  duration_seconds?: number | null
  weight_lbs?: number
  rest_seconds?: number | null
  distance_meters?: number | null
  [key: string]: unknown
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

function secondsFromValue(value: number, unit: string | undefined): number {
  const normalized = (unit || 'sec').toLowerCase()
  return Math.round(normalized.startsWith('m') ? value * 60 : value)
}

function parseDurationSeconds(source: string): number | undefined {
  const withoutRest = source
    .replace(/\brest(?:s)?\s*(?:for|:|=)?\s*\d+(?:\.\d+)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)?\b/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\s+rest\b/gi, '')
  const match = withoutRest.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\b/i)
  if (!match) return undefined
  return secondsFromValue(Number(match[1]), match[2])
}

function hasExplicitRest(source: string): boolean {
  return /\brest(?:s|ing)?\b/i.test(source) || /\br\s*[:=]\s*\d+/i.test(source)
}

function parseRestSeconds(source: string): number | undefined {
  if (/\b(?:no|zero)\s+rest\b/i.test(source) || /\brest(?:s)?\s*(?:for|:|=)?\s*0\b/i.test(source)) {
    return 0
  }

  const afterRest = source.match(/\brest(?:s)?\s*(?:for|:|=)?\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)?\b/i)
  if (afterRest) return secondsFromValue(Number(afterRest[1]), afterRest[2])

  const beforeRest = source.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|sec|s|minutes?|mins?|min|m)\s+rest\b/i)
  if (beforeRest) return secondsFromValue(Number(beforeRest[1]), beforeRest[2])

  return undefined
}

function normalizeExerciseTarget(ex: ParsedExercise): void {
  const source = `${ex.original_input || ''} ${ex.name || ''}`.trim()
  const explicitTarget = ex.target_type === 'reps' || ex.target_type === 'time' || ex.target_type === 'distance'
    ? ex.target_type
    : undefined
  const duration = asPositiveNumber(ex.duration_seconds) || parseDurationSeconds(source)
  const distance = asPositiveNumber(ex.distance_meters)

  if (hasExplicitRest(source)) {
    const parsedRest = parseRestSeconds(source)
    const modelRest = typeof ex.rest_seconds === 'number' && Number.isFinite(ex.rest_seconds) && ex.rest_seconds >= 0
      ? Math.round(ex.rest_seconds)
      : undefined
    // Text like "no rest" must override any model-invented default.
    ex.rest_seconds = parsedRest !== undefined ? parsedRest : modelRest ?? null
  } else {
    delete ex.rest_seconds
  }

  if (explicitTarget === 'distance' || (!explicitTarget && distance)) {
    ex.target_type = 'distance'
    ex.distance_meters = distance || 37
    ex.duration_seconds = null
    ex.reps = 1
    return
  }

  if (explicitTarget === 'time' || (!explicitTarget && duration)) {
    ex.target_type = 'time'
    ex.duration_seconds = duration || 30
    ex.distance_meters = null
    ex.reps = 1
    return
  }

  ex.target_type = 'reps'
  ex.duration_seconds = null
  ex.distance_meters = null
  ex.reps = asPositiveNumber(ex.reps) || 10
}

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
          maxOutputTokens: 1500,
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
        normalizeExerciseTarget(ex)

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
