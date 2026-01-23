'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  /**
   * Formats an activity into plain text for clipboard copy.
   * Output format matches Hevy export style:
   * - Header with workout name and date
   * - Each exercise with individual sets listed
   * - Sets show weight x reps, or duration for timed exercises
   */
  function formatActivityForCopy(act: Activity): string {
    const lines: string[] = []

    // Header: Workout name
    lines.push(act.name || 'Strength Training')

    // Subheader: Full date and time
    const date = new Date(act.started_at)
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).toLowerCase()
    lines.push(`${dateStr} at ${timeStr}`)
    lines.push('')

    // Each exercise
    if (act.exercises && act.exercises.length > 0) {
      for (const ex of act.exercises) {
        // Exercise name (convert SNAKE_CASE to Title Case)
        const exName = ex.name
          .split('_')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ')
        lines.push(exName)

        // Each set
        ex.sets.forEach((set, idx) => {
          let setLine = `Set ${idx + 1}: `

          if (set.weight_lbs && set.reps) {
            // Weighted with reps: "135 lbs x 8"
            setLine += `${Math.round(set.weight_lbs)} lbs x ${set.reps}`
          } else if (set.weight_lbs && set.duration_seconds) {
            // Weighted with duration (carries): "110 lbs - 45 sec"
            setLine += `${Math.round(set.weight_lbs)} lbs - ${set.duration_seconds} sec`
          } else if (set.reps) {
            // Bodyweight: "12 reps"
            setLine += `${set.reps} reps`
          } else if (set.duration_seconds) {
            // Duration only (planks): "45 sec"
            setLine += `${set.duration_seconds} sec`
          } else {
            // Fallback for empty sets
            setLine += '—'
          }

          lines.push(setLine)
        })

        lines.push('') // Blank line between exercises
      }
    }

    return lines.join('\n').trim()
  }

  /**
   * Copies the formatted activity text to clipboard and shows feedback.
   */
  async function handleCopy() {
    if (!activity) return

    const text = formatActivityForCopy(activity)
    await navigator.clipboard.writeText(text)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    async function loadActivity() {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setActivity(data)
        if (data.linked_workout_id) {
          const { data: linkedData } = await supabase
            .from('workouts')
            .select('*')
            .eq('id', data.linked_workout_id)
            .single()

          if (linkedData) {
            setLinkedWorkout(linkedData)
          }
        }
      }
      setLoading(false)
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

    loadActivity()
    loadWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function linkWorkout(workoutId: string) {
    const { error } = await supabase
      .from('activities')
      .update({ linked_workout_id: workoutId })
      .eq('id', id)

    if (error) return

    // Load the linked workout details
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workoutId)
      .single()

    if (data) {
      setLinkedWorkout(data)
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
      <div className="min-h-screen bg-slate-50/[0.4] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div className="text-slate-500 font-medium">Loading details...</div>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-slate-50/[0.4] dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Activity Not Found</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            This activity might have been deleted or you don&apos;t have permission to view it.
          </p>
          <Link href="/dashboard">
            <Button className="h-11 px-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/[0.4] dark:bg-slate-950">
      {/* Abstract Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-3xl opacity-50 dark:opacity-20" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-3xl opacity-50 dark:opacity-20" />
      </div>

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
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hidden sm:flex">
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-baseline justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                {activity.name || 'Strength Training'}
              </h1>
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-lg">{formatDate(activity.started_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Copy text button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 gap-2 font-medium transition-all"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy text
                  </>
                )}
              </Button>

              {/* Duration badge */}
              <div className="flex items-center gap-4 bg-white dark:bg-slate-900 pr-5 pl-2 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{formatDuration(activity.duration_seconds)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Completed Activity */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                Actual Performance
              </h2>
              {activity.calories > 0 && (
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {activity.calories} calories burned
                </span>
              )}
            </div>

            <Card className="border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/5">
              <CardContent className="p-0">
                {activity.exercises && activity.exercises.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activity.exercises.map((ex, i) => (
                      <div key={i} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                            {formatExerciseName(ex.name)}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {ex.sets.map((set, j) => (
                            <div key={j} className="relative group">
                              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-center">
                                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Set {j + 1}</div>
                                <div className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                                  {set.reps ? (
                                    <span>{set.reps} <span className="text-slate-400 text-xs">reps</span></span>
                                  ) : set.duration_seconds ? (
                                    <span>{set.duration_seconds}s</span>
                                  ) : (
                                    <span>—</span>
                                  )}
                                  {set.weight_lbs && (
                                    <div className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-700 mt-1 pt-1">
                                      {set.weight_lbs} lbs
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    <p>No exercise details available in this activity.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Planned Workout (Comparison) */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                Planned Target
              </h2>
              {linkedWorkout && (
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {linkedWorkout.name}
                </span>
              )}
            </div>

            <Card className="border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 shadow-none">
              <CardContent className="p-0">
                {linkedWorkout ? (
                  <div className="divide-y divide-slate-200/50 dark:divide-slate-800">
                    {linkedWorkout.exercises.map((ex, i) => {
                      const actualEx = activity.exercises?.find(
                        a => a.name.toLowerCase().includes(ex.name.toLowerCase()) ||
                          ex.name.toLowerCase().includes(a.name.toLowerCase())
                      )

                      return (
                        <div key={i} className={`p-5 relative ${actualEx ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                          <div className="flex items-start justify-between mb-1">
                            <span className={`font-semibold ${actualEx ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-300'}`}>
                              {ex.name}
                            </span>
                            {actualEx && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                Match
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">{ex.sets}</span> sets
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">{ex.reps}</span> reps
                            </div>
                            {ex.weight_lbs && (
                              <div>
                                @ <span className="font-medium text-slate-900 dark:text-white">{ex.weight_lbs}</span> lbs
                              </div>
                            )}
                          </div>

                          {actualEx && (
                            <div className="mt-3 text-xs flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Completed {actualEx.sets.length} sets
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Compare with Plan</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                          Link this activity to a planned workout to see how well you stuck to the plan.
                        </p>
                      </div>

                      {availableWorkouts.length > 0 ? (
                        <div className="max-w-xs mx-auto pt-2">
                          <div className="relative">
                            <select
                              onChange={(e) => e.target.value && linkWorkout(e.target.value)}
                              className="w-full h-10 pl-3 pr-8 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all cursor-pointer"
                              defaultValue=""
                            >
                              <option value="">Select a workout plan...</option>
                              {availableWorkouts.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Link href="/workout/new">
                          <Button variant="outline" size="sm" className="mt-2 text-indigo-600 hover:text-indigo-700">
                            Create a Workout Plan
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
