# Custom Rest Periods and Timed Exercises Plan

**Overall Progress:** `85%`

## TLDR

Add support for user-entered rest periods and timed exercises in the workout generator. The app already has rest defaults and fixed rest dropdowns, but this plan makes rest values fully editable and lets users generate exercises like `plank 3x45 sec`, `wall sit 4x1 min`, or `battle rope 6x30 sec` and push them to Garmin as time-based strength intervals.

## Customer Impact

- Users can write workouts more naturally without changing timed work into fake reps.
- The preview can show and edit reps, time, or distance before pushing.
- Garmin watch guidance should count timed work as a timed interval, with normal rest after each set.

## Current Behavior

- The parser asks Gemini for `rest_seconds` and defaults to 90 seconds.
- The workout page applies saved major/minor rest defaults after parsing.
- Each exercise row has editable sets, reps/distance, weight, and a fixed rest dropdown.
- Distance mode exists for carries and uses Garmin lap-button behavior.
- Activity display already knows how to show completed duration data, but planned workouts only model reps.

## Critical Decisions

- Decision 1: Add an explicit exercise target mode: `reps`, `time`, or `distance` - avoids guessing from partially populated fields.
- Decision 2: Store timed planned exercises with `duration_seconds` - matches existing completed activity display and clipboard export language.
- Decision 3: Use the app's existing Garmin condition constants as source of truth: `reps` = `{ conditionTypeId: 10, conditionTypeKey: 'reps' }`, `time` = `{ conditionTypeId: 2, conditionTypeKey: 'time' }`, `lap.button` = `{ conditionTypeId: 7, conditionTypeKey: 'lap.button' }`. These are already used in the current working workout builder.
- Decision 4: Use Garmin interval steps with `endCondition: time` for timed exercises - the same condition object is already used for successful rest timers, but interval-time must still pass a real Garmin push/watch test before release.
- Decision 5: Keep saved default rest settings as defaults only - parsing explicit rest text or editing a row should override the default.
- Decision 6: Custom rest means per-exercise rest in the preview for v1.
- Decision 7: Timed exercises mean simple seconds/minutes only for v1, such as `30s`, `45 sec`, or `1 min`. Do not add EMOM, AMRAP, or intervals yet.
- Decision 8: Do a real Garmin validation before calling the feature ready.

## Resolved Questions

- Custom rest periods are per exercise in the generated workout preview.
- Timed exercises support simple seconds/minutes only in v1.
- Distance and time are separate modes in v1; no combined time-plus-distance targets.

## Confidence Notes

- App-side model, parser, UI, saving, and comparison changes are fully scoped.
- Garmin reps, rest-time, and lap-button behavior are grounded in the current working app code.
- The only thing that cannot be 100% proven from code inspection is whether Garmin accepts a time-based `interval` step exactly the same way it accepts a time-based `rest` step. The release gate is a real Garmin push/watch test.
- If Garmin Connect Web is available during implementation, capture a manual timed strength workout payload as a golden master before finalizing the JSON builder.

## Tasks:

- [x] 🟩 **Step 1: Explore Current Generator Behavior**
  - [x] 🟩 Confirm parser currently returns `rest_seconds` but not `duration_seconds`.
  - [x] 🟩 Confirm preview row supports reps/distance only.
  - [x] 🟩 Confirm Garmin payload builder currently supports reps and distance/lap-button only.
  - [x] 🟩 Confirm activity detail already displays completed timed sets.
  - [x] 🟩 Confirm per-exercise rest and simple timed durations are the v1 scope.
  - [x] 🟩 Confirm real Garmin validation is required before release.

- [x] 🟩 **Step 2: Extend Planned Exercise Shape**
  - [x] 🟩 Add `target_type?: 'reps' | 'time' | 'distance'` to the frontend `Exercise` type.
  - [x] 🟩 Add `duration_seconds?: number` for timed exercises.
  - [x] 🟩 Update `PlannedExercise` on the activity detail page to understand timed planned work.
  - [x] 🟩 Mirror the same fields in `src/schemas.py` so the backend builder stays aligned.

- [x] 🟩 **Step 3: Teach the Parser Timed Exercise Syntax**
  - [x] 🟩 Update the Gemini parse prompt to output `target_type` and `duration_seconds`.
  - [x] 🟩 Support common examples: `plank 3x45 sec`, `wall sit 4x1 min`, `battle ropes 8x30s`, `dead hang 3x60 seconds`.
  - [x] 🟩 Keep reps as the default when no time or distance is present.
  - [x] 🟩 Preserve current exercise alias and Garmin matching behavior.

- [x] 🟩 **Step 4: Make Rest Truly Custom**
  - [x] 🟩 Replace or augment the fixed rest dropdown with a compact number input for seconds/minutes.
  - [x] 🟩 Keep quick-pick options for common rests if they do not clutter the row.
  - [x] 🟩 Make explicit parsed rest values override saved major/minor defaults.
  - [x] 🟩 Keep saved default rest settings working exactly as they do today.

- [x] 🟩 **Step 5: Add Time Mode to the Preview Row**
  - [x] 🟩 Replace the reps/distance toggle with a small Reps / Time / Distance control.
  - [x] 🟩 Show duration input in time mode, using seconds internally.
  - [x] 🟩 Keep distance input in yards while storing meters internally.
  - [ ] 🟥 Ensure mobile row layout still fits without overlapping text.

- [x] 🟩 **Step 6: Build Garmin Timed Workout Payloads**
  - [x] 🟩 Update `buildGarminWorkout()` to use `endCondition: { conditionTypeId: 2, conditionTypeKey: 'time' }` for timed exercise intervals.
  - [x] 🟩 Set `endConditionValue` to `duration_seconds`.
  - [x] 🟩 Keep rest steps unchanged after each interval.
  - [x] 🟩 Update the backend `build_workout_json()` the same way for consistency.
  - [x] 🟩 Pull Garmin condition objects into named constants so reps/time/lap-button stay consistent across exercise and rest steps.
  - [x] 🟩 Preserve integer casting for Garmin IDs and numeric values.

- [x] 🟩 **Step 7: Update Saved Workout and Comparison Displays**
  - [x] 🟩 Save timed planned exercises in the existing `workouts.exercises` JSON.
  - [x] 🟩 Show planned timed targets on the activity detail comparison page.
  - [x] 🟩 Keep completed activity display and copy-to-clipboard behavior working for timed sets.

- [ ] 🟨 **Step 8: Validate Locally**
  - [x] 🟩 Run frontend lint/build checks after excluding or fixing existing generated-PWA lint noise.
  - [x] 🟩 Run backend compile check with `.venv/bin/python -m py_compile src/*.py`.
  - [x] 🟩 Confirm `/workout/new` returns HTTP 200 from the local dev server.
  - [x] 🟩 Smoke-test `/workout/new` in Chrome with a mixed reps/time/distance/custom-rest input; page loads and Parse Workout enables.
  - [x] 🟩 Verify backend Garmin payload shape for reps, timed intervals, lap-button distance work, custom rest, and zero-rest.
  - [ ] 🟥 Test parse and preview manually with reps, custom rest, timed, and distance examples.

- [ ] 🟥 **Step 9: Validate With Garmin**
  - [ ] 🟥 If possible, manually create a timed strength workout in Garmin Connect Web and compare its payload to the app payload.
  - [ ] 🟥 Push one timed workout to Garmin Connect using a real Garmin account.
  - [ ] 🟥 Confirm the watch shows a timed work interval, not fake reps.
  - [ ] 🟥 Confirm custom rest appears correctly between sets.
  - [ ] 🟥 Sync the completed workout back and verify duration displays correctly.

- [ ] 🟨 **Step 10: Document and Release**
  - [x] 🟩 Update `CHANGELOG.md`.
  - [ ] 🟥 Update user-facing docs if the input examples change.
  - [x] 🟩 Update the continuity ledger after implementation and verification.

## Suggested Test Inputs

```text
Core Day
Plank 3x45 sec, rest 30 sec
Side plank 2x30 sec each side, rest 20 sec
Dead hang 3x60 seconds, rest 90 sec
```

```text
Conditioning Finisher
Battle ropes 8x30s @ 0 lbs, rest 30s
Farmer's carry 4x40 yards @ 70 lbs, rest 60s
Push ups 3x15, rest 45s
```

## Risk Notes

- Garmin time-based strength intervals need real-device validation because this project uses reverse-engineered Garmin payloads.
- The current frontend lint command fails on existing generated PWA files and the icon script; clean verification may require excluding generated files or fixing that script first.
- Existing saved workouts may not have `target_type`; the implementation should infer `reps` when the field is missing.
