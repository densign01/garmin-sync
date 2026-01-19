# Session: garmin-sync
Updated: 2026-01-19T19:55:00Z

## Goal
Public web app where anyone can plan strength workouts with AI, push to Garmin watch, and track progress.

## Status: DEPLOYING TO PRODUCTION
- Phase 1-4: Complete
- Deployment: In progress

## State
- Done: Dashboard redesign, workout settings, privacy/support pages, Vercel + Render setup
- Now: Fixing login page spacing, completing Vercel deploy
- Next: Test end-to-end on production, Phase 5 (Gemini Chatbot)

## Deployment
- **Vercel**: `garmin-sync-web/` (Next.js) - deploying
- **Render**: `https://garmin-sync-api.onrender.com` (FastAPI) - LIVE
- **GitHub**: `densign01/garmin-sync`

## Key Decisions
1. **Next.js API routes proxy to FastAPI** - FastAPI handles garth auth
2. **Render free tier** - 30s cold start on first request (added UX warning)
3. **vercel.json** - Force Next.js framework detection
4. **Suspense boundary** - Fixed useSearchParams prerender error

## Features Added (2026-01-19)
- Dashboard redesign: hero section, gradient cards, date badges
- Workout settings: major/minor lift rest times, unilateral handling
- Farmer's carry distance tracking (yards → meters)
- Privacy policy + support/contact pages
- Footer links on landing + dashboard

## To Test / Verify
- [ ] Farmer's carry distance (`conditionTypeId: 3`) - test next workout push
- [ ] Full production flow: login → parse → push to Garmin

## Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GARMIN_ENCRYPTION_KEY
GEMINI_API_KEY
PYTHON_API_URL=https://garmin-sync-api.onrender.com
```

## Working Set
- Project: `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/`
- Branch: master
- Latest commit: 8fb7916 (Suspense fix)
