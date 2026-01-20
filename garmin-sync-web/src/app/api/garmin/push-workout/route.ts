import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

// Helper to log push attempts (table types not in generated schema yet)
async function logPushAttempt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string,
  workoutName: string,
  exercises: unknown[],
  status: 'success' | 'failed',
  garminWorkoutId?: string,
  errorMessage?: string,
  warnings?: unknown[]
) {
  try {
    await serviceClient.from('workout_push_log').insert({
      user_id: userId,
      workout_name: workoutName,
      exercises,
      status,
      garmin_workout_id: garminWorkoutId,
      error_message: errorMessage,
      exercise_warnings: warnings,
    })
  } catch (e) {
    console.error('Failed to log push attempt:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get encrypted tokens from Supabase
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: tokenData, error: tokenError } = await serviceClient
      .from('garmin_tokens')
      .select('tokens_encrypted')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Garmin not connected' }, { status: 400 })
    }

    if (tokenData.tokens_encrypted === 'local-dev-mode') {
      return NextResponse.json({
        error: 'Please reconnect Garmin to refresh credentials'
      }, { status: 400 })
    }

    const body = await request.json()
    const { workout, warnings: exerciseWarnings } = body

    if (!workout) {
      return NextResponse.json({ error: 'Workout data required' }, { status: 400 })
    }

    // Extract workout name and exercises for logging
    const workoutName = workout.workoutName || 'Unnamed Workout'
    const workoutExercises = workout.workoutSegments?.[0]?.workoutSteps?.map((step: {
      workoutSteps?: { category?: string; exerciseName?: string; description?: string }[]
    }) => {
      const exerciseStep = step.workoutSteps?.find((s: { category?: string }) => s.category)
      return exerciseStep ? {
        category: exerciseStep.category,
        exerciseName: exerciseStep.exerciseName,
        description: exerciseStep.description,
      } : null
    }).filter(Boolean) || []

    // Call Render API with tokens to push workout
    const response = await fetch(`${PYTHON_API_URL}/api/workouts/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens_encrypted: tokenData.tokens_encrypted,
        workout: workout,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to push workout' }))

      // Extract exercise info for better error context
      const exercises = workout.workoutSegments?.[0]?.workoutSteps?.map((step: {
        workoutSteps?: { category?: string; exerciseName?: string; description?: string }[]
      }) => {
        const exerciseStep = step.workoutSteps?.find(s => s.category)
        return exerciseStep ? {
          category: exerciseStep.category,
          exerciseName: exerciseStep.exerciseName,
          description: exerciseStep.description,
        } : null
      }).filter(Boolean) || []

      // Check for custom exercises that might cause issues
      const customExercises = exercises.filter((ex: { category?: string; exerciseName?: string }) =>
        ex?.category === 'CORE' && ex?.exerciseName === 'CORE'
      )

      let errorMessage = error.detail || 'Failed to push workout'
      if (customExercises.length > 0) {
        const names = customExercises.map((ex: { description?: string }) => ex?.description).filter(Boolean)
        if (names.length > 0) {
          errorMessage += `. Custom exercises (${names.join(', ')}) may need manual mapping.`
        }
      }

      console.error('Push workout failed:', {
        error: errorMessage,
        exercises,
        garminError: error,
      })

      // Log failed push attempt
      await logPushAttempt(
        serviceClient,
        user.id,
        workoutName,
        workoutExercises,
        'failed',
        undefined,
        errorMessage,
        exerciseWarnings
      )

      return NextResponse.json(
        { error: errorMessage, exercises },
        { status: response.status }
      )
    }

    const result = await response.json()

    // Log successful push
    await logPushAttempt(
      serviceClient,
      user.id,
      workoutName,
      workoutExercises,
      'success',
      result.workoutId,
      undefined,
      exerciseWarnings
    )

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
