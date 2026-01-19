"""Pydantic schemas for Garmin workout data."""
from typing import Any
from pydantic import BaseModel


class ExerciseInput(BaseModel):
    """Input for a single exercise."""
    category: str  # e.g., "BENCH_PRESS", "SQUAT", "CURL"
    exercise_name: str  # e.g., "BARBELL_BENCH_PRESS", "DUMBBELL_FLYE"
    sets: int = 3
    reps: int = 10
    rest_seconds: int = 60
    weight_lbs: float | None = None  # Optional preset weight
    distance_meters: float | None = None  # For distance-based exercises (farmer's carry)


class WorkoutInput(BaseModel):
    """Input for creating a workout."""
    name: str
    description: str = ""
    exercises: list[ExerciseInput]


class CompletedSet(BaseModel):
    """A completed set from an activity."""
    exercise_name: str
    set_number: int
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: float | None = None


class CompletedActivity(BaseModel):
    """A completed strength training activity."""
    activity_id: int
    name: str
    start_time: str
    duration_seconds: int
    exercises: list[CompletedSet]


def build_workout_json(workout: WorkoutInput) -> dict[str, Any]:
    """Convert WorkoutInput to Garmin Connect workout JSON format.

    Based on reverse-engineered schema from exported workout.
    """
    steps = []
    step_order = 1

    for exercise in workout.exercises:
        # Create a repeat group for each exercise (sets x reps)
        repeat_group = {
            "type": "RepeatGroupDTO",
            "stepOrder": step_order,
            "stepType": {
                "stepTypeId": 6,
                "stepTypeKey": "repeat",
            },
            "numberOfIterations": exercise.sets,
            "workoutSteps": [],
            "smartRepeat": False,
        }
        step_order += 1

        # Exercise step - use distance for distance-based exercises, reps otherwise
        if exercise.distance_meters:
            # Distance-based exercise (farmer's carry, etc.)
            exercise_step = {
                "type": "ExecutableStepDTO",
                "stepOrder": step_order,
                "stepType": {
                    "stepTypeId": 3,
                    "stepTypeKey": "interval",
                },
                "endCondition": {
                    "conditionTypeId": 3,
                    "conditionTypeKey": "distance",
                },
                "endConditionValue": float(exercise.distance_meters),
                "targetType": {
                    "workoutTargetTypeId": 1,
                    "workoutTargetTypeKey": "no.target",
                },
                "category": exercise.category,
                "exerciseName": exercise.exercise_name,
                "strokeType": {"strokeTypeId": 0},
                "equipmentType": {"equipmentTypeId": 0},
                "weightUnit": {
                    "unitId": 9,
                    "unitKey": "pound",
                    "factor": 453.59237,
                },
            }
        else:
            # Reps-based exercise (standard)
            exercise_step = {
                "type": "ExecutableStepDTO",
                "stepOrder": step_order,
                "stepType": {
                    "stepTypeId": 3,
                    "stepTypeKey": "interval",
                },
                "endCondition": {
                    "conditionTypeId": 10,
                    "conditionTypeKey": "reps",
                },
                "endConditionValue": float(exercise.reps),
                "targetType": {
                    "workoutTargetTypeId": 1,
                    "workoutTargetTypeKey": "no.target",
                },
                "category": exercise.category,
                "exerciseName": exercise.exercise_name,
                "strokeType": {"strokeTypeId": 0},
                "equipmentType": {"equipmentTypeId": 0},
                "weightUnit": {
                    "unitId": 9,
                    "unitKey": "pound",
                    "factor": 453.59237,
                },
            }

        if exercise.weight_lbs:
            exercise_step["weightValue"] = exercise.weight_lbs

        repeat_group["workoutSteps"].append(exercise_step)
        step_order += 1

        # Rest step
        rest_step = {
            "type": "ExecutableStepDTO",
            "stepOrder": step_order,
            "stepType": {
                "stepTypeId": 5,
                "stepTypeKey": "rest",
            },
            "endCondition": {
                "conditionTypeId": 2,
                "conditionTypeKey": "time",
            },
            "endConditionValue": float(exercise.rest_seconds),
            "strokeType": {"strokeTypeId": 0},
            "equipmentType": {"equipmentTypeId": 0},
        }
        repeat_group["workoutSteps"].append(rest_step)
        step_order += 1

        steps.append(repeat_group)

    # Build the full workout structure
    workout_json = {
        "workoutName": workout.name,
        "description": workout.description,
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

    return workout_json


# Common exercise categories and names for reference
EXERCISE_CATEGORIES = {
    "BENCH_PRESS": [
        "BARBELL_BENCH_PRESS",
        "DUMBBELL_BENCH_PRESS",
        "INCLINE_DUMBBELL_BENCH_PRESS",
        "DECLINE_PUSH_UP",
        "PARTIAL_LOCKOUT",
    ],
    "SQUAT": [
        "BARBELL_BACK_SQUAT",
        "BARBELL_FRONT_SQUAT",
        "GOBLET_SQUAT",
        "DUMBBELL_SQUAT",
    ],
    "DEADLIFT": [
        "BARBELL_DEADLIFT",
        "ROMANIAN_DEADLIFT",
        "SUMO_DEADLIFT",
        "DUMBBELL_DEADLIFT",
    ],
    "ROW": [
        "BENT_OVER_ROW",
        "REVERSE_GRIP_BARBELL_ROW",
        "ONE_ARM_DUMBBELL_ROW",
        "SEATED_CABLE_ROW",
    ],
    "SHOULDER_PRESS": [
        "OVERHEAD_BARBELL_PRESS",
        "ARNOLD_PRESS",
        "DUMBBELL_SHOULDER_PRESS",
        "SMITH_MACHINE_OVERHEAD_PRESS",
    ],
    "CURL": [
        "BARBELL_BICEPS_CURL",
        "DUMBBELL_BICEPS_CURL",
        "HAMMER_CURL",
        "CONCENTRATION_CURL",
    ],
    "TRICEPS_EXTENSION": [
        "TRICEPS_PRESSDOWN",
        "LYING_TRICEPS_EXTENSION",
        "OVERHEAD_TRICEPS_EXTENSION",
        "TRICEPS_DIP",
    ],
    "FLYE": [
        "DUMBBELL_FLYE",
        "INCLINE_DUMBBELL_FLYE",
        "CABLE_CROSSOVER",
    ],
    "LUNGE": [
        "DUMBBELL_LUNGE",
        "BARBELL_LUNGE",
        "WALKING_LUNGE",
        "REVERSE_LUNGE",
    ],
    "PULL_UP": [
        "PULL_UP",
        "CHIN_UP",
        "WEIGHTED_PULL_UP",
        "LAT_PULLDOWN",
    ],
    "PLANK": [
        "PLANK",
        "SIDE_PLANK",
        "PLANK_WITH_ARM_RAISE",
    ],
    "CRUNCH": [
        "CRUNCH",
        "BICYCLE_CRUNCH",
        "REVERSE_CRUNCH",
        "CABLE_CRUNCH",
    ],
    "LEG_CURL": [
        "LYING_LEG_CURL",
        "SEATED_LEG_CURL",
    ],
    "LEG_EXTENSION": [
        "LEG_EXTENSION",
    ],
    "CALF_RAISE": [
        "STANDING_CALF_RAISE",
        "SEATED_CALF_RAISE",
    ],
}
