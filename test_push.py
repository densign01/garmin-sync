"""Test pushing a workout directly with garth."""
import json
from pathlib import Path

import garth

# Load saved tokens
TOKEN_DIR = Path.home() / ".garmin-sync"
garth.resume(TOKEN_DIR / "tokens")

# Simple test workout: 3 exercises, 3 sets each
workout = {
    "workoutName": "Test Push - Delete Me",
    "description": "Testing garth workout push",
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
            "workoutSteps": [
                # Exercise 1: Barbell Bench Press - 3x10 @ 135lbs
                {
                    "type": "RepeatGroupDTO",
                    "stepOrder": 1,
                    "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat"},
                    "numberOfIterations": 3,
                    "smartRepeat": False,
                    "workoutSteps": [
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 2,
                            "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
                            "endCondition": {"conditionTypeId": 10, "conditionTypeKey": "reps"},
                            "endConditionValue": 10.0,
                            "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
                            "category": "BENCH_PRESS",
                            "exerciseName": "BARBELL_BENCH_PRESS",
                            "weightValue": 135.0,
                            "weightUnit": {"unitId": 9, "unitKey": "pound", "factor": 453.59237},
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 3,
                            "stepType": {"stepTypeId": 5, "stepTypeKey": "rest"},
                            "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
                            "endConditionValue": 90.0,
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                    ],
                },
                # Exercise 2: Barbell Squat - 3x8 @ 185lbs
                {
                    "type": "RepeatGroupDTO",
                    "stepOrder": 4,
                    "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat"},
                    "numberOfIterations": 3,
                    "smartRepeat": False,
                    "workoutSteps": [
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 5,
                            "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
                            "endCondition": {"conditionTypeId": 10, "conditionTypeKey": "reps"},
                            "endConditionValue": 8.0,
                            "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
                            "category": "SQUAT",
                            "exerciseName": "BARBELL_BACK_SQUAT",
                            "weightValue": 185.0,
                            "weightUnit": {"unitId": 9, "unitKey": "pound", "factor": 453.59237},
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 6,
                            "stepType": {"stepTypeId": 5, "stepTypeKey": "rest"},
                            "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
                            "endConditionValue": 120.0,
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                    ],
                },
                # Exercise 3: Barbell Curl - 3x12
                {
                    "type": "RepeatGroupDTO",
                    "stepOrder": 7,
                    "stepType": {"stepTypeId": 6, "stepTypeKey": "repeat"},
                    "numberOfIterations": 3,
                    "smartRepeat": False,
                    "workoutSteps": [
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 8,
                            "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
                            "endCondition": {"conditionTypeId": 10, "conditionTypeKey": "reps"},
                            "endConditionValue": 12.0,
                            "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
                            "category": "CURL",
                            "exerciseName": "BARBELL_BICEPS_CURL",
                            "weightUnit": {"unitId": 9, "unitKey": "pound", "factor": 453.59237},
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                        {
                            "type": "ExecutableStepDTO",
                            "stepOrder": 9,
                            "stepType": {"stepTypeId": 5, "stepTypeKey": "rest"},
                            "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
                            "endConditionValue": 60.0,
                            "strokeType": {"strokeTypeId": 0},
                            "equipmentType": {"equipmentTypeId": 0},
                        },
                    ],
                },
            ],
        }
    ],
}

print("Pushing workout to Garmin Connect...")
print(f"Workout: {workout['workoutName']}")
print(f"Exercises: Bench Press 3x10@135, Squat 3x8@185, Curls 3x12")
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
    print()
    print("Full response:")
    print(json.dumps(result, indent=2)[:1000])
except Exception as e:
    print(f"FAILED: {e}")
    print()
    print("Let's check what the error details are...")
    import traceback
    traceback.print_exc()
