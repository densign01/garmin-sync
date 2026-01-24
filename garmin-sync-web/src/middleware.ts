import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for, falls back to x-real-ip.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; first is the client
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function middleware(request: NextRequest) {
  // Rate limit login endpoint to prevent brute force attacks
  if (request.nextUrl.pathname === '/api/garmin/login' && request.method === 'POST') {
    const ip = getClientIp(request)
    const result = checkRateLimit(ip, RATE_LIMITS.login)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please wait 15 minutes before trying again.',
          retry_after_seconds: Math.ceil(result.resetInMs / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(result.resetInMs / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + result.resetInMs),
          },
        }
      )
    }
  }

  // Continue with Supabase session handling
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
