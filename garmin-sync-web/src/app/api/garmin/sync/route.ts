import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000'

type GarminActivity = {
  activityId: number
  activityName: string
  startTimeLocal: string
  duration: number
  calories: number
  activityType: {
    typeKey: string
  }
}

type GarminExerciseSet = {
  exerciseName: string
  exerciseCategory: string
  setOrder: number
  reps: number | null
  weight: number | null
  duration: number | null
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check Garmin connection
    const { data: profile } = await supabase
      .from('profiles')
      .select('garmin_connected')
      .eq('id', user.id)
      .single()

    if (!profile?.garmin_connected) {
      return NextResponse.json({ error: 'Garmin not connected' }, { status: 400 })
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
      return NextResponse.json({ error: 'Garmin tokens not found. Please reconnect.' }, { status: 400 })
    }

    // Get recent activities from FastAPI with tokens
    const activitiesRes = await fetch(`${FASTAPI_URL}/api/activities/with-tokens?limit=20`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens_encrypted: tokenData.tokens_encrypted }),
    })
    if (!activitiesRes.ok) {
      const err = await activitiesRes.text()
      return NextResponse.json({ error: `Failed to fetch activities: ${err}` }, { status: 500 })
    }

    const activities: GarminActivity[] = await activitiesRes.json()

    // Get existing activity IDs to avoid duplicates
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('garmin_activity_id')
      .eq('user_id', user.id)

    const existingIds = new Set(existingActivities?.map(a => a.garmin_activity_id) || [])

    // Filter to new activities only
    const newActivities = activities.filter(a => !existingIds.has(String(a.activityId)))

    let syncedCount = 0
    const syncedActivities = []

    for (const activity of newActivities) {
      try {
        // Get detailed exercise data with tokens
        const detailsRes = await fetch(`${FASTAPI_URL}/api/activities/${activity.activityId}/export-with-tokens`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens_encrypted: tokenData.tokens_encrypted }),
        })
        let exercises = null
        let rawData = null

        if (detailsRes.ok) {
          const exportData = await detailsRes.json()
          exercises = exportData.exercises
          rawData = exportData
        }

        // Insert into Supabase
        const { data: inserted, error: insertError } = await supabase
          .from('activities')
          .insert({
            user_id: user.id,
            garmin_activity_id: String(activity.activityId),
            activity_type: activity.activityType?.typeKey || 'strength_training',
            name: activity.activityName,
            started_at: activity.startTimeLocal,
            duration_seconds: Math.round(activity.duration || 0),
            calories: activity.calories,
            exercises,
            raw_data: rawData,
          })
          .select()
          .single()

        if (!insertError && inserted) {
          syncedCount++
          syncedActivities.push({
            id: inserted.id,
            name: inserted.name,
            started_at: inserted.started_at,
          })
        }
      } catch (err) {
        console.error(`Failed to sync activity ${activity.activityId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      total: activities.length,
      activities: syncedActivities,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

// GET: List synced activities from Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Get activities error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get activities' },
      { status: 500 }
    )
  }
}
