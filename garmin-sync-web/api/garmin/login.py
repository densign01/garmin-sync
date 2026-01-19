"""Login to Garmin Connect and store encrypted tokens."""
import os
import json
import base64
from http.server import BaseHTTPRequestHandler

import garth
from supabase import create_client

# Get encryption key from env
ENCRYPTION_KEY = os.environ.get("GARMIN_ENCRYPTION_KEY", "")


def encrypt_tokens(tokens_str: str) -> str:
    """Simple base64 encoding with key prefix for basic obfuscation."""
    combined = f"{ENCRYPTION_KEY[:8]}:{tokens_str}"
    return base64.b64encode(combined.encode()).decode()


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
        """Login to Garmin and store encrypted tokens."""
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
            error_msg = str(e)
            # Check for common Garmin auth errors
            if "credentials" in error_msg.lower() or "invalid" in error_msg.lower():
                self.send_error_response(401, "Invalid Garmin credentials")
            elif "captcha" in error_msg.lower() or "locked" in error_msg.lower():
                self.send_error_response(429, "Too many login attempts. Please try again later.")
            else:
                self.send_error_response(400, error_msg)

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
