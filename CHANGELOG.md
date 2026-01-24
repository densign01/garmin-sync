# Changelog

All notable changes to Garmin Sync.

## [Unreleased]

### Added
- Persist workout settings to user profile (#3)
  - Rest times and unilateral mode saved to database
  - Auto-save on change (1000ms debounce)
  - Subtle "Saved" indicator with retry on failure
- Two-column exercise mapping UI (DEN-6)
  - Left: parsed exercise name, Right: Garmin mapping
  - Searchable dropdown with 2,000+ Garmin exercises (cmdk)
  - Editable sets, reps, weight, rest time
  - Reps/distance toggle for exercises like farmer's walk
  - Confidence badges (green/amber/red)
- Click-outside-to-close for exercise dropdown
- Mode state sync when exercise changes externally

### Changed
- Premium UI redesign across all pages
  - Dashboard: gradient header, abstract background shapes, card shadows
  - Activity detail: two-column actual vs planned comparison
  - Workout creation: floating input labels, improved settings panel
- Indigo accent colors replace blue for hover/focus states
- Rounded corners increased (rounded-xl → rounded-3xl)
- Better loading spinners and empty states
- Mobile-responsive date badges and activity cards

### Fixed
- Dropdown now closes when clicking outside
- Reps/distance mode stays in sync with exercise data
- Sync button no longer shows overlapping text during state transition (#19)

### Security
- Rate limiting on login endpoints: 5 attempts per 15 min per IP (#13)
  - FastAPI: slowapi middleware on `/api/auth/login`
  - Next.js: Edge middleware on `/api/garmin/login`
  - Returns 429 with Retry-After header when exceeded

## [2026-01-19]

### Added
- Exercise suggestions for poor matches (top 3 alternatives)
- Confidence scoring with color-coded badges
- Inline swap UI ("swap?" link expands to show alternatives)
- Push logging to `workout_push_log` table

### Security
- Fernet symmetric encryption for Garmin tokens
- CORS restricted to garmin-sync.vercel.app and localhost
- Crash on missing GARMIN_ENCRYPTION_KEY (no default)
- Fernet key format validation on startup

## [2026-01-18]

### Added
- Dashboard with Garmin connection status
- Garmin OAuth authentication via garth
- Workout creation from plain text
- Push workouts to Garmin Connect
- Exercise mapping with 1,510 Garmin exercises
- Fuzzy matching with word-overlap scoring
- Common aliases (rdl, ohp, ghr, etc.)
