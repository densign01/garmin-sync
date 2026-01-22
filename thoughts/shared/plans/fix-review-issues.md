# Fix Code Review Issues

**Overall Progress:** `100%`

## TLDR
Address the 2 medium and 3 low issues found in the DEN-6 code review for the exercise mapping UI.

## Critical Decisions
- Click-outside: Use native event listener (no external library)
- Mode sync: Derive from props with useEffect, not initial state only
- Warnings: Keep state - it's passed to push endpoint for server-side logging
- Constants: Keep duplicates for now (defer to DEN-7 settings persistence work)

## Tasks:

- [x] 🟩 **Step 1: Add click-outside-to-close for dropdown**
  - [x] 🟩 Add ref to dropdown container
  - [x] 🟩 Add useEffect with mousedown listener
  - [x] 🟩 Close dropdown when click is outside ref

- [x] 🟩 **Step 2: Fix mode state desync**
  - [x] 🟩 Add useEffect to sync mode state when exercise.distance_meters changes
  - [x] 🟩 Handle edge case where external change flips mode

- [x] 🟩 **Step 3: Review warnings state**
  - [x] 🟩 Confirmed warnings state IS used (passed to push endpoint for logging)
  - [x] 🟩 Updated comment to clarify purpose

- [x] 🟩 **Step 4: Verify build passes**
  - [x] 🟩 Run `npm run build` ✅
  - [x] 🟩 No TypeScript errors
