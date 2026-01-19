"""Test pulling activities from Garmin Connect."""
import json
from pathlib import Path

import garth

# Load saved tokens
TOKEN_DIR = Path.home() / ".garmin-sync"
garth.resume(TOKEN_DIR / "tokens")

print("Fetching recent activities...")
print()

# Get activities - no filter to see all types
activities = garth.connectapi(
    "/activitylist-service/activities/search/activities?limit=30",
)

print(f"Found {len(activities)} activities:\n")

for a in activities:
    activity_type = a.get('activityType', {}).get('typeKey', 'unknown')
    name = a.get('activityName', 'Unnamed')
    date = a.get('startTimeLocal', '')[:10]
    duration = round(a.get('duration', 0) / 60, 1)
    activity_id = a.get('activityId')

    # Highlight rowing
    marker = "🚣" if 'row' in activity_type.lower() or 'row' in name.lower() else "  "

    print(f"{marker} [{date}] {name}")
    print(f"     Type: {activity_type} | Duration: {duration} min | ID: {activity_id}")
    print()
