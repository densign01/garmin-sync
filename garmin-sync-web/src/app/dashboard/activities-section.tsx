'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Completed workouts synced from Garmin
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {message && (
          <div
            role="status"
            aria-live="polite"
            className="text-sm text-muted-foreground mb-4 p-2 bg-muted rounded"
          >
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No activities yet. Complete a workout on your Garmin, then sync.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/activity/${activity.id}`}
                className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{activity.name || 'Strength Training'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity.started_at)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{formatDuration(activity.duration_seconds)}</div>
                    {activity.calories > 0 && (
                      <div>{activity.calories} cal</div>
                    )}
                  </div>
                </div>
                {activity.exercises && activity.exercises.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {activity.exercises.map((ex, i) => (
                      <span key={i}>
                        {i > 0 && ' • '}
                        {ex.name} ({ex.sets.length} sets)
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
