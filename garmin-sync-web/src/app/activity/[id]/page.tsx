'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type Exercise = {
  name: string
  category?: string
  sets: Array<{
    reps: number | null
    weight_lbs: number | null
    duration_seconds?: number | null
  }>
}

type Activity = {
  id: string
  name: string
  started_at: string
  duration_seconds: number
  calories: number
  exercises: Exercise[] | null
  linked_workout_id: string | null
}

type PlannedExercise = {
  name: string
  sets: number
  reps: number
  weight_lbs?: number
  category?: string
  garmin_name?: string
}

type Workout = {
  id: string
  name: string
  exercises: PlannedExercise[]
}

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [linkedWorkout, setLinkedWorkout] = useState<Workout | null>(null)
  const [availableWorkouts, setAvailableWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadActivity()
    loadWorkouts()
  }, [id])

  async function loadActivity() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      setActivity(data)
      if (data.linked_workout_id) {
        loadLinkedWorkout(data.linked_workout_id)
      }
    }
    setLoading(false)
  }

  async function loadLinkedWorkout(workoutId: string) {
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single()

    if (data) {
      setLinkedWorkout(data)
    }
  }

  async function loadWorkouts() {
    const { data } = await supabase
      .from('workouts')
      .select('id, name, exercises')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setAvailableWorkouts(data)
    }
  }

  async function linkWorkout(workoutId: string) {
    const { error } = await supabase
      .from('activities')
      .update({ linked_workout_id: workoutId })
      .eq('id', id)

    if (!error) {
      loadLinkedWorkout(workoutId)
      setActivity(prev => prev ? { ...prev, linked_workout_id: workoutId } : null)
    }
  }

  function formatExerciseName(name: string): string {
    // Convert BARBELL_BACK_SQUAT to "Barbell Back Squat"
    return name
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins} minutes`
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hrs}h ${remainingMins}m`
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Activity Not Found</h1>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Garmin Sync
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">{activity.name || 'Strength Training'}</h1>
        <p className="text-muted-foreground mb-8">{formatDate(activity.started_at)}</p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Completed Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>
                {formatDuration(activity.duration_seconds)}
                {activity.calories > 0 && ` • ${activity.calories} calories`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activity.exercises && activity.exercises.length > 0 ? (
                <div className="space-y-4">
                  {activity.exercises.map((ex, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <div className="font-medium mb-2">{formatExerciseName(ex.name)}</div>
                      <div className="space-y-1">
                        {ex.sets.map((set, j) => (
                          <div key={j} className="text-sm text-muted-foreground flex justify-between">
                            <span>Set {j + 1}</span>
                            <span>
                              {set.reps ? `${set.reps} reps` : ''}
                              {set.weight_lbs ? ` @ ${set.weight_lbs} lbs` : ''}
                              {!set.reps && set.duration_seconds ? `${set.duration_seconds}s` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No exercise details available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planned Workout (Comparison) */}
          <Card>
            <CardHeader>
              <CardTitle>Planned</CardTitle>
              <CardDescription>
                {linkedWorkout
                  ? `Comparing to: ${linkedWorkout.name}`
                  : 'Link a workout to compare'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkedWorkout ? (
                <div className="space-y-4">
                  {linkedWorkout.exercises.map((ex, i) => {
                    const actualEx = activity.exercises?.find(
                      a => a.name.toLowerCase().includes(ex.name.toLowerCase()) ||
                           ex.name.toLowerCase().includes(a.name.toLowerCase())
                    )

                    return (
                      <div key={i} className="p-3 bg-muted rounded-lg">
                        <div className="font-medium mb-2 flex justify-between">
                          <span>{ex.name}</span>
                          {actualEx && (
                            <span className="text-green-600 text-sm" aria-hidden="true">✓</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: {ex.sets}×{ex.reps}
                          {ex.weight_lbs && ` @ ${ex.weight_lbs} lbs`}
                        </div>
                        {actualEx && (
                          <div className="text-sm text-green-600 mt-1">
                            Actual: {actualEx.sets.length} sets completed
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Select a planned workout to compare against your completed activity.
                  </p>
                  {availableWorkouts.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Link to Workout</Label>
                      <select
                        onChange={(e) => e.target.value && linkWorkout(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                        defaultValue=""
                      >
                        <option value="">Select a workout…</option>
                        {availableWorkouts.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No planned workouts found. Create one first.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
