'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ExerciseMappingRow, type Exercise } from '@/components/exercise-mapping-row'

type ParsedWorkout = {
  name: string
  exercises: Exercise[]
}

// Warning type from parse API (kept for logging purposes)
type ExerciseWarning = {
  exercise: string
  message: string
  suggestions: { name: string; category: string; garminName: string; score: number }[]
}

const REST_TIME_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 30, label: '30 sec' },
  { value: 45, label: '45 sec' },
  { value: 60, label: '60 sec' },
  { value: 75, label: '75 sec' },
  { value: 90, label: '90 sec' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
]

// Major compound lifts that need longer rest
const MAJOR_LIFTS = [
  'bench press', 'barbell bench press', 'dumbbell bench press',
  'squat', 'back squat', 'front squat',
  'deadlift', 'romanian deadlift', 'sumo deadlift',
  'overhead press', 'ohp', 'shoulder press', 'military press',
  'barbell row', 'bent over row', 'pendlay row',
  'pull up', 'chin up', 'weighted pull up',
  'hip thrust', 'barbell hip thrust',
  'leg press',
]

// Unilateral exercises (done one side at a time)
const UNILATERAL_EXERCISES = [
  'dumbbell curl', 'hammer curl', 'concentration curl', 'preacher curl',
  'single arm', 'one arm', 'single leg', 'one leg',
  'lunge', 'walking lunge', 'reverse lunge', 'bulgarian split squat',
  'step up', 'pistol squat',
  'single leg deadlift', 'single leg rdl',
  'dumbbell row', 'one arm row',
  'lateral raise', 'front raise',
  'tricep kickback',
  'calf raise', // often done one leg at a time
]

type UnilateralMode = 'double_sets' | 'double_reps'

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewWorkoutContent />
    </Suspense>
  )
}

function NewWorkoutContent() {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null)
  const [warnings, setWarnings] = useState<ExerciseWarning[]>([])
  const [loading, setLoading] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Rest time settings
  const [majorLiftRest, setMajorLiftRest] = useState(90)
  const [minorLiftRest, setMinorLiftRest] = useState(60)

  // Unilateral settings
  const [unilateralMode, setUnilateralMode] = useState<UnilateralMode>('double_sets')

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check if exercise is a major lift
  function isMajorLift(exerciseName: string): boolean {
    const nameLower = exerciseName.toLowerCase()
    return MAJOR_LIFTS.some(lift => nameLower.includes(lift) || lift.includes(nameLower))
  }

  // Check if exercise is unilateral (done one side at a time)
  function isUnilateral(exerciseName: string): boolean {
    const nameLower = exerciseName.toLowerCase()
    return UNILATERAL_EXERCISES.some(ex => nameLower.includes(ex) || ex.includes(nameLower))
  }

  // Apply unilateral mode to exercise
  function applyUnilateralMode(exercise: Exercise): Exercise {
    if (!isUnilateral(exercise.name)) return exercise

    if (unilateralMode === 'double_sets') {
      return { ...exercise, sets: exercise.sets * 2 }
    } else {
      return { ...exercise, reps: exercise.reps * 2 }
    }
  }

  useEffect(() => {
    // Check for prefilled workout from chat
    const prefill = searchParams.get('prefill')
    if (prefill) {
      setRawText(decodeURIComponent(prefill))
    }
  }, [searchParams])

  // Handle exercise change from ExerciseMappingRow
  function handleExerciseChange(index: number, updated: Exercise) {
    if (!parsed) return
    const newExercises = [...parsed.exercises]
    newExercises[index] = updated
    setParsed({ ...parsed, exercises: newExercises })
  }

  async function handleParse() {
    setLoading(true)
    setError('')
    setParsed(null)
    setWarnings([])

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
        // Apply rest time and unilateral settings
        const workoutWithSettings = {
          ...data.parsed,
          exercises: data.parsed.exercises.map((ex: Exercise) => {
            // First apply rest time
            const withRest = {
              ...ex,
              rest_seconds: ex.rest_seconds || (isMajorLift(ex.name) ? majorLiftRest : minorLiftRest),
            }
            // Then apply unilateral mode
            return applyUnilateralMode(withRest)
          }),
        }
        setParsed(workoutWithSettings)

        // Capture warnings about exercise matching
        if (data.warnings && data.warnings.length > 0) {
          setWarnings(data.warnings)
        }
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

      // Convert to Garmin format and send to Python API
      // (exercises are edited in-place via ExerciseMappingRow)
      const garminWorkout = buildGarminWorkout(parsed)
      const res = await fetch('/api/garmin/push-workout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workout: garminWorkout,
          warnings: warnings.length > 0 ? warnings : undefined,
        }),
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
              {/* Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Workout Settings
              </button>

              {/* Collapsible Settings Panel */}
              {showSettings && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-4">
                  {/* Rest Time Settings */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Rest Times</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="major-rest" className="text-xs text-muted-foreground">
                          Major Lifts (squat, bench, deadlift, etc.)
                        </Label>
                        <select
                          id="major-rest"
                          value={majorLiftRest}
                          onChange={(e) => setMajorLiftRest(Number(e.target.value))}
                          className="w-full mt-1 p-2 border rounded-md bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {REST_TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="minor-rest" className="text-xs text-muted-foreground">
                          Accessory Lifts (curls, raises, etc.)
                        </Label>
                        <select
                          id="minor-rest"
                          value={minorLiftRest}
                          onChange={(e) => setMinorLiftRest(Number(e.target.value))}
                          className="w-full mt-1 p-2 border rounded-md bg-background text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {REST_TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Unilateral Settings */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Single Arm/Leg Exercises</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      How should we log exercises like curls or lunges done per side?
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="unilateral"
                          value="double_sets"
                          checked={unilateralMode === 'double_sets'}
                          onChange={() => setUnilateralMode('double_sets')}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium">Double the sets</div>
                          <div className="text-xs text-muted-foreground">
                            3x12 curls per arm → 6 sets of 12 reps
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="unilateral"
                          value="double_reps"
                          checked={unilateralMode === 'double_reps'}
                          onChange={() => setUnilateralMode('double_reps')}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium">Double the reps</div>
                          <div className="text-xs text-muted-foreground">
                            3x12 curls per arm → 3 sets of 24 reps
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleParse} disabled={loading || !rawText.trim()} className="w-full">
                {loading ? 'Parsing…' : 'Parse Workout'}
              </Button>
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
                Review and edit your workout before pushing to Garmin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Two-column header */}
              <div className="hidden sm:flex text-xs text-muted-foreground font-medium mb-2 px-1">
                <div className="w-1/3">YOUR INPUT</div>
                <div className="w-2/3 pl-6">GARMIN MAPPING</div>
              </div>

              {/* Exercise mapping rows */}
              <div className="mb-6">
                {parsed.exercises.map((ex, i) => (
                  <ExerciseMappingRow
                    key={i}
                    exercise={ex}
                    index={i}
                    onChange={handleExerciseChange}
                  />
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
              <p className="text-xs text-center text-muted-foreground mt-2">
                First request of the day may take up to 30 seconds
              </p>
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
    // Distance-based exercises (farmer's walk, etc.) use Lap Button instead of distance
    // Garmin's strength mode doesn't support distance as end condition - use manual lap press
    const isDistanceBased = ex.distance_meters && ex.distance_meters > 0

    // Custom exercises use "CORE" with the real name in description
    const isCustomExercise = ex.garmin_name === 'CORE' || !ex.garmin_name

    // Build description: include custom name and/or distance target
    let description = ''
    if (isCustomExercise && ex.name) {
      description = ex.name
    }
    if (isDistanceBased) {
      const yards = Math.round((ex.distance_meters || 0) * 1.094)
      description = description ? `${description} - ${yards} yds` : `${yards} yds`
    }

    const exerciseStep = {
      type: 'ExecutableStepDTO',
      stepOrder: Number(stepOrder + 1),
      stepType: { stepTypeId: Number(3), stepTypeKey: 'interval' },
      // Distance exercises: use Lap Button (7) - user presses lap when done
      // Reps exercises: use reps (10)
      endCondition: isDistanceBased
        ? { conditionTypeId: Number(7), conditionTypeKey: 'lap.button' }
        : { conditionTypeId: Number(10), conditionTypeKey: 'reps' },
      // For lap button, no value needed; for reps, use rep count
      ...(isDistanceBased ? {} : { endConditionValue: Number(ex.reps) }),
      targetType: { workoutTargetTypeId: Number(1), workoutTargetTypeKey: 'no.target' },
      category: ex.category || 'CORE',
      exerciseName: ex.garmin_name || 'CORE',
      // Description shows custom exercise name and/or distance target
      ...(description && { description }),
      weightUnit: { unitId: Number(9), unitKey: 'pound', factor: 453.59237 },
      ...(ex.weight_lbs && { weightValue: Number(ex.weight_lbs) }),
      strokeType: { strokeTypeId: Number(0) },
      equipmentType: { equipmentTypeId: Number(0) },
    }

    const restStep = {
      type: 'ExecutableStepDTO',
      stepOrder: Number(stepOrder + 2),
      stepType: { stepTypeId: Number(5), stepTypeKey: 'rest' },
      endCondition: { conditionTypeId: Number(2), conditionTypeKey: 'time' },
      endConditionValue: Number(ex.rest_seconds || 90),
      strokeType: { strokeTypeId: Number(0) },
      equipmentType: { equipmentTypeId: Number(0) },
    }

    steps.push({
      type: 'RepeatGroupDTO',
      stepOrder: Number(stepOrder),
      stepType: { stepTypeId: Number(6), stepTypeKey: 'repeat' },
      numberOfIterations: Number(ex.sets),
      smartRepeat: false,
      workoutSteps: [exerciseStep, restStep],
    })

    stepOrder += 3
  }

  return {
    workoutName: parsed.name,
    sportType: { sportTypeId: Number(5), sportTypeKey: 'strength_training' },
    workoutSegments: [
      {
        segmentOrder: Number(1),
        sportType: { sportTypeId: Number(5), sportTypeKey: 'strength_training' },
        workoutSteps: steps,
      },
    ],
  }
}
