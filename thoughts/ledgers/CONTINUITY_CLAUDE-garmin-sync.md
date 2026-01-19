# Session: garmin-sync
Updated: 2026-01-19T20:00:04.945Z

## Goal
Public web app to plan strength workouts with AI, push to Garmin watch, track progress. Currently deploying to production.

## State
- Done: Phase 1-4, dashboard redesign, workout settings, privacy/support pages, login spacing fix
- Now: Vercel deploy in progress (waiting for build)
- Next: Test production end-to-end, then Phase 5 (Gemini Chatbot)

## Deployment URLs
- **Vercel**: Deploying from `garmin-sync-web/` (Next.js)
- **Render**: `https://garmin-sync-api.onrender.com` (FastAPI) - LIVE
- **GitHub**: `densign01/garmin-sync`
- **Latest commit**: f50e6e5 (login spacing fix)

## Key Decisions
1. Next.js proxies to FastAPI for Garmin auth (garth library)
2. Render free tier - 30s cold start (UX warning added under push button)
3. vercel.json forces Next.js framework detection
4. Suspense boundary wraps useSearchParams in workout/new

## Vercel Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GARMIN_ENCRYPTION_KEY
GEMINI_API_KEY
PYTHON_API_URL=https://garmin-sync-api.onrender.com
```

## To Test After Deploy
- [ ] Full flow: login → create workout → parse → push to Garmin
- [ ] Farmer's carry distance tracking (uses conditionTypeId: 3)
- [ ] Cold start UX (first request warning)

## Open Questions
- UNCONFIRMED: Does Garmin accept distance-based exercises (conditionTypeId: 3)?

## Working Set
- Project: `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/`
- Branch: master
- Root dir for Vercel: `garmin-sync-web`
