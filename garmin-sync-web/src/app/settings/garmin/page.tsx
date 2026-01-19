'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function GarminConnectPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  async function checkConnectionStatus() {
    setCheckingStatus(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/garmin/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await res.json()
      if (data.connected) {
        setConnected(true)
        setConnectedEmail(data.email)
      }
    } catch (err) {
      console.error('Failed to check status:', err)
    } finally {
      setCheckingStatus(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/garmin/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (res.ok) {
        setConnected(false)
        setConnectedEmail(null)
      }
    } catch (err) {
      console.error('Failed to disconnect:', err)
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not logged in')
        setLoading(false)
        return
      }

      const res = await fetch('/api/garmin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/dashboard?garmin=connected')
      } else {
        setError(data.error || 'Failed to connect to Garmin')
        setLoading(false)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Checking connection status…</div>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Garmin Connected</CardTitle>
            <CardDescription>
              Your Garmin account is already connected
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
              <div className="text-lg font-medium">
                <span aria-hidden="true">✓</span> Connected
              </div>
              <div className="text-sm mt-1">{connectedEmail}</div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your workouts will sync with this Garmin account.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect Garmin'}
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Connect Garmin</CardTitle>
          <CardDescription>
            Enter your Garmin Connect credentials. We encrypt and store your
            tokens securely - your password is never saved.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleConnect}>
          <CardContent className="space-y-4">
            {error && (
              <div role="alert" className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="garmin-email">Garmin Email</Label>
              <Input
                id="garmin-email"
                type="email"
                placeholder="your-garmin@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="garmin-password">Garmin Password</Label>
              <Input
                id="garmin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We use these credentials once to generate authentication tokens.
              Your password is not stored.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connecting…' : 'Connect Garmin Account'}
            </Button>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              ← Back to Dashboard
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
