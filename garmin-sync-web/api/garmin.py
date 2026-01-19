"""Garmin API endpoints using garth."""
import os
import json
import base64
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import garth
from supabase import create_client

# Get encryption key from env
ENCRYPTION_KEY = os.environ.get("GARMIN_ENCRYPTION_KEY", "")

def encrypt_tokens(tokens_str: str) -> str:
    """Simple base64 encoding with key prefix for basic obfuscation.
    Note: For production, use proper Fernet encryption.
    """
    combined = f"{ENCRYPTION_KEY[:8]}:{tokens_str}"
    return base64.b64encode(combined.encode()).decode()

def decrypt_tokens(encrypted: str) -> str:
    """Decrypt tokens from storage."""
    decoded = base64.b64decode(encrypted.encode()).decode()
    # Remove key prefix
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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_POST(self):
        """Handle POST requests."""
        path = urlparse(self.path).path

        # Read body
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"
        data = json.loads(body)

        # Get user ID from auth header
        auth_header = self.headers.get("Authorization", "")
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            self.send_error_response(401, "Unauthorized")
            return

        if path == "/api/garmin" or path == "/api/garmin/login":
            self.handle_login(data, user_id)
        elif path == "/api/garmin/push-workout":
            self.handle_push_workout(data, user_id)
        else:
            self.send_error_response(404, "Not found")

    def do_GET(self):
        """Handle GET requests."""
        path = urlparse(self.path).path

        auth_header = self.headers.get("Authorization", "")
        user_id = get_user_id_from_token(auth_header)

        if path == "/api/garmin/status":
            self.handle_status(user_id)
        else:
            self.send_error_response(404, "Not found")

    def handle_login(self, data: dict, user_id: str):
        """Login to Garmin and store encrypted tokens."""
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            self.send_error_response(400, "Email and password required")
            return

        try:
            # Login to Garmin
            garth.login(email, password)
            tokens = garth.client.dumps()

            # Encrypt and store
            encrypted = encrypt_tokens(tokens)

            supabase = get_supabase()

            # Upsert garmin_tokens
            supabase.table("garmin_tokens").upsert({
                "user_id": user_id,
                "tokens_encrypted": encrypted,
                "garmin_display_name": email,
            }).execute()

            # Update profile
            supabase.table("profiles").update({
                "garmin_connected": True
            }).eq("id", user_id).execute()

            self.send_json_response({"success": True, "email": email})

        except Exception as e:
            self.send_error_response(400, str(e))

    def handle_push_workout(self, data: dict, user_id: str):
        """Push a workout to Garmin Connect."""
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

            # Decrypt and load tokens
            tokens_str = decrypt_tokens(result.data["tokens_encrypted"])
            garth.client.loads(tokens_str)

            # Push workout
            result = garth.connectapi(
                "/workout-service/workout",
                method="POST",
                json=workout_json,
            )

            self.send_json_response({
                "success": True,
                "workoutId": result.get("workoutId"),
                "workoutName": result.get("workoutName"),
            })

        except Exception as e:
            self.send_error_response(500, str(e))

    def handle_status(self, user_id: str | None):
        """Check Garmin connection status."""
        if not user_id:
            self.send_json_response({"connected": False})
            return

        try:
            supabase = get_supabase()
            result = supabase.table("garmin_tokens").select("garmin_display_name, connected_at").eq("user_id", user_id).single().execute()

            if result.data:
                self.send_json_response({
                    "connected": True,
                    "email": result.data.get("garmin_display_name"),
                    "connectedAt": result.data.get("connected_at"),
                })
            else:
                self.send_json_response({"connected": False})

        except Exception:
            self.send_json_response({"connected": False})

    def send_json_response(self, data: dict, status: int = 200):
        """Send JSON response."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, status: int, message: str):
        """Send error response."""
        self.send_json_response({"error": message}, status)
