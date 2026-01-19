# Garmin Workout Sync - Full Feature Buildout

## Vision

A public web app where anyone can:
1. Sign up with email or Google
2. Connect their Garmin account
3. Describe workouts in plain text (or use a builder)
4. Have AI help plan their training
5. Push workouts to their Garmin watch
6. See completed workout data synced back
7. Get AI analysis of their progress

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 14 (App Router) | Vercel hosting, RSC, great DX |
| Styling | Tailwind CSS + shadcn/ui | Clean design, accessible components |
| Auth | Supabase Auth | Email, Google, handles sessions |
| Database | Supabase Postgres | Scales, row-level security, free tier |
| Garmin API | garth (Python) | Proven, handles OAuth tokens |
| Backend API | Python FastAPI (serverless) | Existing code works, Vercel Python support |
| AI | Gemini Pro | Good at parsing natural language, affordable |
| PWA | next-pwa | Offline support, installable |

## Current State → Target State

| Current | Target |
|---------|--------|
| Single-user, local tokens | Multi-user with Supabase |
| Desktop-only HTML | Mobile-responsive PWA |
| Dropdown workout builder | Plain text parsing via Gemini |
| Manual JSON export to Gemini | Integrated chatbot |
| Python FastAPI monolith | Next.js + FastAPI API routes |

## What We're NOT Doing

- Native iOS/Android apps
- Real-time watch sync (Garmin syncs via cloud)
- Social features (sharing workouts with others)
- Payment/subscriptions (Phase 2 concern, not MVP)
- Hevy integration

---

## Phase 1: Foundation (Next.js + Supabase + Auth)

### Overview
Set up the Next.js project with Supabase authentication. Users can sign up, log in, and see a basic dashboard. No Garmin integration yet.

### Changes Required:

#### 1. Initialize Next.js Project
```bash
npx create-next-app@latest garmin-sync-web --typescript --tailwind --eslint --app --src-dir
cd garmin-sync-web
npx shadcn@latest init
```

#### 2. Supabase Setup
- Create project at supabase.com
- Get project URL and anon key
- Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

#### 3. Database Schema
**File**: `supabase/migrations/001_initial_schema.sql`

```sql
-- Users profile (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    garmin_connected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

#### 4. Auth Components
**File**: `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**File**: `src/lib/supabase/server.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

#### 5. Landing Page
**File**: `src/app/page.tsx`

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Garmin Workout Sync
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Plan your strength workouts with AI, push them to your Garmin watch,
            and track your progress automatically.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
```

#### 6. Auth Pages
**File**: `src/app/login/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-slate-500">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
```

#### 7. Dashboard Shell
**File**: `src/app/dashboard/page.tsx`

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="font-bold text-xl">Garmin Sync</h1>
          <span className="text-slate-600">{user.email}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {!profile?.garmin_connected && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800">
              Connect your Garmin account to start syncing workouts.
            </p>
            <a
              href="/api/garmin/connect"
              className="inline-block mt-2 text-amber-600 underline"
            >
              Connect Garmin →
            </a>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Create Workout</h3>
            <p className="text-slate-600 mb-4">
              Describe your workout in plain text or use the builder.
            </p>
            <a href="/workout/new" className="text-blue-600 underline">
              Create new workout →
            </a>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Recent Activities</h3>
            <p className="text-slate-600">
              {profile?.garmin_connected
                ? 'Your recent workouts will appear here.'
                : 'Connect Garmin to see activities.'}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Next.js dev server runs: `cd garmin-sync-web && npm run dev`
- [ ] Landing page loads at http://localhost:3000
- [ ] Signup creates user in Supabase: Check Supabase dashboard → Auth → Users
- [ ] Login redirects to dashboard
- [ ] Dashboard shows user email
- [ ] Unauthenticated access to /dashboard redirects to /login

#### Manual Verification:
- [ ] Google OAuth flow works (redirects, returns, shows user)
- [ ] Mobile layout looks correct (check with browser dev tools)
- [ ] "Connect Garmin" banner shows for new users

**Implementation Note**: Pause here for manual testing before Phase 2.

---

## Phase 2: Garmin OAuth Integration

### Overview
Connect users' Garmin accounts using garth. Store encrypted tokens in Supabase. Enable workout push.

### Changes Required:

#### 1. Garmin Tokens Table
**File**: `supabase/migrations/002_garmin_tokens.sql`

```sql
-- Store encrypted Garmin tokens
CREATE TABLE garmin_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tokens_encrypted TEXT NOT NULL,  -- Encrypted JSON blob
    garmin_display_name TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ
);

ALTER TABLE garmin_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
    ON garmin_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- No direct update/insert from client - only via server
```

#### 2. Python API for Garmin
**File**: `api/garmin.py` (Vercel Python serverless function)

```python
"""Garmin API endpoints using garth."""
import os
import json
from http import HTTPStatus
from typing import Any

import garth
from cryptography.fernet import Fernet

# Get encryption key from env
ENCRYPTION_KEY = os.environ.get("GARMIN_ENCRYPTION_KEY")
fernet = Fernet(ENCRYPTION_KEY.encode()) if ENCRYPTION_KEY else None

def encrypt_tokens(tokens_dict: dict) -> str:
    """Encrypt tokens for storage."""
    return fernet.encrypt(json.dumps(tokens_dict).encode()).decode()

def decrypt_tokens(encrypted: str) -> dict:
    """Decrypt tokens from storage."""
    return json.loads(fernet.decrypt(encrypted.encode()).decode())

def handler(request):
    """Main handler for /api/garmin/* routes."""
    path = request.path.replace("/api/garmin", "")

    if path == "/login" and request.method == "POST":
        return handle_login(request)
    elif path == "/status":
        return handle_status(request)
    elif path == "/push-workout" and request.method == "POST":
        return handle_push_workout(request)

    return {"statusCode": 404, "body": "Not found"}

def handle_login(request):
    """Login to Garmin and store encrypted tokens."""
    data = request.json
    email = data.get("email")
    password = data.get("password")
    user_id = request.headers.get("x-user-id")  # Set by middleware

    if not user_id:
        return {"statusCode": 401, "body": "Unauthorized"}

    try:
        garth.login(email, password)
        tokens = garth.client.dumps()

        # Encrypt and store
        encrypted = encrypt_tokens({"tokens": tokens})

        # Store in Supabase (via service role)
        from supabase import create_client
        supabase = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        )

        supabase.table("garmin_tokens").upsert({
            "user_id": user_id,
            "tokens_encrypted": encrypted,
            "garmin_display_name": email,
        }).execute()

        # Update profile
        supabase.table("profiles").update({
            "garmin_connected": True
        }).eq("id", user_id).execute()

        return {
            "statusCode": 200,
            "body": json.dumps({"success": True})
        }
    except Exception as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": str(e)})
        }

def handle_push_workout(request):
    """Push a workout to Garmin Connect."""
    data = request.json
    user_id = request.headers.get("x-user-id")

    if not user_id:
        return {"statusCode": 401, "body": "Unauthorized"}

    # Get user's tokens
    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    result = supabase.table("garmin_tokens").select("tokens_encrypted").eq("user_id", user_id).single().execute()

    if not result.data:
        return {"statusCode": 400, "body": json.dumps({"error": "Garmin not connected"})}

    # Decrypt and load tokens
    tokens_data = decrypt_tokens(result.data["tokens_encrypted"])
    garth.client.loads(tokens_data["tokens"])

    # Push workout
    try:
        workout_json = data.get("workout")
        result = garth.connectapi(
            "/workout-service/workout",
            method="POST",
            json=workout_json,
        )
        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "workoutId": result.get("workoutId"),
                "workoutName": result.get("workoutName"),
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
```

#### 3. Garmin Connect UI
**File**: `src/app/settings/garmin/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'

export default function GarminConnectPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/garmin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (data.success) {
      router.push('/dashboard')
    } else {
      setError(data.error || 'Failed to connect')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect Garmin</CardTitle>
          <CardDescription>
            Enter your Garmin Connect credentials. We encrypt and store your
            tokens securely - we never see your password after this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <Input
              type="email"
              placeholder="Garmin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Garmin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connecting...' : 'Connect Garmin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Garmin tokens table exists in Supabase
- [ ] `/api/garmin/login` endpoint responds
- [ ] `/api/garmin/push-workout` endpoint responds
- [ ] Encrypted tokens are stored (check Supabase, should be unreadable blob)

#### Manual Verification:
- [ ] Connect Garmin with real credentials
- [ ] Profile shows `garmin_connected: true`
- [ ] Push a test workout - appears in Garmin Connect web

**Implementation Note**: Pause here for manual testing before Phase 3.

---

## Phase 3: Plain Text Workout Parser + Push

### Overview
Use Gemini to parse natural language workout descriptions into structured JSON. Show preview, then push to Garmin.

### Changes Required:

#### 1. Workouts Table
**File**: `supabase/migrations/003_workouts.sql`

```sql
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    garmin_workout_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    raw_input TEXT,  -- Original plain text
    exercises JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_for DATE
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workouts"
    ON workouts FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workouts_scheduled ON workouts(scheduled_for);
```

#### 2. Gemini Parser API
**File**: `api/parse-workout.py`

```python
"""Parse plain text workout using Gemini."""
import os
import json
import httpx

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

EXERCISE_CATEGORIES = {
    # Map common exercise names to Garmin's exact IDs
    "bench press": ("BENCH_PRESS", "BARBELL_BENCH_PRESS"),
    "incline bench": ("BENCH_PRESS", "INCLINE_DUMBBELL_BENCH_PRESS"),
    "squat": ("SQUAT", "BARBELL_BACK_SQUAT"),
    "front squat": ("SQUAT", "BARBELL_FRONT_SQUAT"),
    "deadlift": ("DEADLIFT", "BARBELL_DEADLIFT"),
    "romanian deadlift": ("DEADLIFT", "ROMANIAN_DEADLIFT"),
    "rdl": ("DEADLIFT", "ROMANIAN_DEADLIFT"),
    "overhead press": ("SHOULDER_PRESS", "OVERHEAD_BARBELL_PRESS"),
    "ohp": ("SHOULDER_PRESS", "OVERHEAD_BARBELL_PRESS"),
    "barbell row": ("ROW", "BENT_OVER_ROW"),
    "dumbbell row": ("ROW", "ONE_ARM_DUMBBELL_ROW"),
    "pull up": ("PULL_UP", "PULL_UP"),
    "chin up": ("PULL_UP", "CHIN_UP"),
    "lat pulldown": ("PULL_UP", "LAT_PULLDOWN"),
    "bicep curl": ("CURL", "BARBELL_BICEPS_CURL"),
    "hammer curl": ("CURL", "HAMMER_CURL"),
    "tricep pushdown": ("TRICEPS_EXTENSION", "TRICEPS_PRESSDOWN"),
    "tricep extension": ("TRICEPS_EXTENSION", "OVERHEAD_TRICEPS_EXTENSION"),
    "leg press": ("SQUAT", "LEG_PRESS"),
    "leg curl": ("LEG_CURL", "LYING_LEG_CURL"),
    "leg extension": ("LEG_EXTENSION", "LEG_EXTENSION"),
    "calf raise": ("CALF_RAISE", "STANDING_CALF_RAISE"),
    "plank": ("PLANK", "PLANK"),
    "crunch": ("CRUNCH", "CRUNCH"),
    "farmer walk": ("CARRY", "FARMERS_WALK"),
    "lunge": ("LUNGE", "DUMBBELL_LUNGE"),
}

PARSE_PROMPT = """You are a workout parser. Convert the user's plain text workout description into structured JSON.

Output ONLY valid JSON with this structure:
{
  "name": "Workout name",
  "exercises": [
    {
      "name": "exercise name (lowercase)",
      "sets": 3,
      "reps": 10,
      "weight_lbs": 135,
      "rest_seconds": 90
    }
  ]
}

Rules:
- If no weight specified, omit weight_lbs
- Default rest is 90 seconds unless specified
- "3x10" means 3 sets of 10 reps
- "135lbs" or "135 lbs" or "135#" all mean weight
- If workout has no name, generate one based on exercises

User input:
"""

def handler(request):
    """Parse plain text workout."""
    if request.method != "POST":
        return {"statusCode": 405, "body": "Method not allowed"}

    data = request.json
    raw_text = data.get("text", "")

    if not raw_text:
        return {"statusCode": 400, "body": json.dumps({"error": "No text provided"})}

    # Call Gemini
    response = httpx.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json={
            "contents": [{"parts": [{"text": PARSE_PROMPT + raw_text}]}],
            "generationConfig": {
                "temperature": 0.1,  # Low for consistent parsing
                "maxOutputTokens": 1000
            }
        },
        timeout=30.0
    )

    if response.status_code != 200:
        return {"statusCode": 500, "body": json.dumps({"error": "Gemini API error"})}

    result = response.json()
    text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

    # Extract JSON from response
    try:
        # Handle markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        parsed = json.loads(text.strip())

        # Map exercise names to Garmin IDs
        for ex in parsed.get("exercises", []):
            name_lower = ex["name"].lower()
            if name_lower in EXERCISE_CATEGORIES:
                category, garmin_name = EXERCISE_CATEGORIES[name_lower]
                ex["category"] = category
                ex["garmin_name"] = garmin_name
            else:
                # Default to generic
                ex["category"] = "OTHER"
                ex["garmin_name"] = "OTHER"

        return {
            "statusCode": 200,
            "body": json.dumps({
                "parsed": parsed,
                "raw_input": raw_text
            })
        }
    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Failed to parse workout", "raw": text})
        }
```

#### 3. Workout Creator Page
**File**: `src/app/workout/new/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Exercise = {
  name: string
  sets: number
  reps: number
  weight_lbs?: number
  rest_seconds: number
  category?: string
  garmin_name?: string
}

type ParsedWorkout = {
  name: string
  exercises: Exercise[]
}

export default function NewWorkoutPage() {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null)
  const [loading, setLoading] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleParse() {
    setLoading(true)
    setError('')

    const res = await fetch('/api/parse-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.parsed) {
      setParsed(data.parsed)
    } else {
      setError(data.error || 'Failed to parse')
    }
  }

  async function handlePush() {
    if (!parsed) return
    setPushing(true)

    // Build Garmin workout JSON
    const workoutJson = buildGarminWorkout(parsed)

    const res = await fetch('/api/garmin/push-workout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workout: workoutJson }),
    })

    const data = await res.json()
    setPushing(false)

    if (data.success) {
      router.push(`/dashboard?pushed=${data.workoutName}`)
    } else {
      setError(data.error || 'Failed to push')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Create Workout</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Describe Your Workout</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={`Example:\nMonday Upper Body\nBench Press 3x8 @ 185 lbs\nBarbell Row 3x10 @ 135 lbs\nOverhead Press 3x8 @ 95 lbs\nBicep Curls 3x12\nTricep Pushdown 3x15`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="font-mono"
            />
            <Button
              onClick={handleParse}
              disabled={loading || !rawText}
              className="mt-4"
            >
              {loading ? 'Parsing...' : 'Parse Workout'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {parsed && (
          <Card>
            <CardHeader>
              <CardTitle>Preview: {parsed.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {parsed.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-100 rounded"
                  >
                    <div>
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-slate-500 ml-2">
                        {ex.sets}×{ex.reps}
                        {ex.weight_lbs && ` @ ${ex.weight_lbs} lbs`}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {ex.garmin_name?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handlePush}
                disabled={pushing}
                className="w-full mt-6"
              >
                {pushing ? 'Pushing to Garmin...' : 'Push to Garmin Watch'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function buildGarminWorkout(parsed: ParsedWorkout) {
  const steps: any[] = []
  let stepOrder = 1

  for (const ex of parsed.exercises) {
    const exerciseStep = {
      type: 'ExecutableStepDTO',
      stepOrder: stepOrder + 1,
      stepType: { stepTypeId: 3, stepTypeKey: 'interval' },
      endCondition: { conditionTypeId: 10, conditionTypeKey: 'reps' },
      endConditionValue: ex.reps,
      targetType: { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
      category: ex.category || 'OTHER',
      exerciseName: ex.garmin_name || 'OTHER',
      weightUnit: { unitId: 9, unitKey: 'pound', factor: 453.59237 },
      strokeType: { strokeTypeId: 0 },
      equipmentType: { equipmentTypeId: 0 },
    }

    if (ex.weight_lbs) {
      (exerciseStep as any).weightValue = ex.weight_lbs
    }

    const restStep = {
      type: 'ExecutableStepDTO',
      stepOrder: stepOrder + 2,
      stepType: { stepTypeId: 5, stepTypeKey: 'rest' },
      endCondition: { conditionTypeId: 2, conditionTypeKey: 'time' },
      endConditionValue: ex.rest_seconds || 90,
      strokeType: { strokeTypeId: 0 },
      equipmentType: { equipmentTypeId: 0 },
    }

    steps.push({
      type: 'RepeatGroupDTO',
      stepOrder: stepOrder,
      stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
      numberOfIterations: ex.sets,
      smartRepeat: false,
      workoutSteps: [exerciseStep, restStep],
    })

    stepOrder += 3
  }

  return {
    workoutName: parsed.name,
    sportType: { sportTypeId: 5, sportTypeKey: 'strength_training' },
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: { sportTypeId: 5, sportTypeKey: 'strength_training' },
        workoutSteps: steps,
      },
    ],
  }
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `/api/parse-workout` endpoint responds
- [ ] Parsing "Bench Press 3x10 @ 135" returns structured JSON
- [ ] Garmin IDs are correctly mapped

#### Manual Verification:
- [ ] Type a workout in plain text, see it parsed correctly
- [ ] Preview shows Garmin exercise names
- [ ] "Push to Garmin" creates workout in Garmin Connect
- [ ] Workout syncs to watch

**Implementation Note**: Pause here for manual testing before Phase 4.

---

## Phase 4: Activity Sync + Comparison

### Overview
Pull completed activities from Garmin, store locally, compare against planned workouts.

### Changes Required:

#### 1. Activities Table
**File**: `supabase/migrations/004_activities.sql`

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    garmin_activity_id TEXT UNIQUE,
    workout_id UUID REFERENCES workouts(id),  -- Link to planned workout
    name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER,
    exercises JSONB NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities"
    ON activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_time ON activities(start_time DESC);
```

#### 2. Sync API
**File**: `api/garmin-sync.py`

```python
"""Sync activities from Garmin."""
import os
import json
from datetime import datetime
import garth

def handler(request):
    """Sync recent activities for a user."""
    user_id = request.headers.get("x-user-id")
    if not user_id:
        return {"statusCode": 401, "body": "Unauthorized"}

    # Load user's Garmin tokens
    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    tokens_result = supabase.table("garmin_tokens").select("tokens_encrypted").eq("user_id", user_id).single().execute()
    if not tokens_result.data:
        return {"statusCode": 400, "body": json.dumps({"error": "Garmin not connected"})}

    # Decrypt and load tokens
    from cryptography.fernet import Fernet
    fernet = Fernet(os.environ["GARMIN_ENCRYPTION_KEY"].encode())
    tokens_data = json.loads(fernet.decrypt(tokens_result.data["tokens_encrypted"].encode()).decode())
    garth.client.loads(tokens_data["tokens"])

    # Get recent strength activities
    activities = garth.connectapi(
        "/activitylist-service/activities/search/activities?activityType=strength_training&limit=20"
    )

    synced_count = 0

    for activity in activities:
        garmin_id = str(activity.get("activityId"))

        # Check if already synced
        existing = supabase.table("activities").select("id").eq("garmin_activity_id", garmin_id).execute()
        if existing.data:
            continue

        # Get exercise details
        exercises = garth.connectapi(f"/activity-service/activity/{garmin_id}/exerciseSets")

        exercise_data = [
            {
                "name": ex.get("exerciseName", "Unknown"),
                "set_number": ex.get("setOrder", 0),
                "reps": ex.get("reps"),
                "weight_kg": ex.get("weight"),
            }
            for ex in exercises
        ]

        # Insert
        supabase.table("activities").insert({
            "user_id": user_id,
            "garmin_activity_id": garmin_id,
            "name": activity.get("activityName", "Strength Training"),
            "start_time": activity.get("startTimeLocal"),
            "duration_seconds": int(activity.get("duration", 0)),
            "exercises": exercise_data,
        }).execute()

        synced_count += 1

    # Update last sync time
    supabase.table("garmin_tokens").update({
        "last_sync_at": datetime.utcnow().isoformat()
    }).eq("user_id", user_id).execute()

    return {
        "statusCode": 200,
        "body": json.dumps({"synced": synced_count})
    }
```

#### 3. Comparison API
**File**: `api/compare.py`

```python
"""Compare planned workout vs completed activity."""
import json

def handler(request):
    """Compare a workout to an activity."""
    data = request.json
    workout_id = data.get("workout_id")
    activity_id = data.get("activity_id")
    user_id = request.headers.get("x-user-id")

    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    # Get workout and activity
    workout = supabase.table("workouts").select("*").eq("id", workout_id).eq("user_id", user_id).single().execute()
    activity = supabase.table("activities").select("*").eq("id", activity_id).eq("user_id", user_id).single().execute()

    if not workout.data or not activity.data:
        return {"statusCode": 404, "body": json.dumps({"error": "Not found"})}

    planned = workout.data["exercises"]
    completed = activity.data["exercises"]

    # Group completed by exercise name
    completed_by_name = {}
    for ex in completed:
        name = ex["name"].upper().replace(" ", "_")
        if name not in completed_by_name:
            completed_by_name[name] = []
        completed_by_name[name].append(ex)

    comparisons = []
    for planned_ex in planned:
        garmin_name = planned_ex.get("garmin_name", "").upper()
        actual = completed_by_name.get(garmin_name, [])

        actual_sets = len(actual)
        actual_reps = [s.get("reps", 0) for s in actual]
        actual_weights = [s.get("weight_kg") for s in actual if s.get("weight_kg")]

        adherence = min(100, (actual_sets / planned_ex["sets"]) * 100) if planned_ex["sets"] > 0 else 100

        comparisons.append({
            "exercise": planned_ex["name"],
            "planned_sets": planned_ex["sets"],
            "planned_reps": planned_ex["reps"],
            "planned_weight": planned_ex.get("weight_lbs"),
            "actual_sets": actual_sets,
            "actual_reps_avg": sum(actual_reps) / len(actual_reps) if actual_reps else 0,
            "actual_weight_avg_lbs": round(sum(actual_weights) / len(actual_weights) * 2.205, 1) if actual_weights else None,
            "adherence_pct": round(adherence, 1)
        })

    overall = sum(c["adherence_pct"] for c in comparisons) / len(comparisons) if comparisons else 0

    return {
        "statusCode": 200,
        "body": json.dumps({
            "workout_name": workout.data["name"],
            "activity_name": activity.data["name"],
            "overall_adherence_pct": round(overall, 1),
            "exercises": comparisons
        })
    }
```

### Success Criteria:

#### Automated Verification:
- [ ] Activities table exists with RLS
- [ ] `/api/garmin-sync` syncs activities
- [ ] `/api/compare` returns comparison data

#### Manual Verification:
- [ ] After workout, sync pulls completed data
- [ ] Comparison shows planned vs actual
- [ ] Adherence percentages are correct

**Implementation Note**: Pause here for manual testing before Phase 5.

---

## Phase 5: Gemini Chatbot

### Overview
Add a conversational interface for workout planning and analysis. Sidebar chat + full-page mode.

### Changes Required:

#### 1. Chat Messages Table
**File**: `supabase/migrations/005_chat.sql`

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own messages"
    ON chat_messages FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_chat_user ON chat_messages(user_id, created_at DESC);
```

#### 2. Chat API
**File**: `api/chat.py`

```python
"""Gemini chat for workout planning."""
import os
import json
import httpx

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

SYSTEM_PROMPT = """You are a helpful strength training coach assistant. You help users:
- Plan their workouts based on their goals and schedule
- Analyze completed workout data
- Provide form tips and training advice
- Suggest progressions and deloads

When the user wants to create a workout, output it in this format so the app can parse it:
```workout
Workout Name
Exercise 1 SetsxReps @ Weight
Exercise 2 SetsxReps @ Weight
...
```

Keep responses concise and actionable. Be encouraging but honest.
"""

def handler(request):
    """Handle chat messages."""
    if request.method != "POST":
        return {"statusCode": 405, "body": "Method not allowed"}

    data = request.json
    user_message = data.get("message", "")
    history = data.get("history", [])
    user_id = request.headers.get("x-user-id")

    # Get user's recent workout history for context
    from supabase import create_client
    supabase = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )

    activities = supabase.table("activities").select("name, start_time, exercises").eq("user_id", user_id).order("start_time", desc=True).limit(5).execute()

    context = ""
    if activities.data:
        context = "\n\nUser's recent workouts:\n"
        for a in activities.data:
            exercises = ", ".join(set(e["name"] for e in a["exercises"][:5]))
            context += f"- {a['start_time'][:10]}: {a['name']} ({exercises})\n"

    # Build conversation
    contents = []
    for msg in history[-10:]:  # Last 10 messages
        contents.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["content"]}]
        })

    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })

    # Call Gemini
    response = httpx.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        json={
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT + context}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1000
            }
        },
        timeout=30.0
    )

    if response.status_code != 200:
        return {"statusCode": 500, "body": json.dumps({"error": "Gemini API error"})}

    result = response.json()
    reply = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

    # Save messages to database
    supabase.table("chat_messages").insert([
        {"user_id": user_id, "role": "user", "content": user_message},
        {"user_id": user_id, "role": "assistant", "content": reply}
    ]).execute()

    # Check if response contains a workout
    workout_match = None
    if "```workout" in reply:
        try:
            workout_text = reply.split("```workout")[1].split("```")[0].strip()
            workout_match = workout_text
        except:
            pass

    return {
        "statusCode": 200,
        "body": json.dumps({
            "reply": reply,
            "workout": workout_match
        })
    }
```

#### 3. Chat UI Component
**File**: `src/components/chat.tsx`

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatProps = {
  onWorkoutDetected?: (workout: string) => void
  className?: string
}

export function Chat({ onWorkoutDetected, className }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        history: messages
      }),
    })

    const data = await res.json()
    setLoading(false)

    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

    if (data.workout && onWorkoutDetected) {
      onWorkoutDetected(data.workout)
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-slate-400 text-center py-8">
            <p>Hi! I'm your workout planning assistant.</p>
            <p className="text-sm mt-2">
              Ask me to plan a workout, analyze your progress, or give training advice.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4">
            <div className="inline-block p-3 rounded-lg bg-slate-100">
              <span className="animate-pulse">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </ScrollArea>

      <div className="p-4 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about workouts..."
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading}>
          Send
        </Button>
      </div>
    </div>
  )
}
```

#### 4. Dashboard with Chat Sidebar
**File**: `src/app/dashboard/page.tsx` (updated)

```tsx
// Add Chat import and sidebar toggle
import { Chat } from '@/components/chat'

// In the component:
const [showChat, setShowChat] = useState(false)

// Add to layout:
<div className="flex h-screen">
  <main className={`flex-1 ${showChat ? 'pr-96' : ''}`}>
    {/* existing dashboard content */}
  </main>

  {showChat && (
    <aside className="fixed right-0 top-0 w-96 h-screen border-l bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold">Workout Assistant</h2>
        <Button variant="ghost" size="sm" onClick={() => setShowChat(false)}>
          ✕
        </Button>
      </div>
      <Chat
        className="h-[calc(100vh-60px)]"
        onWorkoutDetected={(workout) => {
          // Navigate to workout creator with pre-filled text
          router.push(`/workout/new?prefill=${encodeURIComponent(workout)}`)
        }}
      />
    </aside>
  )}

  {!showChat && (
    <button
      onClick={() => setShowChat(true)}
      className="fixed right-4 bottom-4 bg-blue-600 text-white p-4 rounded-full shadow-lg"
    >
      💬
    </button>
  )}
</div>
```

### Success Criteria:

#### Automated Verification:
- [ ] `/api/chat` returns response
- [ ] Chat messages are saved to database
- [ ] Workout detection extracts `workout` blocks

#### Manual Verification:
- [ ] Chat sidebar opens/closes
- [ ] Conversation flows naturally
- [ ] "Plan me a push day" returns workout in parseable format
- [ ] Clicking detected workout pre-fills creator page

**Implementation Note**: Pause here for manual testing before Phase 6.

---

## Phase 6: PWA + Mobile Responsive

### Overview
Make the app installable as PWA, ensure mobile-responsive design.

### Changes Required:

#### 1. PWA Configuration
**File**: `next.config.js`

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // existing config
})
```

**File**: `public/manifest.json`

```json
{
  "name": "Garmin Workout Sync",
  "short_name": "GarminSync",
  "description": "Plan and sync strength workouts with Garmin",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 2. Mobile Responsive Updates
All pages need these Tailwind responsive adjustments:
- `container mx-auto px-4` for padding
- `grid md:grid-cols-2` for card layouts
- `text-xl md:text-2xl` for headings
- `hidden md:block` for sidebar on mobile
- Bottom sheet for chat on mobile instead of sidebar

#### 3. Install Prompt Component
**File**: `src/components/install-prompt.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    })
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') {
      setShowPrompt(false)
    }
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border shadow-lg rounded-lg p-4">
      <p className="font-medium mb-2">Install App</p>
      <p className="text-sm text-slate-600 mb-3">
        Add to home screen for the best experience
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleInstall}>Install</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)}>
          Not now
        </Button>
      </div>
    </div>
  )
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `manifest.json` is served correctly
- [ ] Service worker registers in production build
- [ ] Lighthouse PWA score > 90

#### Manual Verification:
- [ ] App is installable on iOS Safari (Add to Home Screen)
- [ ] App is installable on Android Chrome
- [ ] All pages work on mobile viewport (375px width)
- [ ] Chat works as bottom sheet on mobile
- [ ] Touch interactions feel native

---

## Dependencies

```json
// package.json additions
{
  "dependencies": {
    "@supabase/ssr": "^0.1.0",
    "@supabase/supabase-js": "^2.39.0",
    "next-pwa": "^5.6.0"
  }
}
```

```
# Python requirements
garth>=0.4.0
httpx>=0.26.0
cryptography>=41.0.0
supabase>=2.0.0
```

## Environment Variables

```
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GARMIN_ENCRYPTION_KEY=  # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy
5. Set up Supabase project, run migrations
6. Enable Google OAuth in Supabase (optional)

## References

- Existing code: `src/main.py`, `src/garmin_client.py`, `src/schemas.py`
- Continuity ledger: `thoughts/ledgers/CONTINUITY_CLAUDE-garmin-sync.md`
- Garmin workout schema: Ledger lines 47-77
