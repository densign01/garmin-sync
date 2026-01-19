# Session: garmin-sync
Updated: 2026-01-19T04:12:08.105Z

## Goal
Public web app where anyone can plan strength workouts with AI, push to Garmin watch, and track progress.

## Status: PHASE 4 COMPLETE ✅
- Phase 1: Auth flow ✅
- Phase 2: Garmin connection ✅
- Phase 3: Workout parser + Garmin push ✅
- Phase 4: Activity Sync + Comparison ✅

## State
- Done: Auth, Garmin connect, workout parsing, workout push, activity sync, comparison view
- Now: Test activity sync flow with real workout
- Next: Phase 5 (Chatbot), Phase 6 (PWA)

## Key Decisions
1. **Next.js API routes proxy to FastAPI** - FastAPI handles garth auth, Next.js handles Supabase auth
2. **Gemini 2.0 Flash for parsing** - Parses plain text workouts to JSON
3. **Exercise mapping** - Map common names to Garmin's exact category/exercise IDs
4. **FastAPI stores garth tokens at ~/.garmin-sync/** - Not in Supabase (local dev)

## Phase Overview
| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Foundation (Next.js + Supabase + Auth) | [x] Complete |
| 2 | Garmin OAuth Integration | [x] Complete |
| 3 | Plain Text Workout Parser | [x] Complete |
| 4 | Activity Sync + Comparison | [x] Complete |
| 5 | Gemini Chatbot | [ ] Pending |
| 6 | PWA + Mobile Responsive | [ ] Pending |

## Key Files (New App)
- `garmin-sync-web/src/app/workout/new/page.tsx` - Workout creator UI
- `garmin-sync-web/src/app/api/parse-workout/route.ts` - Gemini parser + exercise mapping
- `garmin-sync-web/src/app/api/garmin/push-workout/route.ts` - Sends to FastAPI
- `garmin-sync-web/src/app/api/garmin/login/route.ts` - Garmin OAuth
- `garmin-sync-web/src/app/settings/garmin/page.tsx` - Garmin connect UI
- `src/schemas.py` - FastAPI workout JSON builder (has build_workout_json)
- `src/garmin_client.py` - garth wrapper

## Environment Variables (garmin-sync-web/.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=✓
NEXT_PUBLIC_SUPABASE_ANON_KEY=✓
SUPABASE_SERVICE_ROLE_KEY=✓
GARMIN_ENCRYPTION_KEY=✓
GEMINI_API_KEY=✓ (added, working)
```

## Running Locally
1. FastAPI server: `cd /path/to/garmin-sync && uvicorn src.main:app --reload` (port 8000)
2. Next.js dev: `cd garmin-sync-web && npm run dev` (port 3000)

## Bug Fixes Applied This Session
- Fixed exercise mappings: added "triceps pushdown", "farmer's carry" variants
- Fixed push-workout API to convert parsed workout → FastAPI format (name + exercises array)
- Added garmin_tokens row for user (FastAPI stores tokens locally, but Next.js checks Supabase)

## Open Questions
- How to handle exercises that don't map to Garmin IDs? (currently falls back to OTHER which may error)

## Working Set
- Project: `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/`
- Checklist: `CHECKLIST.md`
- Supabase project: `ilevtfikfzdphueoajfa`
