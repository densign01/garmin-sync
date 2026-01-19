# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Purpose

Web app to sync strength workouts with Garmin Forerunner watch:
1. User builds workout in web UI (or pastes from Gemini)
2. App pushes structured workout to Garmin Connect
3. Watch syncs and guides user through workout
4. After workout, app pulls completed data back
5. Data exported for Gemini analysis/planning

## Tech Stack (Planned)

- **Backend**: Python with FastAPI
- **Auth**: garth library (Garmin OAuth)
- **API**: python-garminconnect for data fetching
- **FIT Parsing**: fitdecode for completed workout data
- **Frontend**: Simple HTML/JS (no build step)

## Key Constraints

- Garmin's official API requires business approval - using reverse-engineered wrappers
- Strength workout JSON schema must be reverse-engineered from exports
- Exercise names must match Garmin's ~1,500 exercise IDs or show as "Other"
- REST steps required between sets for watch edit prompts

## Development Workflow

1. Check continuity ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-garmin-sync.md`
2. Reference this file for project context
3. Test with real Garmin account before deploying
