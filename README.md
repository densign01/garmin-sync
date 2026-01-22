# Garmin Sync

Web app to create strength workouts and push them to your Garmin watch.

**Live**: [garmin-sync.vercel.app](https://garmin-sync.vercel.app)

## How It Works

1. Paste workout in plain text (e.g., "Bench Press 3x8 @ 185 lbs")
2. App parses and maps exercises to Garmin's 1,500+ exercise database
3. Review/edit the mapping, then push to Garmin Connect
4. Workout syncs to your watch - follow along during your session
5. View completed workout data back in the app

## Features

- **Plain text parsing** - No forms, just paste your workout
- **Smart exercise matching** - Fuzzy matching with confidence scores
- **Searchable dropdown** - Browse/search 1,500+ Garmin exercises
- **Editable fields** - Adjust sets, reps, weight, rest times
- **Activity history** - View completed workouts synced from Garmin
- **Plan comparison** - Compare actual vs planned performance

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python) |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth + Garmin OAuth via [garth](https://github.com/matin/garth) |
| Hosting | Vercel (frontend), Render (API) |

## Local Development

### Frontend (Next.js)

```bash
cd garmin-sync-web
npm install
npm run dev
```

Runs on `http://localhost:3000`

### Backend (FastAPI)

```bash
pip install -r requirements.txt
uvicorn src.main:app --reload
```

Runs on `http://localhost:8000`

### Environment Variables

**Frontend** (`garmin-sync-web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
PYTHON_API_URL=http://localhost:8000
```

**Backend** (`.env`):
```
GARMIN_ENCRYPTION_KEY=  # Fernet key for token encryption
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

## Credits

- Exercise database: [GarminExercisesCollector](https://github.com/maximecharriere/GarminExercisesCollector)
- Garmin authentication: [garth](https://github.com/matin/garth)
