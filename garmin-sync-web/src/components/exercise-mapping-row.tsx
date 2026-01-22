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

export type ExerciseMappingRowProps = {
  /** The parsed exercise from user input */
  exercise: Exercise
  /** Index in the exercise list */
  index: number
  /** Callback when any field changes */
  onChange: (index: number, updated: Exercise) => void
  /** Whether this is the last item in the list */
  isLast?: boolean
}

// ... (imports and other code remain same, I will start replacing from export function)

export function ExerciseMappingRow({ exercise, index, onChange, isLast }: ExerciseMappingRowProps) {
  // ... (keep state logic same)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine if this exercise uses distance
  const isDistanceMode = Boolean(exercise.distance_meters && exercise.distance_meters > 0)
  const [mode, setMode] = useState<'reps' | 'distance'>(isDistanceMode ? 'distance' : 'reps')

  // ... (keep effects and logic same)
  useEffect(() => {
    const shouldBeDistanceMode = Boolean(exercise.distance_meters && exercise.distance_meters > 0)
    if (shouldBeDistanceMode && mode !== 'distance') {
      setMode('distance')
    } else if (!shouldBeDistanceMode && mode !== 'reps') {
      setMode('reps')
    }
  }, [exercise.distance_meters, mode])

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
        return { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', emoji: '✓' }
      case 'medium':
        return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', emoji: '?' }
      default:
        return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', emoji: '!' }
    }
  }, [exercise.confidence])

  // Current display name
  const selectedDisplayName = exercise.garmin_display_name ||
    exercise.garmin_name?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) ||
    'Select exercise...'

  // Filter exercises
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return EXERCISE_OPTIONS.slice(0, 100)
    }
    const query = searchQuery.toLowerCase()
    return EXERCISE_OPTIONS
      .filter(ex => ex.key.includes(query) || ex.displayName.toLowerCase().includes(query))
      .slice(0, 100)
  }, [searchQuery])

  // Handle select
  const handleSelectExercise = useCallback((exerciseKey: string) => {
    const selected = EXERCISE_OPTIONS.find(ex => ex.key === exerciseKey)
    if (selected) {
      onChange(index, {
        ...exercise,
        garmin_name: selected.garminName,
        garmin_display_name: selected.displayName,
        category: selected.category,
        confidence: 'high',
      })
    }
    setDropdownOpen(false)
    setSearchQuery('')
  }, [exercise, index, onChange])

  // Handlers
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
    const yards = parseInt(value, 10) || 0
    const meters = Math.round(yards * 0.9144)
    onChange(index, { ...exercise, distance_meters: meters })
  }

  const handleModeChange = (newMode: 'reps' | 'distance') => {
    setMode(newMode)
    if (newMode === 'distance' && !exercise.distance_meters) {
      onChange(index, { ...exercise, distance_meters: 37, reps: 1 })
    } else if (newMode === 'reps' && exercise.distance_meters) {
      onChange(index, { ...exercise, distance_meters: undefined, reps: exercise.reps || 10 })
    }
  }

  const distanceYards = exercise.distance_meters ? Math.round(exercise.distance_meters * 1.094) : ''

  return (
    <div className={`space-y-3 ${isLast ? '' : ''}`}>
      {/* Two-column layout: Input → Mapping */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

        {/* LEFT: Original input (read-only) */}
        <div className="sm:w-1/3 pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium capitalize">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            {exercise.name}
          </div>
        </div>

        {/* RIGHT: Garmin mapping (editable) */}
        <div className="sm:w-2/3 space-y-3">

          {/* Exercise dropdown with confidence badge */}
          <div className="flex items-center gap-2">
            <div ref={dropdownRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <span className={`truncate ${!exercise.garmin_name ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {selectedDisplayName}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      className="border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto p-1">
                      <CommandEmpty className="py-2 text-sm text-center text-slate-500">No exercises found.</CommandEmpty>
                      <CommandGroup>
                        {filteredExercises.map((ex) => (
                          <CommandItem
                            key={ex.key}
                            value={ex.key}
                            onSelect={handleSelectExercise}
                            className="flex items-center justify-between px-2 py-1.5 rounded-md aria-selected:bg-indigo-50 dark:aria-selected:bg-indigo-900/30 aria-selected:text-indigo-900 dark:aria-selected:text-indigo-100 cursor-pointer"
                          >
                            {ex.displayName}
                            {ex.key === exercise.garmin_name?.toLowerCase().replace(/_/g, ' ') && (
                              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${confidenceBadge.color}`} title={`Confidence: ${exercise.confidence}`}>
              {confidenceBadge.emoji}
            </span>
          </div>

          {/* Sets, Reps/Distance, Weight row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Sets */}
            <div className="relative group">
              <label className="absolute -top-2 left-2 px-1 bg-white dark:bg-slate-900 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Sets
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={exercise.sets}
                onChange={(e) => handleSetsChange(e.target.value)}
                className="w-16 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* Reps/Distance toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleModeChange('reps')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'reps' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Reps
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('distance')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'distance' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Dist
              </button>
            </div>

            {mode === 'reps' ? (
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={exercise.reps}
                  onChange={(e) => handleRepsChange(e.target.value)}
                  className="w-16 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  placeholder="Reps"
                />
              </div>
            ) : (
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={distanceYards}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  className="w-20 px-3 py-2 pr-8 border border-slate-200 dark:border-slate-700 rounded-lg text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
                <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">yd</span>
              </div>
            )}

            <span className="text-slate-300 dark:text-slate-700">×</span>

            {/* Weight */}
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                max="9999"
                value={exercise.weight_lbs ?? ''}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="—"
                className="w-20 px-3 py-2 pr-8 border border-slate-200 dark:border-slate-700 rounded-lg text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono placeholder:text-slate-300"
              />
              <span className="absolute right-3 text-xs text-slate-400 pointer-events-none">lb</span>
            </div>
          </div>

          {/* Rest time */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Rest</label>
            <select
              value={exercise.rest_seconds}
              onChange={(e) => handleRestChange(e.target.value)}
              className="pl-2 pr-6 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              {REST_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>
    </div>
  )
}
