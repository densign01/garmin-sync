# Session: garmin-sync
Updated: 2026-01-19T20:42:34.400Z

## Goal
Public web app to plan strength workouts with AI, push to Garmin watch, track progress.

## State
- Done: Phase 1-4, dashboard redesign, workout settings, privacy/support pages, Vercel+Render deployed
- Now: **Fixing Garmin auth** - RLS policies just added, testing login
- Next: Test full flow (login → create workout → push to Garmin), then Phase 5 (Gemini Chatbot)

## Deployment URLs
- **Vercel**: https://garmin-sync.vercel.app (Next.js)
- **Render**: https://garmin-sync-api.onrender.com (FastAPI)
- **GitHub**: densign01/garmin-sync
- **Latest commit**: 0fd67fd (login error handling)

## Key Decisions
1. **Auth architecture changed**: Removed Python functions from Vercel (405 errors), now all Next.js routes
2. **Token flow**: Render does garth login → returns encrypted tokens → Next.js stores in Supabase
3. **Push flow**: Next.js reads tokens from Supabase → sends to Render `/api/workouts/push` → Render uses garth to push
4. Render needs `GARMIN_ENCRYPTION_KEY` env var (same as Vercel) - **USER CONFIRMED ADDED**

## Recent Fixes (This Session)
1. Deleted conflicting `/api/garmin/*.py` files - caused 405 errors
2. Created Next.js routes: `/api/garmin/login`, `/api/garmin/push-workout`, `/api/garmin/disconnect`
3. Added Render endpoint `/api/workouts/push` that accepts encrypted tokens
4. Added RLS policies to `garmin_tokens` table (INSERT, UPDATE, service_role)
5. Added error handling to login route to surface Supabase upsert failures

## Vercel Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GARMIN_ENCRYPTION_KEY
GEMINI_API_KEY
PYTHON_API_URL=https://garmin-sync-api.onrender.com
```

## Render Environment Variables
```
GARMIN_ENCRYPTION_KEY (must match Vercel)
```

## To Test Now
- [ ] Garmin login stores tokens in Supabase (was failing, just added RLS policies)
- [ ] Full flow: login → create workout → push to Garmin

## Open Questions
- UNCONFIRMED: Does Garmin accept distance-based exercises (conditionTypeId: 3)?

## Working Set
- Project: `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/`
- Branch: master
- Key files changed:
  - `garmin-sync-web/src/app/api/garmin/login/route.ts`
  - `garmin-sync-web/src/app/api/garmin/push-workout/route.ts`
  - `src/main.py` (Render - added `/api/workouts/push`)
