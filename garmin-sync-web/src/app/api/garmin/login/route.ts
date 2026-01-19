import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated with Supabase
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

    // Call the Render API for Garmin login (returns encrypted tokens)
    const response = await fetch(`${PYTHON_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Garmin login failed' }))
      return NextResponse.json(
        { error: error.detail || 'Garmin login failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.tokens_encrypted) {
      return NextResponse.json({ error: 'No tokens returned from Garmin' }, { status: 500 })
    }

    // Check for required env vars
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server configuration error: missing Supabase URL' }, { status: 500 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Server configuration error: missing service role key' }, { status: 500 })
    }

    // Store encrypted tokens in Supabase using service role
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Upsert garmin_tokens
    const { error: upsertError } = await serviceClient
      .from('garmin_tokens')
      .upsert(
        {
          user_id: user.id,
          tokens_encrypted: data.tokens_encrypted,
          garmin_display_name: email,
        },
        { onConflict: 'user_id' }
      )

    if (upsertError) {
      console.error('Failed to store tokens:', JSON.stringify(upsertError))
      return NextResponse.json({
        error: 'Failed to store Garmin credentials',
        detail: upsertError.message,
        code: upsertError.code
      }, { status: 500 })
    }

    // Update profile
    const { error: profileError } = await serviceClient
      .from('profiles')
      .update({ garmin_connected: true })
      .eq('id', user.id)

    if (profileError) {
      console.error('Failed to update profile:', profileError)
    }

    return NextResponse.json({ success: true, email })
  } catch (error) {
    console.error('Garmin login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
