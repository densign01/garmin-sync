import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Map common exercise names to Garmin's exact IDs
const EXERCISE_CATEGORIES: Record<string, [string, string]> = {
  'bench press': ['BENCH_PRESS', 'BARBELL_BENCH_PRESS'],
  'barbell bench press': ['BENCH_PRESS', 'BARBELL_BENCH_PRESS'],
  'dumbbell bench press': ['BENCH_PRESS', 'DUMBBELL_BENCH_PRESS'],
  'incline bench': ['BENCH_PRESS', 'INCLINE_DUMBBELL_BENCH_PRESS'],
  'incline bench press': ['BENCH_PRESS', 'INCLINE_DUMBBELL_BENCH_PRESS'],
  'squat': ['SQUAT', 'BARBELL_BACK_SQUAT'],
  'back squat': ['SQUAT', 'BARBELL_BACK_SQUAT'],
  'front squat': ['SQUAT', 'BARBELL_FRONT_SQUAT'],
  'goblet squat': ['SQUAT', 'GOBLET_SQUAT'],
  'deadlift': ['DEADLIFT', 'BARBELL_DEADLIFT'],
  'romanian deadlift': ['DEADLIFT', 'ROMANIAN_DEADLIFT'],
  'rdl': ['DEADLIFT', 'ROMANIAN_DEADLIFT'],
  'sumo deadlift': ['DEADLIFT', 'SUMO_DEADLIFT'],
  'overhead press': ['SHOULDER_PRESS', 'OVERHEAD_BARBELL_PRESS'],
  'ohp': ['SHOULDER_PRESS', 'OVERHEAD_BARBELL_PRESS'],
  'shoulder press': ['SHOULDER_PRESS', 'OVERHEAD_BARBELL_PRESS'],
  'military press': ['SHOULDER_PRESS', 'OVERHEAD_BARBELL_PRESS'],
  'dumbbell shoulder press': ['SHOULDER_PRESS', 'DUMBBELL_SHOULDER_PRESS'],
  'barbell row': ['ROW', 'BENT_OVER_ROW'],
  'bent over row': ['ROW', 'BENT_OVER_ROW'],
  'dumbbell row': ['ROW', 'ONE_ARM_DUMBBELL_ROW'],
  'cable row': ['ROW', 'SEATED_CABLE_ROW'],
  'seated row': ['ROW', 'SEATED_CABLE_ROW'],
  'pull up': ['PULL_UP', 'PULL_UP'],
  'pullup': ['PULL_UP', 'PULL_UP'],
  'chin up': ['PULL_UP', 'CHIN_UP'],
  'chinup': ['PULL_UP', 'CHIN_UP'],
  'lat pulldown': ['PULL_UP', 'LAT_PULLDOWN'],
  'bicep curl': ['CURL', 'BARBELL_BICEPS_CURL'],
  'barbell curl': ['CURL', 'BARBELL_BICEPS_CURL'],
  'dumbbell curl': ['CURL', 'DUMBBELL_BICEPS_CURL'],
  'hammer curl': ['CURL', 'HAMMER_CURL'],
  'preacher curl': ['CURL', 'PREACHER_CURL'],
  'tricep pushdown': ['TRICEPS_EXTENSION', 'TRICEPS_PRESSDOWN'],
  'triceps pushdown': ['TRICEPS_EXTENSION', 'TRICEPS_PRESSDOWN'],
  'tricep extension': ['TRICEPS_EXTENSION', 'OVERHEAD_TRICEPS_EXTENSION'],
  'triceps extension': ['TRICEPS_EXTENSION', 'OVERHEAD_TRICEPS_EXTENSION'],
  'skull crusher': ['TRICEPS_EXTENSION', 'LYING_TRICEPS_EXTENSION'],
  'close grip bench': ['TRICEPS_EXTENSION', 'CLOSE_GRIP_BENCH_PRESS'],
  'leg press': ['SQUAT', 'LEG_PRESS'],
  'leg curl': ['LEG_CURL', 'LYING_LEG_CURL'],
  'leg extension': ['LEG_CURL', 'LEG_EXTENSION'],
  'calf raise': ['CALF_RAISE', 'STANDING_CALF_RAISE'],
  'standing calf raise': ['CALF_RAISE', 'STANDING_CALF_RAISE'],
  'seated calf raise': ['CALF_RAISE', 'SEATED_CALF_RAISE'],
  'plank': ['PLANK', 'PLANK'],
  'crunch': ['CRUNCH', 'CRUNCH'],
  'farmer walk': ['CARRY', 'FARMERS_WALK'],
  'farmers walk': ['CARRY', 'FARMERS_WALK'],
  'farmer carry': ['CARRY', 'FARMERS_WALK'],
  'farmers carry': ['CARRY', 'FARMERS_WALK'],
  "farmer's walk": ['CARRY', 'FARMERS_WALK'],
  "farmer's carry": ['CARRY', 'FARMERS_WALK'],
  'lunge': ['LUNGE', 'DUMBBELL_LUNGE'],
  'walking lunge': ['LUNGE', 'WALKING_LUNGE'],
  'lateral raise': ['SHOULDER_PRESS', 'LATERAL_RAISE'],
  'face pull': ['ROW', 'FACE_PULL'],
  'shrug': ['SHRUG', 'BARBELL_SHRUG'],
  'dip': ['TRICEPS_EXTENSION', 'DIPS'],
  'dips': ['TRICEPS_EXTENSION', 'DIPS'],
  'hip thrust': ['HIP_RAISE', 'BARBELL_HIP_THRUST'],
}

const PARSE_PROMPT = `You are a workout parser. Convert the user's plain text workout description into structured JSON.

Output ONLY valid JSON with this structure:
{
  "name": "Workout name",
  "exercises": [
    {
      "name": "exercise name (lowercase)",
      "sets": 3,
      "reps": 10,
      "weight_lbs": 135,
      "rest_seconds": 90
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

      // Map exercise names to Garmin IDs
      for (const ex of parsed.exercises || []) {
        const nameLower = ex.name.toLowerCase()
        const mapping = EXERCISE_CATEGORIES[nameLower]
        if (mapping) {
          ex.category = mapping[0]
          ex.garmin_name = mapping[1]
        } else {
          // Try partial matching
          const partialMatch = Object.entries(EXERCISE_CATEGORIES).find(([key]) =>
            nameLower.includes(key) || key.includes(nameLower)
          )
          if (partialMatch) {
            ex.category = partialMatch[1][0]
            ex.garmin_name = partialMatch[1][1]
          } else {
            ex.category = 'OTHER'
            ex.garmin_name = 'OTHER'
          }
        }
      }

      return NextResponse.json({
        parsed,
        raw_input: text,
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
