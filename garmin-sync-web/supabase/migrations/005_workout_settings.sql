-- Add workout settings columns to profiles table
-- These persist user preferences for the workout creation page

-- Rest time between sets for major compound lifts (squat, bench, deadlift, etc.)
ALTER TABLE profiles
ADD COLUMN major_lift_rest_seconds INTEGER DEFAULT 90;

-- Rest time between sets for accessory/isolation exercises
ALTER TABLE profiles
ADD COLUMN minor_lift_rest_seconds INTEGER DEFAULT 60;

-- How to handle unilateral exercises (one side at a time):
-- 'double_sets' = 3 sets becomes 6 sets (3 per side)
-- 'double_reps' = 8 reps becomes 16 reps (8 per side)
ALTER TABLE profiles
ADD COLUMN unilateral_mode TEXT DEFAULT 'double_sets';

-- Add constraint to ensure valid unilateral mode values
ALTER TABLE profiles
ADD CONSTRAINT valid_unilateral_mode
CHECK (unilateral_mode IN ('double_sets', 'double_reps'));
