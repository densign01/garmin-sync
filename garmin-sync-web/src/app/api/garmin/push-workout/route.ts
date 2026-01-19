import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

type ParsedExercise = {
  name: string
  sets: number
  reps: number
  weight_lbs?: number
  rest_seconds: number
  category?: string
  garmin_name?: string
}

type ParsedWorkout = {
  name: string
  exercises: ParsedExercise[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Garmin connected
    const { data: tokens } = await supabase
      .from('garmin_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!tokens) {
      return NextResponse.json({ error: 'Garmin not connected' }, { status: 400 })
    }

    const body = await request.json()
    const { workout } = body as { workout: ParsedWorkout }

    if (!workout) {
      return NextResponse.json({ error: 'Workout data required' }, { status: 400 })
    }

    // Convert to FastAPI expected format
    const fastApiPayload = {
      name: workout.name,
      description: '',
      exercises: workout.exercises.map((ex) => ({
        category: ex.category || 'OTHER',
        exercise_name: ex.garmin_name || 'OTHER',
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds || 90,
        weight_lbs: ex.weight_lbs || null,
      })),
    }

    // Call the Python FastAPI server
    const response = await fetch(`${PYTHON_API_URL}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fastApiPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || 'Failed to push workout' }, { status: response.status })
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      workoutId: result.workoutId,
      workoutName: result.workoutName,
    })
  } catch (error) {
    console.error('Push workout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
