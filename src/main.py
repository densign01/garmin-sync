"""FastAPI app for Garmin workout sync."""
import os
from pathlib import Path

import garth
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .garmin_client import garmin_client
from .schemas import (
    EXERCISE_CATEGORIES,
    CompletedActivity,
    CompletedSet,
    WorkoutInput,
    build_workout_json,
)

load_dotenv()

# Encryption key must be set - no fallback for security
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.environ.get("GARMIN_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise RuntimeError("GARMIN_ENCRYPTION_KEY environment variable is required")

# Validate key format (must be 32 url-safe base64-encoded bytes)
try:
    _fernet = Fernet(ENCRYPTION_KEY.encode())
except Exception as e:
    raise RuntimeError(f"Invalid GARMIN_ENCRYPTION_KEY format: {e}. Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")

app = FastAPI(title="Garmin Sync", description="Sync strength workouts with Garmin Connect")

# Restrict CORS to known origins only
ALLOWED_ORIGINS = [
    "https://garmin-sync.vercel.app",
    "http://localhost:3000",  # Local development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthStatus(BaseModel):
    authenticated: bool


class LoginResponse(BaseModel):
    authenticated: bool
    tokens_encrypted: str | None = None


def encrypt_tokens(tokens_str: str) -> str:
    """Encrypt tokens using Fernet symmetric encryption."""
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.encrypt(tokens_str.encode()).decode()


def decrypt_tokens(encrypted: str) -> str:
    """Decrypt tokens using Fernet symmetric encryption."""
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted.encode()).decode()


@app.get("/")
async def root():
    """Serve the frontend."""
    return FileResponse(Path(__file__).parent.parent / "static" / "index.html")


# Mount static files
app.mount("/static", StaticFiles(directory=Path(__file__).parent.parent / "static"), name="static")


@app.get("/api/auth/status")
async def auth_status() -> AuthStatus:
    """Check if authenticated with Garmin Connect."""
    return AuthStatus(authenticated=garmin_client.is_authenticated)


@app.post("/api/auth/login")
async def login(request: LoginRequest) -> LoginResponse:
    """Login to Garmin Connect and return encrypted tokens."""
    try:
        garth.login(request.email, request.password)
        tokens_str = garth.client.dumps()
        encrypted = encrypt_tokens(tokens_str)
        garmin_client._authenticated = True
        return LoginResponse(authenticated=True, tokens_encrypted=encrypted)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")


class PushWorkoutRequest(BaseModel):
    tokens_encrypted: str
    workout: dict


@app.post("/api/workouts/push")
async def push_workout_with_tokens(request: PushWorkoutRequest) -> dict:
    """Push workout using provided encrypted tokens."""
    try:
        # Decrypt and load tokens
        tokens_str = decrypt_tokens(request.tokens_encrypted)
        garth.client.loads(tokens_str)

        # Push workout
        result = garth.connectapi(
            "/workout-service/workout",
            method="POST",
            json=request.workout,
        )

        return {
            "success": True,
            "workoutId": result.get("workoutId"),
            "workoutName": result.get("workoutName"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/exercises")
async def get_exercises() -> dict[str, list[str]]:
    """Get available exercise categories and names."""
    return EXERCISE_CATEGORIES


@app.post("/api/workouts")
async def create_workout(workout: WorkoutInput) -> dict:
    """Create a new workout in Garmin Connect."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    workout_json = build_workout_json(workout)

    try:
        result = garmin_client.create_workout(workout_json)
        return {
            "success": True,
            "workoutId": result.get("workoutId"),
            "workoutName": result.get("workoutName"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workouts")
async def list_workouts(limit: int = 20) -> list[dict]:
    """List workouts from Garmin Connect."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        return garmin_client.get_workouts(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/activities")
async def list_activities(limit: int = 20, activity_type: str | None = "strength_training") -> list[dict]:
    """List completed activities, optionally filtered by type."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        return garmin_client.get_activities(limit, activity_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in request: {e}")


@app.get("/api/activities/{activity_id}")
async def get_activity(activity_id: int) -> CompletedActivity:
    """Get details of a completed activity including exercise data."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        details = garmin_client.get_activity_details(activity_id)
        exercises_data = garmin_client.get_activity_exercises(activity_id)

        sets = []
        for ex in exercises_data:
            sets.append(
                CompletedSet(
                    exercise_name=ex.get("exerciseName", "Unknown"),
                    set_number=ex.get("setOrder", 0),
                    reps=ex.get("reps"),
                    weight_kg=ex.get("weight"),
                    duration_seconds=ex.get("duration"),
                )
            )

        return CompletedActivity(
            activity_id=activity_id,
            name=details.get("activityName", ""),
            start_time=details.get("startTimeLocal", ""),
            duration_seconds=int(details.get("duration", 0)),
            exercises=sets,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/activities/{activity_id}/raw")
async def get_activity_raw(activity_id: int) -> dict:
    """Debug: Get raw activity data from Garmin."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        details = garmin_client.get_activity_details(activity_id)
        exercises = garmin_client.get_activity_exercises(activity_id)
        return {
            "details_type": str(type(details)),
            "details": details,
            "exercises_type": str(type(exercises)),
            "exercises": exercises,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/activities/{activity_id}/export")
async def export_activity(activity_id: int) -> dict:
    """Export activity data for Gemini analysis."""
    if not garmin_client.is_authenticated:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        details = garmin_client.get_activity_details(activity_id)
        exercises_response = garmin_client.get_activity_exercises(activity_id)

        # Handle case where API returns string error
        if isinstance(details, str):
            raise HTTPException(status_code=500, detail=f"Garmin API error: {details}")

        # Extract exerciseSets from response (it's nested in a dict)
        if isinstance(exercises_response, dict):
            exercises_data = exercises_response.get("exerciseSets", [])
        elif isinstance(exercises_response, list):
            exercises_data = exercises_response
        else:
            exercises_data = []

        # Get summary data
        summary = details.get("summaryDTO", {})

        # Format for easy Gemini consumption
        export = {
            "workout_name": details.get("activityName"),
            "date": summary.get("startTimeLocal"),
            "duration_minutes": round(summary.get("duration", 0) / 60, 1),
            "total_sets": summary.get("totalSets", 0),
            "total_reps": summary.get("totalExerciseReps", 0),
            "exercises": [],
        }

        # Group sets by exercise
        current_exercise = None
        for ex_set in exercises_data:
            # Skip REST sets
            if ex_set.get("setType") == "REST":
                continue

            # Get exercise info from nested exercises array
            ex_info = ex_set.get("exercises", [{}])[0] if ex_set.get("exercises") else {}
            category = ex_info.get("category", "UNKNOWN")
            name = ex_info.get("name") or category  # Use name if available, else category

            # Convert weight from grams to lbs (Garmin stores in grams)
            weight_grams = ex_set.get("weight", 0) or 0
            weight_lbs = round(weight_grams / 453.592, 1) if weight_grams else None

            if current_exercise is None or current_exercise["name"] != name:
                if current_exercise:
                    export["exercises"].append(current_exercise)
                current_exercise = {
                    "name": name,
                    "category": category,
                    "sets": [],
                }

            current_exercise["sets"].append({
                "reps": ex_set.get("repetitionCount"),
                "weight_lbs": weight_lbs,
                "duration_seconds": round(ex_set.get("duration", 0)) if ex_set.get("duration") else None,
            })

        if current_exercise:
            export["exercises"].append(current_exercise)

        return export
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
