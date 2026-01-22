# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Purpose

Web app to sync strength workouts with Garmin Forerunner watch:
1. User builds workout in web UI (or pastes from Gemini)
2. App pushes structured workout to Garmin Connect
3. Watch syncs and guides user through workout
4. After workout, app pulls completed data back
5. Data exported for Gemini analysis/planning

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, shadcn/ui (Vercel)
- **Backend**: FastAPI Python (Render)
- **Database**: Supabase (Postgres)
- **Auth**: Supabase Auth + garth (Garmin OAuth)

## Key Constraints

- Garmin's official API requires business approval - using reverse-engineered wrappers
- Strength workout JSON schema must be reverse-engineered from exports
- Exercise names must match Garmin's ~1,500 exercise IDs or show as "Other"
- REST steps required between sets for watch edit prompts

## Project Tracking

| What | Where | Purpose |
|------|-------|---------|
| Session state | `thoughts/ledgers/CONTINUITY_CLAUDE-garmin-sync.md` | Current work, decisions, working files |
| User-facing changes | `CHANGELOG.md` | Release notes (Added/Changed/Fixed) |
| Tasks/Issues | Linear (DEN-* issues) | Feature tracking, backlog |
| Code history | Git/GitHub | Commits, PRs, branches |

**Flow**: Linear issue → Ledger tracks work → Git commits → PR merged → CHANGELOG updated → Ledger marked complete

## Development Workflow

1. Check continuity ledger for current state
2. Reference this file for project context
3. Test with real Garmin account before deploying
4. Update CHANGELOG.md after merging features
