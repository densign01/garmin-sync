'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

type Activity = {
  id: string
  name: string
  started_at: string
  duration_seconds: number
  calories: number
  exercises: Array<{
    name: string
    sets: Array<{
      reps: number | null
      weight_lbs: number | null
    }>
  }> | null
}

export function ActivitiesSection() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadActivities()
  }, [])

  async function loadActivities() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/garmin/sync', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()
      if (data.activities) {
        setActivities(data.activities)
      }
    } catch (err) {
      console.error('Failed to load activities:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('Not logged in')
        return
      }

      const res = await fetch('/api/garmin/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()

      if (data.success) {
        if (data.synced > 0) {
          setMessage(`Synced ${data.synced} new activities`)
          loadActivities()
        } else {
          setMessage('All activities already synced')
        }
      } else {
        setMessage(data.error || 'Sync failed')
      }
    } catch (err) {
      setMessage('Network error')
    } finally {
      setSyncing(false)
    }
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hrs}h ${remainingMins}m`
  }

  function getDateParts(dateStr: string): { month: string; day: string; time: string; weekday: string } {
    const date = new Date(dateStr)
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.getDate().toString(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }
  }

  function getTotalSets(activity: Activity): number {
    if (!activity.exercises) return 0
    return activity.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  }

  function formatExerciseName(name: string): string {
    // Convert BARBELL_BACK_SQUAT → Barbell Back Squat
    return name
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Recent Workouts</h2>
          <p className="text-slate-500 dark:text-slate-400">Your completed sessions from Garmin</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-200 gap-2 font-medium transition-colors"
        >
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="min-w-[68px] text-center">
            {syncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-6 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {message}
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 animate-pulse">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              <div className="flex-1 space-y-3 py-1">
                <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/3" />
              </div>
            </div>
          ))
        ) : activities.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No workouts yet</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Complete a workout on your Garmin device, then click Sync to see it here.
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const dateParts = getDateParts(activity.started_at)
            const totalSets = getTotalSets(activity)

            return (
              <Link
                key={activity.id}
                href={`/activity/${activity.id}`}
                className="group flex flex-col sm:flex-row gap-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
              >
                {/* Date Badge */}
                <div className="flex-shrink-0 flex sm:flex-col items-center justify-center sm:w-20 sm:h-20 w-full h-12 gap-2 sm:gap-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:border-indigo-100 dark:group-hover:border-indigo-800/30 transition-colors">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                    {dateParts.month}
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {dateParts.day}
                  </span>
                  <span className="sm:hidden text-sm font-medium text-slate-500">
                    {dateParts.weekday}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {activity.name || 'Strength Training'}
                      </h3>
                      <div className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {dateParts.weekday} · {dateParts.time}
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                      <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Exercises Preview */}
                  {activity.exercises && activity.exercises.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {activity.exercises.slice(0, 3).map((ex, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {formatExerciseName(ex.name)}
                        </span>
                      ))}
                      {activity.exercises.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-500 dark:text-slate-500 border border-transparent">
                          +{activity.exercises.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">{formatDuration(activity.duration_seconds)}</span>
                    </div>

                    {activity.calories > 0 && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                        <span className="font-semibold">{activity.calories}</span> <span className="text-slate-400 font-normal">cal</span>
                      </div>
                    )}

                    {totalSets > 0 && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="font-semibold">{totalSets}</span> <span className="text-slate-400 font-normal">sets</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

