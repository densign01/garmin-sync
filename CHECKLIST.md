# Garmin Sync Implementation Checklist

Use this for ralph loops. Each checkbox is a testable benchmark.

---

## Phase 1: Foundation (Next.js + Supabase + Auth)

### Build
- [x] Create Next.js project: `npx create-next-app@latest garmin-sync-web --typescript --tailwind --eslint --app --src-dir`
- [x] Init shadcn/ui: `npx shadcn@latest init`
- [x] Create Supabase project at supabase.com
- [x] Add env vars to `.env.local` (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
- [x] Run migration 001 - profiles table with RLS
- [x] Build `src/lib/supabase/client.ts`
- [x] Build `src/lib/supabase/server.ts`
- [x] Build landing page (`src/app/page.tsx`)
- [x] Build login page (`src/app/login/page.tsx`)
- [x] Build signup page (`src/app/signup/page.tsx`)
- [x] Build auth callback (`src/app/auth/callback/route.ts`)
- [x] Build dashboard shell (`src/app/dashboard/page.tsx`)

### Test
- [x] `npm run dev` starts without errors
- [x] Landing page loads at localhost:3000
- [x] Signup creates user (check Supabase Auth → Users)
- [x] Login redirects to /dashboard
- [x] /dashboard shows user email
- [x] Unauthenticated /dashboard redirects to /login
- [ ] Google OAuth works (if enabled) - optional, skipped for now

---

## Phase 2: Garmin OAuth Integration

### Build
- [x] Run migration 002 - garmin_tokens table
- [x] Generate encryption key
- [x] Add GARMIN_ENCRYPTION_KEY to env
- [x] Build `/api/garmin/login` endpoint (Next.js API route → FastAPI)
- [x] Build `/api/garmin/push-workout` endpoint (Next.js API route → FastAPI)
- [x] Build `/api/garmin/status` endpoint
- [x] Build Garmin connect page (`src/app/settings/garmin/page.tsx`)
- [x] Add "Connect Garmin" link to dashboard

### Test
- [x] /api/garmin/status endpoint responds
- [x] Start Python FastAPI server
- [x] Connect with real Garmin credentials
- [x] Check Supabase: profiles.garmin_connected = true
- [x] Push test workout via API (completed in Phase 3)
- [x] Workout appears in Garmin Connect web (completed in Phase 3)

---

## Phase 3: Plain Text Workout Parser

### Build
- [x] Run migration 003 - workouts table
- [x] Add GEMINI_API_KEY to env
- [x] Build `/api/parse-workout` endpoint (Next.js + Gemini)
- [x] Build workout creator page (`src/app/workout/new/page.tsx`)
- [x] Add `buildGarminWorkout()` function
- [x] Link from dashboard to /workout/new (already exists)

### Test
- [x] POST to /api/parse-workout with "Bench Press 3x10 @ 135"
- [x] Response contains parsed JSON with category + garmin_name
- [x] UI: type workout in plain text, click Parse
- [x] Preview shows correct exercises with Garmin IDs
- [x] Click "Push to Garmin" - workout created
- [x] Workout syncs to Garmin watch

---

## Phase 4: Activity Sync + Comparison

### Build
- [x] Run migration 004 - activities table
- [x] Build `/api/garmin/sync` endpoint (Next.js route)
- [x] Build activity detail page with comparison (`src/app/activity/[id]/page.tsx`)
- [x] Add Sync button to dashboard
- [x] Add activities list to dashboard (`activities-section.tsx`)
- [x] Add comparison view (link workout to activity)

### Test
- [x] POST to /api/garmin/sync returns { synced: N }
- [x] Check Supabase: activities table has new rows
- [x] UI: Sync button pulls activities, shows in list
- [x] Compare a workout to an activity
- [x] Two-column actual vs planned comparison view

---

## Phase 5: Gemini Chatbot

### Build
- [ ] Run migration 005 - chat_messages table
- [ ] Build `/api/chat` endpoint (Python)
- [ ] Build Chat component (`src/components/chat.tsx`)
- [ ] Add chat sidebar to dashboard (toggle button)
- [ ] Build full-page chat (`src/app/chat/page.tsx`)
- [ ] Add workout detection (```workout blocks)
- [ ] Pre-fill /workout/new when workout detected

### Test
- [ ] POST to /api/chat returns response
- [ ] Chat messages saved to database
- [ ] UI: sidebar opens/closes
- [ ] Ask "Plan me a push day" - get structured workout
- [ ] Clicking "Use this workout" pre-fills creator
- [ ] Full-page chat mode works

---

## Phase 6: PWA + Mobile Responsive

### Build
- [ ] Install next-pwa: `npm install next-pwa`
- [ ] Update next.config.js with PWA config
- [ ] Create public/manifest.json
- [ ] Create app icons (192px, 512px PNG)
- [ ] Add responsive Tailwind classes to all pages
- [ ] Convert chat sidebar to bottom sheet on mobile
- [ ] Build InstallPrompt component
- [ ] Add viewport meta tag

### Test
- [ ] manifest.json accessible at /manifest.json
- [ ] Lighthouse PWA audit > 90
- [ ] All pages work at 375px viewport width
- [ ] Chat shows as bottom sheet on mobile
- [ ] iOS Safari: Add to Home Screen works
- [ ] Android Chrome: Install prompt appears
- [ ] Installed app opens in standalone mode

---

## Deployment

- [x] Push to GitHub (densign01/garmin-sync)
- [x] Connect repo to Vercel (garmin-sync.vercel.app)
- [x] Add all env vars in Vercel dashboard
- [x] Deploy to Vercel + Render (garmin-sync-api.onrender.com)
- [x] Test production signup/login
- [x] Test production Garmin connect
- [x] Test production workout push

---

## Quick Reference: Env Vars Needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GARMIN_ENCRYPTION_KEY=
```

## Quick Reference: Migrations

1. `001_initial_schema.sql` - profiles table
2. `002_garmin_tokens.sql` - encrypted Garmin tokens
3. `003_workouts.sql` - planned workouts
4. `004_activities.sql` - completed activities
5. `005_chat.sql` - chat messages

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `api/garmin.py` | Garmin login + push |
| `api/parse-workout.py` | Gemini workout parser |
| `api/garmin-sync.py` | Pull activities |
| `api/compare.py` | Planned vs actual |
| `api/chat.py` | Gemini chatbot |
