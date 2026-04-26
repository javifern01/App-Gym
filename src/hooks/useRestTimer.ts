import { useEffect, useRef, useState } from 'react'

export interface UseRestTimerArgs {
  /** Epoch ms when rest is scheduled to end. null when no active rest. */
  endAt: number | null
  /** Whether the timer is "running". When false, hook does no work. */
  isActive: boolean
  /** Called exactly once when remainingMs first hits 0 (idempotent across re-renders). */
  onComplete?: () => void
}

export interface UseRestTimerResult {
  remainingMs: number
  secondsRemaining: number
}

/**
 * Pure helper used by the hook. Exposed for unit testing without React.
 * RESEARCH §Pattern 2: drift-free math — truth is always `endAt - nowMs`.
 */
export function computeRemainingMs(endAt: number | null, nowMs: number, isActive: boolean): number {
  if (!isActive || endAt == null) return 0
  return Math.max(0, endAt - nowMs)
}

/**
 * Drift-free rest countdown (RESEARCH §Pattern 2).
 *
 * - The TRUTH is `endAt - Date.now()`. We never accumulate elapsed.
 * - Visual updates use `requestAnimationFrame` (smooth, paused when tab hidden).
 * - On `visibilitychange → visible`, we force one immediate frame to recover from the
 *   timer freeze that browsers impose on hidden tabs.
 * - `onComplete` fires once and only once per `endAt`.
 */
export function useRestTimer({ endAt, isActive, onComplete }: UseRestTimerArgs): UseRestTimerResult {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    isActive && endAt != null ? Math.max(0, endAt - Date.now()) : 0
  )
  const completedRef = useRef<boolean>(false)
  const onCompleteRef = useRef<typeof onComplete>(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    completedRef.current = false
    if (!isActive || endAt == null) {
      setRemainingMs(0)
      return
    }

    let rafId = 0
    const tick = () => {
      const remaining = Math.max(0, endAt - Date.now())
      setRemainingMs(remaining)
      if (remaining === 0) {
        if (!completedRef.current) {
          completedRef.current = true
          onCompleteRef.current?.()
        }
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        cancelAnimationFrame(rafId)
        tick()
      }
    }

    rafId = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onVisibility)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onVisibility)
    }
  }, [endAt, isActive])

  return {
    remainingMs,
    secondsRemaining: Math.ceil(remainingMs / 1000),
  }
}
