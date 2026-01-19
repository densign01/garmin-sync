'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

type Exercise = {
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
  exercises: Exercise[]
}

const REST_TIME_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 15, label: '15 sec' },
  { value: 30, label: '30 sec' },
  { value: 45, label: '45 sec' },
  { value: 60, label: '60 sec' },
  { value: 75, label: '75 sec' },
  { value: 90, label: '90 sec' },
]

export default function NewWorkoutPage() {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null)
  const [loading, setLoading] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [defaultRestTime, setDefaultRestTime] = useState(90)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check for prefilled workout from chat
    const prefill = searchParams.get('prefill')
    if (prefill) {
      setRawText(decodeURIComponent(prefill))
    }
  }, [searchParams])

  async function handleParse() {
    setLoading(true)
    setError('')
    setParsed(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/parse-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text: rawText }),
      })

      const data = await res.json()

      if (data.parsed) {
        // Apply default rest time to exercises
        const workoutWithRest = {
          ...data.parsed,
          exercises: data.parsed.exercises.map((ex: Exercise) => ({
            ...ex,
            rest_seconds: ex.rest_seconds || defaultRestTime,
          })),
        }
        setParsed(workoutWithRest)
      } else {
        setError(data.error || 'Failed to parse workout')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePush() {
    if (!parsed) return
    setPushing(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Send parsed workout - the API will convert to Garmin format
      const res = await fetch('/api/garmin/push-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workout: parsed }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(`Workout "${data.workoutName}" pushed to Garmin!`)
        // Save to database
        await supabase.from('workouts').insert({
          user_id: session.user.id,
          garmin_workout_id: data.workoutId,
          name: parsed.name,
          raw_input: rawText,
          exercises: parsed.exercises,
        })
      } else {
        setError(data.error || 'Failed to push workout')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="text-xl font-bold">
            Garmin Sync
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Create Workout</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Describe Your Workout</CardTitle>
            <CardDescription>
              Type your workout in plain English. We&apos;ll parse it and send it to your Garmin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workout-text">Workout</Label>
                <textarea
                  id="workout-text"
                  placeholder={`Example:
Monday Push Day
Bench Press 3x8 @ 185 lbs
Overhead Press 3x8 @ 95 lbs
Incline Dumbbell Press 3x10 @ 60 lbs
Tricep Pushdown 3x12
Lateral Raises 3x15…`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  autoComplete="off"
                  className="w-full mt-2 p-3 border rounded-md font-mono text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="rest-time">Default Rest Time</Label>
                  <select
                    id="rest-time"
                    value={defaultRestTime}
                    onChange={(e) => setDefaultRestTime(Number(e.target.value))}
                    className="w-full mt-2 p-2 border rounded-md bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {REST_TIME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleParse} disabled={loading || !rawText.trim()}>
                  {loading ? 'Parsing…' : 'Parse Workout'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6">
            {success}
            <div className="mt-2">
              <Link href="/dashboard" className="underline">
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        {parsed && !success && (
          <Card>
            <CardHeader>
              <CardTitle>Preview: {parsed.name}</CardTitle>
              <CardDescription>
                Review your workout before pushing to Garmin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                {parsed.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="font-medium capitalize">{ex.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {ex.sets}×{ex.reps}
                        {ex.weight_lbs && ` @ ${ex.weight_lbs} lbs`}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                      {ex.garmin_name === 'OTHER'
                        ? 'Custom'
                        : ex.garmin_name?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePush}
                disabled={pushing}
                className="w-full"
                size="lg"
              >
                {pushing ? 'Pushing to Garmin…' : 'Push to Garmin Watch'}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

function buildGarminWorkout(parsed: ParsedWorkout) {
  const steps: unknown[] = []
  let stepOrder = 1

  for (const ex of parsed.exercises) {
    const exerciseStep = {
      type: 'ExecutableStepDTO',
      stepOrder: stepOrder + 1,
      stepType: { stepTypeId: 3, stepTypeKey: 'interval' },
      endCondition: { conditionTypeId: 10, conditionTypeKey: 'reps' },
      endConditionValue: ex.reps,
      targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
      category: ex.category || 'OTHER',
      exerciseName: ex.garmin_name || 'OTHER',
      weightUnit: { unitId: 9, unitKey: 'pound', factor: 453.59237 },
      ...(ex.weight_lbs && { weightValue: ex.weight_lbs }),
      strokeType: { strokeTypeId: 0 },
      equipmentType: { equipmentTypeId: 0 },
    }

    const restStep = {
      type: 'ExecutableStepDTO',
      stepOrder: stepOrder + 2,
      stepType: { stepTypeId: 5, stepTypeKey: 'rest' },
      endCondition: { conditionTypeId: 2, conditionTypeKey: 'time' },
      endConditionValue: ex.rest_seconds || 90,
      strokeType: { strokeTypeId: 0 },
      equipmentType: { equipmentTypeId: 0 },
    }

    steps.push({
      type: 'RepeatGroupDTO',
      stepOrder: stepOrder,
      stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
      numberOfIterations: ex.sets,
      smartRepeat: false,
      workoutSteps: [exerciseStep, restStep],
    })

    stepOrder += 3
  }

  return {
    workoutName: parsed.name,
    sportType: { sportTypeId: 5, sportTypeKey: 'strength_training' },
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: { sportTypeId: 5, sportTypeKey: 'strength_training' },
        workoutSteps: steps,
      },
    ],
  }
}
