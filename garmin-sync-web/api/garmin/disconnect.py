"""Disconnect Garmin account."""
import os
import json
from http.server import BaseHTTPRequestHandler

from supabase import create_client


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
        self.send_header("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_POST(self):
        """Disconnect Garmin account."""
        self._handle_disconnect()

    def do_DELETE(self):
        """Disconnect Garmin account."""
        self._handle_disconnect()

    def _handle_disconnect(self):
        """Handle disconnect logic."""
        # Get user ID from auth header
        auth_header = self.headers.get("Authorization", "")
        user_id = get_user_id_from_token(auth_header)

        if not user_id:
            self.send_error_response(401, "Not authenticated")
            return

        try:
            supabase = get_supabase()

            # Delete garmin tokens
            supabase.table("garmin_tokens").delete().eq("user_id", user_id).execute()

            # Update profile
            supabase.table("profiles").update({
                "garmin_connected": False
            }).eq("id", user_id).execute()

            self.send_json_response({"success": True})

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
        self.send_json_response({"error": message}, status)
