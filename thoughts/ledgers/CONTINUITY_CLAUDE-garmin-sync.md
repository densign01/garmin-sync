# Session: garmin-sync
Updated: 2026-01-21

## Goal
Public web app to plan strength workouts with AI, push to Garmin watch, track progress.

## State
- [x] Phase 1-4: Dashboard, Garmin auth, workout creation, push to Garmin
- [x] Exercise mapping: 1,510 exercises with fuzzy matching
- [x] Security audit and fixes
- [x] Render updated with new encryption key
- [x] Exercise suggestions with confidence scoring
- [x] Inline swap UI for exercise suggestions
- [x] Feature branch merged to master
- [x] Sync endpoint fixed (token-based auth for serverless)
- [x] DEN-6: Redesign exercise preview as left-to-right mapping UI
- [ ] Phase 5: Gemini Chatbot integration

## Deployment URLs
- **Vercel**: https://garmin-sync.vercel.app (Next.js)
- **Render**: https://garmin-sync-api.onrender.com (FastAPI)
- **GitHub**: densign01/garmin-sync

## Immediate Next Steps
1. Test the new two-column exercise mapping UI
2. Deploy to Vercel (auto-deploys on push)
3. Plan Phase 5: Gemini Chatbot integration

## Recent Features (Jan 21 - DEN-6)
1. **Two-column mapping UI**: Input → Garmin exercise mapping
2. **Searchable dropdown**: Type to filter 2,000+ Garmin exercises (cmdk)
3. **Editable fields**: Sets, reps, weight, rest time all editable
4. **Reps/Distance toggle**: Switch between reps and distance modes
5. **Confidence badges**: Green/amber/red based on match quality

## Recent Features (Jan 19)
1. **Exercise suggestions**: Shows top 3 alternatives for poor matches
2. **Confidence scoring**: Green/amber/red badges based on match quality
3. **Inline swap UI**: Click "swap?" to see alternatives, click to swap
4. **Push logging**: All push attempts logged to `workout_push_log` table

## Security Fixes Applied (Jan 19)
1. **Real encryption**: Fernet symmetric encryption (not base64)
2. **CORS restricted**: Only garmin-sync.vercel.app and localhost
3. **No default key**: App crashes if GARMIN_ENCRYPTION_KEY not set
4. **Key validation**: Validates Fernet key format on startup

## Exercise Mapping
- **Database**: `garmin-sync-web/src/lib/garmin-exercises.ts` - 1,510 exercises
- **Source**: [GarminExercisesCollector](https://github.com/maximecharriere/GarminExercisesCollector)
- **Matching**: Exact -> Simplified -> Word-overlap scoring (best match)
- **Aliases**: rdl, ohp, ghr, lat pulldown, trap bar deadlift, etc.

## Key Decisions
1. **Auth architecture**: Next.js routes call Render for garth operations
2. **Token flow**: Render does garth login -> returns encrypted tokens -> Next.js stores in Supabase
3. **Push flow**: Next.js reads tokens -> sends to Render `/api/workouts/push` -> Render pushes via garth
4. **Exercise mapping**: GarminExercisesCollector database with word-overlap fuzzy matching
5. **Mapping UI**: Two-column layout with searchable dropdown (cmdk) and editable fields

## Working Set
- Project: `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/`
- Branch: `master`
- Key files:
  - `src/main.py` (Render - encryption, CORS, auth)
  - `garmin-sync-web/src/lib/garmin-exercises.ts` (exercise database)
  - `garmin-sync-web/src/app/workout/new/page.tsx` (workout creation page)
  - `garmin-sync-web/src/components/exercise-mapping-row.tsx` (new mapping UI component)

## Credits
- Exercise data: [GarminExercisesCollector](https://github.com/maximecharriere/GarminExercisesCollector)
- Garmin auth: [garth](https://github.com/matin/garth)
