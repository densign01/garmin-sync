import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    // Check if user has valid Garmin tokens (not placeholder)
    const { data: tokens } = await supabase
      .from('garmin_tokens')
      .select('garmin_display_name, connected_at, tokens_encrypted')
      .eq('user_id', user.id)
      .single()

    // Check for real tokens (not placeholder)
    const hasValidTokens = tokens &&
      tokens.tokens_encrypted &&
      tokens.tokens_encrypted !== 'local-dev-mode'

    if (hasValidTokens) {
      return NextResponse.json({
        connected: true,
        email: tokens.garmin_display_name,
        connectedAt: tokens.connected_at,
      })
    }

    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error('Garmin status error:', error)
    return NextResponse.json({ connected: false })
  }
}
