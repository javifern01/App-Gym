import { useCallback, useMemo } from 'react'

export interface UseVibrationResult {
  vibrate: (pattern: number | number[]) => void
  isSupported: boolean
}

/**
 * Vibration cue (RESEARCH §Pitfall 2).
 * iOS Safari does NOT implement navigator.vibrate. Hook silently no-ops there;
 * the visual + audio cues remain.
 */
export function useVibration(): UseVibrationResult {
  const isSupported = useMemo(() => {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
  }, [])

  const vibrate = useCallback(
    (pattern: number | number[]) => {
      if (!isSupported) return
      try {
        navigator.vibrate(pattern)
      } catch {
        // some browsers gate vibrate behind user-interaction — silent fallback
      }
    },
    [isSupported]
  )

  return { vibrate, isSupported }
}
