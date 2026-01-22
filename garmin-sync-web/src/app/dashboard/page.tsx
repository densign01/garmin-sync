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
    <div className="min-h-screen bg-slate-50/[0.4] dark:bg-slate-950">
      {/* Abstract Background Shapes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[25%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-3xl opacity-50 dark:opacity-20" />
        <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-3xl opacity-50 dark:opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Garmin Sync</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:block">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
        {/* Welcome Hero */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl">
            {profile?.garmin_connected
              ? "Your fitness journey continues. Here's your latest progress."
              : "Connect your Garmin account to start tracking your progress."
            }
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-6 sm:grid-cols-2 mb-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          {/* Quick Start Card */}
          <div className="group relative overflow-hidden rounded-3xl bg-slate-900 dark:bg-black p-8 text-white shadow-xl shadow-slate-900/10 transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 opacity-90 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-all duration-500" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                <svg className="w-4 h-4 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-semibold text-sky-100 uppercase tracking-wider">Quick Action</span>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Start New Workout</h2>
              <p className="text-sky-100 mb-8 opacity-90 text-sm sm:text-base">
                Create a customized strength training session in seconds.
              </p>
              
              <Link href="/workout/new" className="inline-block">
                <Button
                  className="bg-white text-indigo-600 hover:bg-sky-50 border-0 h-11 px-6 rounded-xl font-semibold shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95"
                >
                  Create Workout
                </Button>
              </Link>
            </div>
          </div>

          {/* Garmin Status Card */}
          <div className="group relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-8 opacity-50 group-hover:opacity-100 transition-opacity">
              <div className={`w-3 h-3 rounded-full ${profile?.garmin_connected ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.657 2 15 3.343 15 5V6H9V5C9 3.343 10.343 2 12 2ZM7 6H17C18.1046 6 19 6.89543 19 8V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V8C5 6.89543 5.89543 6 7 6ZM12 4C11.4477 4 11 4.44772 11 5H13C13 4.44772 12.5523 4 12 4ZM7 8V20H17V8H7Z"/>
                </svg>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">Garmin Sync Status</span>
            </div>

            {profile?.garmin_connected ? (
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    Connected
                  </div>
                  {garminToken?.garmin_display_name && (
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                      @{garminToken.garmin_display_name}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Link href="/settings/garmin" className="w-full">
                    <Button variant="outline" className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Manage Connection
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                 <div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    Not Linked
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Connect your global account to sync workouts automatically.
                  </p>
                </div>

                <Link href="/settings/garmin" className="block w-full">
                  <Button className="w-full h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg shadow-slate-900/10 dark:shadow-none">
                    Connect Device
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activities Section */}
        {profile?.garmin_connected && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <ActivitiesSection />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-800/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium">© {new Date().getFullYear()} Garmin Sync</p>
            <nav className="flex gap-8">
              <Link href="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Support
              </Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  )
}

