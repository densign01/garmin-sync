# Garmin Sync

Web app to plan strength workouts with AI, push to Garmin watch, and track progress.

**Live:** https://garmin-sync.vercel.app

## Features

- **Natural language workout input** - Type "Bench Press 3x8 @ 185 lbs" and it parses automatically
- **AI-powered parsing** - Gemini understands workout formats and normalizes exercise names
- **1,500+ exercise database** - Maps user input to Garmin's official exercise IDs with fuzzy matching
- **Push to Garmin Connect** - Workouts sync to your watch for guided training
- **Smart defaults** - Auto-assigns rest times based on exercise type (major lifts vs accessories)

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui
- **Backend:** FastAPI on Render (for Garmin auth via garth library)
- **Database:** Supabase (auth + workout storage)
- **AI:** Google Gemini 2.0 Flash (workout parsing)

## Architecture

```
User → Vercel (Next.js) → Supabase (auth/storage)
                       → Gemini (parse workout text)
                       → Render (FastAPI) → Garmin Connect API
```

## Exercise Mapping

The app includes a comprehensive exercise database from [GarminExercisesCollector](https://github.com/maximecharriere/GarminExercisesCollector):

- **1,510 exercises** with categories and Garmin IDs
- **Fuzzy matching** using word-overlap scoring (finds best match, not first)
- **Alias support** for abbreviations (rdl, ohp, ghr) and variants (trap bar → trap-bar)

Examples:
| User Input | Garmin Match |
|------------|--------------|
| trap bar deadlift | TRAP_BAR_DEADLIFT |
| incline dumbbell press | INCLINE_DUMBBELL_BENCH_PRESS |
| lat pulldown | LAT_PULLDOWN |
| rdl | ROMANIAN_DEADLIFT |

## Environment Variables

### Vercel (Next.js)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GARMIN_ENCRYPTION_KEY
GEMINI_API_KEY
PYTHON_API_URL=https://garmin-sync-api.onrender.com
```

### Render (FastAPI)
```
GARMIN_ENCRYPTION_KEY
```

## Development

```bash
cd garmin-sync-web
npm install
npm run dev
```

## Credits

- Exercise data: [GarminExercisesCollector](https://github.com/maximecharriere/GarminExercisesCollector) by maximecharriere
- Garmin auth: [garth](https://github.com/matin/garth) library
