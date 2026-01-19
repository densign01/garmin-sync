"""Garmin Connect client for workout sync."""
from pathlib import Path
from typing import Any

import garth


TOKEN_DIR = Path.home() / ".garmin-sync"
TOKEN_DIR.mkdir(exist_ok=True)


class GarminClient:
    """Client for Garmin Connect API using garth for auth."""

    def __init__(self):
        self._authenticated = False

    def login(self, email: str, password: str) -> bool:
        """Login to Garmin Connect and save tokens."""
        try:
            garth.login(email, password)
            garth.save(TOKEN_DIR / "tokens")
            self._authenticated = True
            return True
        except Exception as e:
            print(f"Login failed: {e}")
            return False

    def load_tokens(self) -> bool:
        """Load saved tokens from disk."""
        token_path = TOKEN_DIR / "tokens"
        if token_path.exists():
            try:
                garth.resume(token_path)
                self._authenticated = True
                return True
            except Exception:
                return False
        return False

    @property
    def is_authenticated(self) -> bool:
        """Check if we have valid auth."""
        if not self._authenticated:
            return self.load_tokens()
        return self._authenticated

    def create_workout(self, workout_data: dict[str, Any]) -> dict[str, Any]:
        """Push a workout to Garmin Connect.

        Uses the same API endpoint that Garmin Connect web uses.
        """
        if not self.is_authenticated:
            raise RuntimeError("Not authenticated")

        return garth.connectapi(
            "/workout-service/workout",
            method="POST",
            json=workout_data,
        )

    def get_workouts(self, limit: int = 20) -> list[dict[str, Any]]:
        """Get list of workouts from Garmin Connect."""
        if not self.is_authenticated:
            raise RuntimeError("Not authenticated")

        return garth.connectapi(
            f"/workout-service/workouts?start=0&limit={limit}",
        )

    def get_activities(self, limit: int = 20, activity_type: str | None = None) -> list[dict[str, Any]]:
        """Get list of completed activities."""
        if not self.is_authenticated:
            raise RuntimeError("Not authenticated")

        # Get all recent activities, filter by type if specified
        activities = garth.connectapi(
            f"/activitylist-service/activities/search/activities?limit={limit}",
        )

        if activity_type and activities:
            # Filter to strength training activities
            activities = [
                a for a in activities
                if a.get("activityType", {}).get("typeKey") == activity_type
            ]

        return activities

    def get_activity_details(self, activity_id: int) -> dict[str, Any]:
        """Get detailed activity data including sets/reps."""
        if not self.is_authenticated:
            raise RuntimeError("Not authenticated")

        return garth.connectapi(
            f"/activity-service/activity/{activity_id}",
        )

    def get_activity_exercises(self, activity_id: int) -> list[dict[str, Any]]:
        """Get exercise details from a strength activity."""
        if not self.is_authenticated:
            raise RuntimeError("Not authenticated")

        return garth.connectapi(
            f"/activity-service/activity/{activity_id}/exerciseSets",
        )


# Singleton instance
garmin_client = GarminClient()
