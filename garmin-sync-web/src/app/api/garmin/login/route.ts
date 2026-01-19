import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Call the Python FastAPI server
    const response = await fetch(`${PYTHON_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || 'Garmin login failed' }, { status: response.status })
    }

    // Update user's profile to mark Garmin as connected
    await supabase
      .from('profiles')
      .update({ garmin_connected: true })
      .eq('id', user.id)

    // Store connection in garmin_tokens table (simplified for now)
    await supabase
      .from('garmin_tokens')
      .upsert({
        user_id: user.id,
        tokens_encrypted: 'local-dev-mode', // In production, would store encrypted tokens
        garmin_display_name: email,
      })

    return NextResponse.json({ success: true, email })
  } catch (error) {
    console.error('Garmin login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
