# Debug Report: "Not authenticated" Error on Push Workout
Generated: 2026-01-19 15:00 EST

## Symptom
User gets "Not authenticated" error when trying to push a workout to Garmin.

## Investigation Steps

1. Traced the push workout flow from frontend to backend
2. Identified two separate authentication systems in use
3. Found the root cause: disconnected authentication chains

## Evidence

### Finding 1: Frontend Authentication (Works)
- **Location:** `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/workout/new/page.tsx` (lines 179-193)
- **Observation:** Frontend correctly sends Supabase Bearer token in Authorization header
- **Relevance:** This part is working correctly

```typescript
const { data: { session } } = await supabase.auth.getSession()
const res = await fetch('/api/garmin/push-workout', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
})
```

### Finding 2: Next.js API Route Checks Supabase Auth (Works)
- **Location:** `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/api/garmin/push-workout/route.ts` (lines 24-41)
- **Observation:** Route correctly verifies Supabase user and checks for garmin_tokens record
- **Relevance:** This authentication check passes

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Also checks garmin_tokens table
```

### Finding 3: Next.js Route Calls FastAPI Without Auth
- **Location:** `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/api/garmin/push-workout/route.ts` (lines 66-70)
- **Observation:** The route calls the Python FastAPI server with NO authentication headers
- **Relevance:** THIS IS THE PROBLEM

```typescript
const response = await fetch(`${PYTHON_API_URL}/api/workouts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // No auth header!
  body: JSON.stringify(fastApiPayload),
})
```

### Finding 4: FastAPI Checks Authentication via Local Token File
- **Location:** `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/src/main.py` (lines 73-77) and `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/src/garmin_client.py` (lines 29-46)
- **Observation:** FastAPI's `/api/workouts` endpoint checks `garmin_client.is_authenticated` which looks for tokens on the LOCAL filesystem at `~/.garmin-sync/tokens`
- **Relevance:** This token file exists on your dev machine but NOT on the Render server

```python
# main.py
@app.post("/api/workouts")
async def create_workout(workout: WorkoutInput) -> dict:
    if not garmin_client.is_authenticated:  # <-- Fails here
        raise HTTPException(status_code=401, detail="Not authenticated")

# garmin_client.py
TOKEN_DIR = Path.home() / ".garmin-sync"

def load_tokens(self) -> bool:
    token_path = TOKEN_DIR / "tokens"
    if token_path.exists():  # <-- File doesn't exist on Render
        garth.resume(token_path)
        return True
    return False
```

## Root Cause Analysis

**There are TWO parallel authentication implementations that are not connected:**

1. **Vercel/Supabase auth flow** (`garmin-sync-web/api/garmin.py`):
   - User logs in with Supabase
   - Garmin credentials are stored ENCRYPTED in Supabase `garmin_tokens` table
   - Has decryption logic to reload tokens

2. **Render/FastAPI auth flow** (`src/main.py` + `src/garmin_client.py`):
   - Expects local filesystem tokens at `~/.garmin-sync/tokens`
   - Has its own login endpoint that saves tokens locally
   - No connection to Supabase at all

The Next.js route (`/api/garmin/push-workout/route.ts`) calls the FastAPI server, but FastAPI has no access to:
- The Supabase-stored Garmin tokens
- Any way to identify which user is making the request

**Confidence:** HIGH

**Alternative hypotheses:** None - the code clearly shows the disconnect.

## Recommended Fix

There are two approaches:

### Option A: Make Next.js Route Use Supabase Tokens Directly (Recommended)
Instead of calling FastAPI, the Next.js route should:
1. Retrieve encrypted Garmin tokens from Supabase
2. Decrypt them
3. Use garth directly to push to Garmin

**Files to modify:**
- `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/api/garmin/push-workout/route.ts`
  - Fetch tokens from `garmin_tokens` table
  - Decrypt using `GARMIN_ENCRYPTION_KEY`
  - Call garth API directly

**Problem:** Next.js (TypeScript) would need a garth equivalent or make HTTP calls to Garmin directly.

### Option B: Pass Garmin Tokens to FastAPI (Also Works)
1. Next.js route fetches and decrypts Garmin tokens from Supabase
2. Passes tokens to FastAPI in the request body or a header
3. FastAPI loads tokens into garth and makes the API call

**Files to modify:**
- `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/api/garmin/push-workout/route.ts` (line 66-70)
  - Add token retrieval from Supabase
  - Include tokens in request to FastAPI

- `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/src/main.py` (line 73)
  - Accept tokens in request body
  - Load tokens into garth session

### Option C: Use Vercel Python Serverless (Already Exists!)

**There's already a working Vercel serverless implementation!**

- **Location:** `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/api/garmin.py`
- This file has `handle_push_workout()` that:
  - Gets user from Supabase auth
  - Retrieves encrypted tokens from DB
  - Decrypts them
  - Calls garth to push workout

The issue is that the Next.js route is calling the RENDER FastAPI instead of using the VERCEL Python serverless function.

**Files to modify:**
- `/Users/densign/Documents/Coding-Projects/claude-cloud/garmin-sync/garmin-sync-web/src/app/api/garmin/push-workout/route.ts`
  - Remove the call to FastAPI entirely
  - Have the Next.js route redirect to or call the Vercel `/api/garmin` endpoint instead

Or simply:
- Delete the Next.js route
- Have the frontend call `/api/garmin/push-workout` which routes to the Python handler

## Summary

The architecture has a working Vercel Python serverless function (`api/garmin.py`) that properly handles Garmin auth via Supabase, but the Next.js route bypasses it and calls a Render FastAPI server that has no knowledge of the stored tokens. The fix is to use the Vercel Python function instead of the FastAPI route for the push-workout operation.

## Prevention

1. Consolidate to a single auth/token storage mechanism
2. Remove the FastAPI Render deployment if not needed
3. Use the Vercel Python serverless function for all Garmin API calls
