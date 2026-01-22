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

// Warning type from parse API (passed to push endpoint for logging)
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
    <div className="min-h-screen bg-slate-50/[0.4] dark:bg-slate-950">
      {/* Abstract Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[25%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-3xl opacity-50 dark:opacity-20" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-3xl opacity-50 dark:opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Garmin Sync</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Cancel
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl">
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Create Workout</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Design your next session using simple text.
          </p>
        </div>

        <Card className="mb-8 border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50 pb-6">
            <CardTitle>Workout Plan</CardTitle>
            <CardDescription>
              We'll automatically parse your plan into a structured workout.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <Label htmlFor="workout-text" className="text-base font-semibold text-slate-900 dark:text-white mb-2 block">
                  Paste your routine
                </Label>
                <div className="relative">
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
                    rows={10}
                    autoComplete="off"
                    className="w-full p-4 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                    Supports weights, reps, and sets
                  </div>
                </div>
              </div>

              {/* Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="group flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <div className={`p-1 rounded-md bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors ${showSettings ? 'rotate-90' : ''}`}>
                  <svg
                    className="w-4 h-4 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                Advanced Settings
              </button>

              {/* Collapsible Settings Panel */}
              {showSettings && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                  {/* Rest Time Settings */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Rest Timers
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="major-rest" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Major Lifts
                        </Label>
                        <div className="relative">
                          <select
                            id="major-rest"
                            value={majorLiftRest}
                            onChange={(e) => setMajorLiftRest(Number(e.target.value))}
                            className="w-full p-2.5 pl-3 pr-8 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all"
                          >
                            {REST_TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="minor-rest" className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Accessory
                        </Label>
                        <div className="relative">
                          <select
                            id="minor-rest"
                            value={minorLiftRest}
                            onChange={(e) => setMinorLiftRest(Number(e.target.value))}
                            className="w-full p-2.5 pl-3 pr-8 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all"
                          >
                            {REST_TIME_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Unilateral Settings */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Unilateral Logic
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${unilateralMode === 'double_sets' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <input
                          type="radio"
                          name="unilateral"
                          value="double_sets"
                          checked={unilateralMode === 'double_sets'}
                          onChange={() => setUnilateralMode('double_sets')}
                          className="sr-only"
                        />
                        <span className={`text-sm font-semibold mb-1 ${unilateralMode === 'double_sets' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>Double Sets</span>
                        <span className={`text-xs ${unilateralMode === 'double_sets' ? 'text-indigo-600/80 dark:text-indigo-300/80' : 'text-slate-500'}`}>
                          3 sets becomes 6 total sets
                        </span>
                        {unilateralMode === 'double_sets' && (
                          <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          </div>
                        )}
                      </label>

                      <label className={`relative flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${unilateralMode === 'double_reps' ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <input
                          type="radio"
                          name="unilateral"
                          value="double_reps"
                          checked={unilateralMode === 'double_reps'}
                          onChange={() => setUnilateralMode('double_reps')}
                          className="sr-only"
                        />
                        <span className={`text-sm font-semibold mb-1 ${unilateralMode === 'double_reps' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>Double Reps</span>
                        <span className={`text-xs ${unilateralMode === 'double_reps' ? 'text-indigo-600/80 dark:text-indigo-300/80' : 'text-slate-500'}`}>
                          8 reps becomes 16 total reps
                        </span>
                        {unilateralMode === 'double_reps' && (
                          <div className="absolute top-3 right-3 text-indigo-600 dark:text-indigo-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleParse}
                disabled={loading || !rawText.trim()}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all font-semibold shadow-lg shadow-slate-900/20 dark:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : 'Parse Workout'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="animate-in fade-in slide-in-from-top-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {error}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" className="animate-in fade-in slide-in-from-top-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-6 rounded-3xl mb-8 text-center shadow-lg shadow-emerald-500/10">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Success!</h3>
            <p className="mb-6">{success}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        )}

        {parsed && !success && (
          <Card className="border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl shadow-slate-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview Workout</CardTitle>
                  <CardDescription>
                    Review inferred exercises before syncing
                  </CardDescription>
                </div>
                <div className="hidden sm:block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wide">
                  {parsed.name}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Two-column header */}
              <div className="hidden sm:flex text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-6 py-3 bg-slate-50/30 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                <div className="w-1/3">Original Input</div>
                <div className="w-2/3 pl-6">Garmin Mapping</div>
              </div>

              {/* Exercise mapping rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {parsed.exercises.map((ex, i) => (
                  <div key={i} className="px-6 py-4">
                    <ExerciseMappingRow
                      exercise={ex}
                      index={i}
                      onChange={handleExerciseChange}
                      isLast={i === parsed.exercises.length - 1}
                    />
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-800/50">
                <Button
                  onClick={handlePush}
                  disabled={pushing}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  {pushing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending to Watch...
                    </span>
                  ) : 'Push to Garmin Watch'}
                </Button>
                <p className="text-xs text-center text-slate-400 mt-3">
                  First sync of the day may take up to 30 seconds
                </p>
              </div>
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
