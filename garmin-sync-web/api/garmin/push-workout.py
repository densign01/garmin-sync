"""Push workout to Garmin Connect."""
import os
import json
import base64
from http.server import BaseHTTPRequestHandler

import garth
from supabase import create_client


def decrypt_tokens(encrypted: str) -> str:
    """Decrypt tokens from storage."""
    decoded = base64.b64decode(encrypted.encode()).decode()
    # Remove key prefix (format: "keyprefix:tokens")
    return decoded.split(":", 1)[1]


def get_supabase():
    """Get Supabase client with service role."""
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )


def get_user_id_from_token(auth_header: str) -> str | None:
    """Extract user ID from Supabase JWT."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "")
    supabase = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    )

    try:
        user = supabase.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception:
        return None


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_POST(self):
        """Push a workout to Garmin Connect."""
        # Get user ID from auth header
        auth_header = self.headers.get("Authorization", "")
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            self.send_error_response(401, "Not authenticated")
            return

        # Read body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"
        data = json.loads(body)

        workout_json = data.get("workout")
        if not workout_json:
            self.send_error_response(400, "Workout data required")
            return

        try:
            supabase = get_supabase()

            # Get user's tokens
            result = supabase.table("garmin_tokens").select("tokens_encrypted").eq("user_id", user_id).single().execute()

            if not result.data:
                self.send_error_response(400, "Garmin not connected")
                return

            tokens_encrypted = result.data["tokens_encrypted"]

            # Check for placeholder token
            if tokens_encrypted == "local-dev-mode":
                self.send_error_response(400, "Please disconnect and reconnect Garmin to refresh credentials")
                return

            # Decrypt and load tokens
            tokens_str = decrypt_tokens(tokens_encrypted)
            garth.client.loads(tokens_str)

            # Push workout
            api_result = garth.connectapi(
                "/workout-service/workout",
                method="POST",
                json=workout_json,
            )

            self.send_json_response({
                "success": True,
                "workoutId": api_result.get("workoutId"),
                "workoutName": api_result.get("workoutName"),
            })

        except Exception as e:
            self.send_error_response(500, str(e))

    def send_json_response(self, data: dict, status: int = 200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, status: int, message: str):
        """Send error response."""
        self.send_json_response({"error": message, "detail": message}, status)
