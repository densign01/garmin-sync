/**
 * Simple in-memory rate limiter for Next.js edge middleware.
 *
 * Limits requests per IP address using a sliding window approach.
 * Stores timestamps in memory - resets on server restart.
 *
 * For distributed deployments (multiple Vercel regions),
 * consider using Vercel KV or Upstash Redis instead.
 */

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the window */
  remaining: number;
  /** Milliseconds until window resets */
  resetInMs: number;
}

// In-memory store: IP -> array of request timestamps
const requestStore = new Map<string, number[]>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  const cutoff = now - windowMs;

  for (const [ip, timestamps] of requestStore.entries()) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      requestStore.delete(ip);
    } else {
      requestStore.set(ip, valid);
    }
  }
}

/**
 * Check if a request from an IP is allowed under rate limits.
 *
 * @param ip - Client IP address
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Periodically clean up old entries
  cleanupOldEntries(config.windowMs);

  // Get existing timestamps for this IP, filter to current window
  const timestamps = (requestStore.get(ip) || []).filter((t) => t > cutoff);

  // Check if limit exceeded
  if (timestamps.length >= config.limit) {
    const oldestInWindow = Math.min(...timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetInMs: oldestInWindow + config.windowMs - now,
    };
  }

  // Add current request timestamp
  timestamps.push(now);
  requestStore.set(ip, timestamps);

  return {
    allowed: true,
    remaining: config.limit - timestamps.length,
    resetInMs: config.windowMs,
  };
}

// Pre-configured rate limits for common use cases
export const RATE_LIMITS = {
  /** Login attempts: 5 per 15 minutes */
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  /** API calls: 100 per minute */
  api: { limit: 100, windowMs: 60 * 1000 },
} as const;
