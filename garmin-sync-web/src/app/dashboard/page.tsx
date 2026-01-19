import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold">Garmin Sync</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Garmin Connection Card */}
          <Card>
            <CardHeader>
              <CardTitle>Garmin Connection</CardTitle>
              <CardDescription>
                {profile?.garmin_connected
                  ? 'Your Garmin account is connected'
                  : 'Connect your Garmin account to sync workouts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.garmin_connected ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">✓</span>
                    <span className="text-green-600 font-medium">Connected</span>
                  </div>
                  {garminToken?.garmin_display_name && (
                    <p className="text-sm text-muted-foreground">
                      {garminToken.garmin_display_name}
                    </p>
                  )}
                </div>
              ) : (
                <Link href="/settings/garmin">
                  <Button variant="outline">Connect Garmin</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Create Workout</CardTitle>
              <CardDescription>
                Type your workout in plain English
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/workout/new">
                <Button>New Workout</Button>
              </Link>
            </CardContent>
          </Card>

        </div>

        {/* Activities Section - full width below */}
        {profile?.garmin_connected && (
          <div className="mt-6">
            <ActivitiesSection />
          </div>
        )}
      </main>
    </div>
  )
}
