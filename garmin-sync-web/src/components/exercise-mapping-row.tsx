'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { GARMIN_EXERCISES } from '@/lib/garmin-exercises'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Exercise = {
  name: string
  sets: number
  reps: number
  weight_lbs?: number
  rest_seconds: number
  category?: string
  garmin_name?: string
  garmin_display_name?: string
  confidence?: 'exact' | 'high' | 'medium' | 'low' | 'none'
  distance_meters?: number
}

type ExerciseMappingRowProps = {
  /** The parsed exercise from user input */
  exercise: Exercise
  /** Index in the exercise list */
  index: number
  /** Callback when any field changes */
  onChange: (index: number, updated: Exercise) => void
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const REST_TIME_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 75, label: '75s' },
  { value: 90, label: '90s' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
]

// Build a flat list of exercises for the dropdown
// Format: { key: "bench press", category: "BENCH_PRESS", garminName: "BARBELL_BENCH_PRESS", displayName: "Bench Press" }
const EXERCISE_OPTIONS = Object.entries(GARMIN_EXERCISES).map(([key, [category, garminName]]) => ({
  key,
  category,
  garminName,
  displayName: key
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
}))

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ExerciseMappingRow({ exercise, index, onChange }: ExerciseMappingRowProps) {
  // Local state for dropdown open/closed
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine if this exercise uses distance (farmer's walk, etc.) or reps
  const isDistanceMode = Boolean(exercise.distance_meters && exercise.distance_meters > 0)
  const [mode, setMode] = useState<'reps' | 'distance'>(isDistanceMode ? 'distance' : 'reps')

  // Sync mode state when exercise.distance_meters changes externally
  useEffect(() => {
    const shouldBeDistanceMode = Boolean(exercise.distance_meters && exercise.distance_meters > 0)
    if (shouldBeDistanceMode && mode !== 'distance') {
      setMode('distance')
    } else if (!shouldBeDistanceMode && mode !== 'reps') {
      setMode('reps')
    }
  }, [exercise.distance_meters, mode])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Get confidence badge color
  const confidenceBadge = useMemo(() => {
    switch (exercise.confidence) {
      case 'exact':
      case 'high':
        return { color: 'bg-green-100 text-green-700', emoji: '🟢' }
      case 'medium':
        return { color: 'bg-amber-100 text-amber-700', emoji: '🟡' }
      default:
        return { color: 'bg-red-100 text-red-700', emoji: '🔴' }
    }
  }, [exercise.confidence])

  // Current display name for the selected exercise
  const selectedDisplayName = exercise.garmin_display_name ||
    exercise.garmin_name?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ||
    'Select exercise...'

  // Filter exercises based on search query (limit to 100 for performance)
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return EXERCISE_OPTIONS.slice(0, 100)
    }
    const query = searchQuery.toLowerCase()
    return EXERCISE_OPTIONS
      .filter(ex => ex.key.includes(query) || ex.displayName.toLowerCase().includes(query))
      .slice(0, 100)
  }, [searchQuery])

  // Handle exercise selection from dropdown
  const handleSelectExercise = useCallback((exerciseKey: string) => {
    const selected = EXERCISE_OPTIONS.find(ex => ex.key === exerciseKey)
    if (selected) {
      onChange(index, {
        ...exercise,
        garmin_name: selected.garminName,
        garmin_display_name: selected.displayName,
        category: selected.category,
        confidence: 'high', // User explicitly selected, so high confidence
      })
    }
    setDropdownOpen(false)
    setSearchQuery('')
  }, [exercise, index, onChange])

  // Handle field changes
  const handleSetsChange = (value: string) => {
    const sets = parseInt(value, 10) || 1
    onChange(index, { ...exercise, sets: Math.max(1, sets) })
  }

  const handleRepsChange = (value: string) => {
    const reps = parseInt(value, 10) || 1
    onChange(index, { ...exercise, reps: Math.max(1, reps) })
  }

  const handleWeightChange = (value: string) => {
    const weight = value === '' ? undefined : parseInt(value, 10) || undefined
    onChange(index, { ...exercise, weight_lbs: weight })
  }

  const handleRestChange = (value: string) => {
    const rest = parseInt(value, 10) || 60
    onChange(index, { ...exercise, rest_seconds: rest })
  }

  const handleDistanceChange = (value: string) => {
    // Input is in yards, convert to meters for storage
    const yards = parseInt(value, 10) || 0
    const meters = Math.round(yards * 0.9144)
    onChange(index, { ...exercise, distance_meters: meters })
  }

  // Handle mode toggle (reps <-> distance)
  const handleModeChange = (newMode: 'reps' | 'distance') => {
    setMode(newMode)
    if (newMode === 'distance' && !exercise.distance_meters) {
      // Default to 40 yards (37 meters) when switching to distance
      onChange(index, { ...exercise, distance_meters: 37, reps: 1 })
    } else if (newMode === 'reps' && exercise.distance_meters) {
      // Clear distance when switching to reps
      onChange(index, { ...exercise, distance_meters: undefined, reps: exercise.reps || 10 })
    }
  }

  // Convert meters to yards for display
  const distanceYards = exercise.distance_meters ? Math.round(exercise.distance_meters * 1.094) : ''

  return (
    <div className="py-4 border-b border-border last:border-b-0">
      {/* Two-column layout: Input → Mapping */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

        {/* LEFT: Original input (read-only) */}
        <div className="sm:w-1/3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium capitalize">
            {exercise.name}
          </span>
          <span className="text-muted-foreground">→</span>
        </div>

        {/* RIGHT: Garmin mapping (editable) */}
        <div className="sm:w-2/3 space-y-3">

          {/* Exercise dropdown with confidence badge */}
          <div className="flex items-center gap-2">
            <div ref={dropdownRef} className="relative flex-1">
              {/* Dropdown trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-background hover:bg-accent/50 transition-colors text-left"
              >
                <span className="truncate">{selectedDisplayName}</span>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>No exercises found.</CommandEmpty>
                      <CommandGroup>
                        {filteredExercises.map((ex) => (
                          <CommandItem
                            key={ex.key}
                            value={ex.key}
                            onSelect={handleSelectExercise}
                          >
                            {ex.displayName}
                            {ex.key === exercise.garmin_name?.toLowerCase().replace(/_/g, ' ') && (
                              <svg className="ml-auto w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>

            {/* Confidence badge */}
            <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${confidenceBadge.color}`}>
              {confidenceBadge.emoji}
            </span>
          </div>

          {/* Sets, Reps/Distance, Weight row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Sets */}
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Sets</span>
              <input
                type="number"
                min="1"
                max="99"
                value={exercise.sets}
                onChange={(e) => handleSetsChange(e.target.value)}
                className="w-12 px-2 py-1 border rounded-md text-center bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            {/* Reps/Distance toggle */}
            <div className="flex items-center gap-2 border rounded-md px-2 py-1 bg-muted/30">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`mode-${index}`}
                  checked={mode === 'reps'}
                  onChange={() => handleModeChange('reps')}
                  className="w-3 h-3"
                />
                <span className="text-muted-foreground">Reps</span>
                {mode === 'reps' && (
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={exercise.reps}
                    onChange={(e) => handleRepsChange(e.target.value)}
                    className="w-12 px-2 py-1 border rounded-md text-center bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name={`mode-${index}`}
                  checked={mode === 'distance'}
                  onChange={() => handleModeChange('distance')}
                  className="w-3 h-3"
                />
                <span className="text-muted-foreground">Dist</span>
                {mode === 'distance' && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={distanceYards}
                      onChange={(e) => handleDistanceChange(e.target.value)}
                      className="w-14 px-2 py-1 border rounded-md text-center bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-muted-foreground text-xs">yds</span>
                  </>
                )}
              </label>
            </div>

            {/* Weight */}
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Weight</span>
              <input
                type="number"
                min="0"
                max="9999"
                value={exercise.weight_lbs ?? ''}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder=""
                className="w-16 px-2 py-1 border rounded-md text-center bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-muted-foreground text-xs">lbs</span>
            </label>
          </div>

          {/* Rest time */}
          <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">Rest</span>
              <select
                value={exercise.rest_seconds}
                onChange={(e) => handleRestChange(e.target.value)}
                className="px-2 py-1 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {REST_TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
