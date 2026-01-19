import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { LogoutButton } from './logout-button'
import { ActivitiesSection } from './activities-section'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get Garmin display name if connected
  const { data: garminToken } = await supabase
    .from('garmin_tokens')
    .select('garmin_display_name')
    .eq('user_id', user.id)
    .single()

  // Get first name from email or display name
  const displayName = garminToken?.garmin_display_name || user.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">Garmin Sync</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {profile?.garmin_connected
              ? "Ready to crush your next workout?"
              : "Connect your Garmin to get started"
            }
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {/* Quick Start Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-blue-100">Quick Start</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Create Workout</h2>
              <p className="text-blue-100 text-sm mb-4">
                Plan your next strength session in plain English
              </p>
              <Link href="/workout/new">
                <Button
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-none"
                >
                  New Workout
                </Button>
              </Link>
            </div>
          </div>

          {/* Garmin Status Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Garmin Status</span>
            </div>

            {profile?.garmin_connected ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-semibold text-slate-900 dark:text-white">Connected</span>
                </div>
                {garminToken?.garmin_display_name && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                    {garminToken.garmin_display_name}
                  </p>
                )}
                <Link href="/settings/garmin">
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 -ml-2">
                    Manage connection
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span className="font-semibold text-slate-900 dark:text-white">Not connected</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  Link your Garmin account to sync workouts
                </p>
                <Link href="/settings/garmin">
                  <Button variant="outline" size="sm">
                    Connect Garmin
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activities Section */}
        {profile?.garmin_connected && <ActivitiesSection />}
      </main>
    </div>
  )
}
