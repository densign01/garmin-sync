"""Push Monday Jan 19 - Heavy Squat & Bench workout."""
import json
from pathlib import Path

import garth

TOKEN_DIR = Path.home() / ".garmin-sync"
garth.resume(TOKEN_DIR / "tokens")


def exercise_step(order, category, name, reps, weight=None, rest_seconds=90):
    """Create an exercise step with rest."""
    steps = []

    # Exercise
    ex = {
        "type": "ExecutableStepDTO",
        "stepOrder": order,
        "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
        "endCondition": {"conditionTypeId": 10, "conditionTypeKey": "reps"},
        "endConditionValue": float(reps),
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
        "category": category,
        "exerciseName": name,
        "weightUnit": {"unitId": 9, "unitKey": "pound", "factor": 453.59237},
        "strokeType": {"strokeTypeId": 0},
        "equipmentType": {"equipmentTypeId": 0},
    }
    if weight:
        ex["weightValue"] = float(weight)
    steps.append(ex)

    # Rest
    steps.append({
        "type": "ExecutableStepDTO",
        "stepOrder": order + 1,
        "stepType": {"stepTypeId": 5, "stepTypeKey": "rest"},
        "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
        "endConditionValue": float(rest_seconds),
        "strokeType": {"strokeTypeId": 0},
        "equipmentType": {"equipmentTypeId": 0},
    })

    return steps


def repeat_group(order, iterations, exercise_steps):
    """Wrap exercise steps in a repeat group."""
    return {
        "type": "RepeatGroupDTO",
        "stepOrder": order,
        "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat"},
        "numberOfIterations": iterations,
        "smartRepeat": False,
        "workoutSteps": exercise_steps,
    }


# Build workout steps
steps = []
step_order = 1

# 1. Movement Prep
# Bird Dogs: 2x10
steps.append(repeat_group(step_order, 2, exercise_step(step_order + 1, "CORE", "BIRD_DOG", 10, rest_seconds=30)))
step_order += 4

# 2. Main Lifts

# Barbell Squat warmup: 45x10, 135x5, 185x3
steps.append(repeat_group(step_order, 1, exercise_step(step_order + 1, "SQUAT", "BARBELL_BACK_SQUAT", 10, 45, rest_seconds=60)))
step_order += 4
steps.append(repeat_group(step_order, 1, exercise_step(step_order + 1, "SQUAT", "BARBELL_BACK_SQUAT", 5, 135, rest_seconds=60)))
step_order += 4
steps.append(repeat_group(step_order, 1, exercise_step(step_order + 1, "SQUAT", "BARBELL_BACK_SQUAT", 3, 185, rest_seconds=90)))
step_order += 4

# Barbell Squat working: 3x6 @ 210
steps.append(repeat_group(step_order, 3, exercise_step(step_order + 1, "SQUAT", "BARBELL_BACK_SQUAT", 6, 210, rest_seconds=180)))
step_order += 4

# Bench Press warmup: 135x5, 165x3
steps.append(repeat_group(step_order, 1, exercise_step(step_order + 1, "BENCH_PRESS", "BARBELL_BENCH_PRESS", 5, 135, rest_seconds=60)))
step_order += 4
steps.append(repeat_group(step_order, 1, exercise_step(step_order + 1, "BENCH_PRESS", "BARBELL_BENCH_PRESS", 3, 165, rest_seconds=90)))
step_order += 4

# Bench Press working: 3x5 @ 195
steps.append(repeat_group(step_order, 3, exercise_step(step_order + 1, "BENCH_PRESS", "BARBELL_BENCH_PRESS", 5, 195, rest_seconds=180)))
step_order += 4

# 3. Secondary Press & Posture

# Standing Barbell OHP: 3x8 @ 85
steps.append(repeat_group(step_order, 3, exercise_step(step_order + 1, "SHOULDER_PRESS", "OVERHEAD_BARBELL_PRESS", 8, 85, rest_seconds=90)))
step_order += 4

# 1-Arm DB Row: 3x12 @ 50 (per side = 6 sets total, alternating)
steps.append(repeat_group(step_order, 6, exercise_step(step_order + 1, "ROW", "ONE_ARM_DUMBBELL_ROW", 12, 50, rest_seconds=60)))
step_order += 4

# 4. Finishers

# Hammer Curls: 3x12 @ 35 per hand
steps.append(repeat_group(step_order, 3, exercise_step(step_order + 1, "CURL", "HAMMER_CURL", 12, 35, rest_seconds=60)))
step_order += 4

# Farmer's Walk: 2x "reps" (will show as lap button press)
farmer_steps = [
    {
        "type": "ExecutableStepDTO",
        "stepOrder": step_order + 1,
        "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
        "endCondition": {"conditionTypeId": 1, "conditionTypeKey": "lap.button"},
        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
        "category": "CARRY",
        "exerciseName": "FARMERS_WALK",
        "weightValue": 55.0,  # per hand
        "weightUnit": {"unitId": 9, "unitKey": "pound", "factor": 453.59237},
        "strokeType": {"strokeTypeId": 0},
        "equipmentType": {"equipmentTypeId": 0},
    },
    {
        "type": "ExecutableStepDTO",
        "stepOrder": step_order + 2,
        "stepType": {"stepTypeId": 5, "stepTypeKey": "rest"},
        "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
        "endConditionValue": 90.0,
        "strokeType": {"strokeTypeId": 0},
        "equipmentType": {"equipmentTypeId": 0},
    },
]
steps.append(repeat_group(step_order, 2, farmer_steps))


workout = {
    "workoutName": "Mon Jan 19 - Heavy Squat & Bench",
    "description": "Day 1: Heavy Squat & Bench. Main lifts with warmups, secondary press work, and finishers.",
    "sportType": {
        "sportTypeId": 5,
        "sportTypeKey": "strength_training",
    },
    "workoutSegments": [
        {
            "segmentOrder": 1,
            "sportType": {
                "sportTypeId": 5,
                "sportTypeKey": "strength_training",
            },
            "workoutSteps": steps,
        }
    ],
}

print("Pushing Monday workout to Garmin Connect...")
print()
print("Exercises:")
print("  - Bird Dogs: 2x10")
print("  - Squat warmup: 45x10, 135x5, 185x3")
print("  - Squat working: 3x6 @ 210 lbs")
print("  - Bench warmup: 135x5, 165x3")
print("  - Bench working: 3x5 @ 195 lbs")
print("  - OHP: 3x8 @ 85 lbs")
print("  - 1-Arm DB Row: 6x12 @ 50 lbs (3 per side)")
print("  - Hammer Curls: 3x12 @ 35 lbs")
print("  - Farmer's Walk: 2 sets @ 55 lbs/hand")
print()

try:
    result = garth.connectapi(
        "/workout-service/workout",
        method="POST",
        json=workout,
    )
    print("SUCCESS!")
    print(f"Workout ID: {result.get('workoutId')}")
    print(f"Workout Name: {result.get('workoutName')}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
