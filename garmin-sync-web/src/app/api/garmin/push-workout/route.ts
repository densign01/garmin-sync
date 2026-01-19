import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

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
    const { workout } = body

    if (!workout) {
      return NextResponse.json({ error: 'Workout data required' }, { status: 400 })
    }

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
      return NextResponse.json(
        { error: error.detail || 'Failed to push workout' },
        { status: response.status }
      )
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
