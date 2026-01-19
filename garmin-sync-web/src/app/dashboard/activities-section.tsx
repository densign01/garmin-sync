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
    if (mins < 60) return `${mins} min`
    const hrs = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hrs}h ${remainingMins}m`
  }

  function getDateParts(dateStr: string): { month: string; day: string; time: string } {
    const date = new Date(dateStr)
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: date.getDate().toString(),
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Workouts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your completed sessions from Garmin</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
          className="gap-2"
        >
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing' : 'Sync'}
        </Button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-slate-600 dark:text-slate-300 mb-4 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
        >
          {message}
        </div>
      )}

      {/* Activities List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse">
              <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400 mb-1">No workouts yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">Complete a workout on your Garmin, then sync</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const dateParts = getDateParts(activity.started_at)
            const totalSets = getTotalSets(activity)

            return (
              <Link
                key={activity.id}
                href={`/activity/${activity.id}`}
                className="flex gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all group"
              >
                {/* Date Badge */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
                    {dateParts.month}
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white leading-none">
                    {dateParts.day}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {activity.name || 'Strength Training'}
                    </h3>
                    <svg className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 flex-shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Exercises */}
                  {activity.exercises && activity.exercises.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {activity.exercises.map(ex => formatExerciseName(ex.name)).join(' · ')}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(activity.duration_seconds)}
                    </span>
                    {activity.calories > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                        </svg>
                        {activity.calories} cal
                      </span>
                    )}
                    {totalSets > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        {totalSets} sets
                      </span>
                    )}
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{dateParts.time}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
