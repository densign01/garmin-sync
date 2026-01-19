-- Store completed activities synced from Garmin
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    garmin_activity_id TEXT UNIQUE NOT NULL,
    activity_type TEXT NOT NULL,  -- strength_training, cardio, etc.
    name TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    duration_seconds INTEGER,
    calories INTEGER,
    exercises JSONB,  -- Actual performed exercises with sets/reps/weight
    raw_data JSONB,   -- Full Garmin response for debugging
    linked_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own activities
CREATE POLICY "Users can view own activities"
    ON activities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
    ON activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
    ON activities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
    ON activities FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_started ON activities(started_at DESC);
CREATE INDEX idx_activities_garmin_id ON activities(garmin_activity_id);
CREATE INDEX idx_activities_linked_workout ON activities(linked_workout_id);
