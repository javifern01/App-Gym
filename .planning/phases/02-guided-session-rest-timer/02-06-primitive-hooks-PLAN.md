---
phase: 2
plan: 06
type: execute
wave: 2
depends_on: ["02-01"]
files_modified:
  - src/hooks/useRestTimer.ts
  - src/hooks/useRestTimer.test.ts
  - src/hooks/useAudioCue.ts
  - src/hooks/useVibration.ts
  - src/hooks/useWakeLock.ts
  - src/hooks/useUndoableToast.ts
autonomous: true
requirements: [REST-01]
must_haves:
  truths:
    - "useRestTimer is drift-free: it ALWAYS derives `remainingMs` from `endAt - Date.now()` (never from a counter incremented by setInterval)"
    - "useRestTimer fires `onComplete` exactly once when remainingMs <= 0 (idempotent), even after backgrounding (visibilitychange)"
    - "useRestTimer uses `requestAnimationFrame` (NOT setInterval) for the visual countdown — RESEARCH §Pattern 2"
    - "useRestTimer attaches a `visibilitychange` listener and recomputes remainingMs on `document.visibilityState === 'visible'`"
    - "useAudioCue exposes prime() (must be called from a real onClick — RESEARCH §Pattern 3) and beep(durationMs?)"
    - "useAudioCue uses Web Audio API only when AudioContext is available; gracefully no-ops in jsdom"
    - "useVibration.vibrate(pattern) calls navigator.vibrate when present; silently no-ops on iOS (where API is undefined)"
    - "useWakeLock(active) acquires WakeLockSentinel ONLY when active=true (linked to status='in_progress'); releases on active=false; re-acquires on visibilitychange→visible AND pageshow (RESEARCH §Pitfall 7+8)"
    - "useUndoableToast shows for ≤ N ms (passed via opts.durationMs, default 5000), supports manual dismiss, exposes remainingMs in state for tests"
  artifacts:
    - path: "src/hooks/useRestTimer.ts"
      provides: "useRestTimer({ endAt, isActive, onComplete }) → { remainingMs, secondsRemaining }"
      contains: "function useRestTimer"
    - path: "src/hooks/useRestTimer.test.ts"
      provides: "Tests with vi.useFakeTimers covering drift, expiry, visibility-restore, idempotent onComplete"
      contains: "describe('useRestTimer'"
    - path: "src/hooks/useAudioCue.ts"
      provides: "useAudioCue() → { prime, beep, isPrimed }"
      contains: "function useAudioCue"
    - path: "src/hooks/useVibration.ts"
      provides: "useVibration() → { vibrate, isSupported }"
      contains: "function useVibration"
    - path: "src/hooks/useWakeLock.ts"
      provides: "useWakeLock(active: boolean) → { isLocked, error }"
      contains: "function useWakeLock"
    - path: "src/hooks/useUndoableToast.ts"
      provides: "useUndoableToast() → { show, dismiss, current }"
      contains: "function useUndoableToast"
  key_links:
    - from: "src/components/RestStrip.tsx (plan 02-07)"
      to: "useRestTimer"
      via: "subscribes to remainingMs for the visible countdown"
      pattern: "useRestTimer\\("
    - from: "src/App.tsx (plan 02-10)"
      to: "useWakeLock(state.session.status === 'in_progress')"
      via: "active boolean toggles WakeLockSentinel"
      pattern: "useWakeLock\\("
    - from: "src/components/EmptyStateScreen.tsx + RestStrip skip-rest button (plans 02-09 + 02-07)"
      to: "useAudioCue.prime"
      via: "called from inside an actual onClick (RESEARCH §Pattern 3)"
      pattern: "\\.prime\\(\\)"
---

<objective>
Encapsulate the four browser-platform primitives that the SessionScreen + ancillary components depend on. Each hook is a tiny, testable unit; the React UI in plans 02-07/08 just wires them up.

Purpose: REST-01 requires accurate, audible, vibration-aware rest cues with screen-stay-on. RESEARCH identified 4 platform pitfalls (gesture priming, visibility-restore, wake-lock release, drift). Each is encapsulated into one hook so the wiring is trivial.
Output: 6 files (4 hooks + 1 toast helper + 1 test file). Other 4 hooks are integration-style; tested at integration layer (plan 02-11) plus tsc compile.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-RESEARCH.md
@src/persist/schema.ts

**Stack constraint (D-22 — LOCKED):** No new deps. Use Web Audio API, Vibration API, Wake Lock API, requestAnimationFrame directly.

**Critical patterns (RESEARCH):**
- §Pattern 2 (drift-free timer): always `Math.max(0, endAt - Date.now())`, NEVER an incremented counter
- §Pattern 3 (audio gesture priming): `audioContext.resume()` MUST run inside the onClick of a user button — calling it from useEffect on mount fails on iOS
- §Pitfall 1 (Wake Lock auto-release on tab hide): re-acquire on `visibilitychange → visible` AND `pageshow`
- §Pitfall 7 (visibility restore): when tab returns from background, force a re-tick to recover from rAF coalescing
- §Pitfall 8 (Wake Lock leakage): release on every transition out of in_progress (paused/completed/idle/unmount)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: useRestTimer + tests (REST-01 core math)</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pattern 2: Drift-free rest countdown" (lines ~410-430)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 7: visibility restore"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Validation Architecture → REST-01 timing accuracy" (drift bound: ±150ms in foreground; ±2s after 30s background)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-09 (skip rest), D-10 (extend +15s)
  </read_first>
  <behavior>
    - Hook signature: `useRestTimer({ endAt, isActive, onComplete }: { endAt: number | null; isActive: boolean; onComplete?: () => void })`
    - Returns `{ remainingMs, secondsRemaining }` where `remainingMs = Math.max(0, endAt - Date.now())` and `secondsRemaining = Math.ceil(remainingMs / 1000)`
    - When isActive=false OR endAt=null → remainingMs=0, no rAF loop running.
    - When isActive=true AND endAt!=null → starts rAF loop; updates every animation frame.
    - Calls onComplete exactly once when remainingMs first reaches 0; uses an internal ref to guarantee idempotence even if state churns.
    - Listens for `visibilitychange`; on `document.visibilityState === 'visible'`, schedules an immediate frame to re-sync.
    - Cleans up rAF + listeners on unmount or when isActive flips to false.
  </behavior>
  <action>
Create `src/hooks/useRestTimer.ts` EXACTLY:

```ts
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
```

Create `src/hooks/useRestTimer.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRestTimer } from './useRestTimer'

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 when isActive is false', () => {
    const { result } = renderHook(() => useRestTimer({ endAt: Date.now() + 10_000, isActive: false }))
    expect(result.current.remainingMs).toBe(0)
    expect(result.current.secondsRemaining).toBe(0)
  })

  it('returns 0 when endAt is null', () => {
    const { result } = renderHook(() => useRestTimer({ endAt: null, isActive: true }))
    expect(result.current.remainingMs).toBe(0)
  })

  it('decreases remainingMs as time advances', async () => {
    const start = Date.now()
    const { result } = renderHook(() => useRestTimer({ endAt: start + 10_000, isActive: true }))
    expect(result.current.secondsRemaining).toBe(10)

    await act(async () => {
      vi.advanceTimersByTime(3000)
      // Trigger a rAF tick manually
      await Promise.resolve()
    })

    expect(result.current.secondsRemaining).toBeLessThanOrEqual(7)
    expect(result.current.secondsRemaining).toBeGreaterThanOrEqual(7)
  })

  it('calls onComplete exactly once when remainingMs hits 0', async () => {
    const onComplete = vi.fn()
    const start = Date.now()
    renderHook(() => useRestTimer({ endAt: start + 1000, isActive: true, onComplete }))

    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not call onComplete when isActive flips to false before expiry', async () => {
    const onComplete = vi.fn()
    const start = Date.now()
    const { rerender } = renderHook(
      ({ isActive }: { isActive: boolean }) =>
        useRestTimer({ endAt: start + 5000, isActive, onComplete }),
      { initialProps: { isActive: true } }
    )

    await act(async () => {
      vi.advanceTimersByTime(2000)
      await Promise.resolve()
    })
    rerender({ isActive: false })
    await act(async () => {
      vi.advanceTimersByTime(10_000)
      await Promise.resolve()
    })
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('uses Date.now() as truth (drift-free): if a long tick is missed, remainingMs catches up', async () => {
    const start = Date.now()
    const { result } = renderHook(() => useRestTimer({ endAt: start + 60_000, isActive: true }))
    expect(result.current.secondsRemaining).toBe(60)

    // Simulate background freeze: jump 30s without ticks
    await act(async () => {
      vi.setSystemTime(new Date(start + 30_000))
      // Nudge a rAF
      vi.advanceTimersByTime(16)
      await Promise.resolve()
    })

    // After resync, secondsRemaining should reflect the ACTUAL elapsed time, not the missed ticks.
    expect(result.current.secondsRemaining).toBeLessThanOrEqual(30)
    expect(result.current.secondsRemaining).toBeGreaterThanOrEqual(29)
  })
})
```

Note: depending on whether `@testing-library/react` is installed at the workspace level (Phase 1 may have included it), if its `renderHook` import fails, fall back to a hand-rolled minimal test that imports React + ReactDOM/test-utils. Check `package.json` first; if `@testing-library/react` IS NOT in dependencies, replace this test with a manual roller hook test using a tiny test renderer pattern. Per D-22, do NOT install `@testing-library/react` if it isn't already present — instead, write the test using `react` + a minimal in-test mounter (via `import { createRoot } from 'react-dom/client'` and `act` from `react`).

If neither test approach works in jsdom, mark this test file as `useRestTimer.test.tsx` and use a simple renderHook polyfill defined inline:

```ts
import * as React from 'react'
import { act, createRoot } from 'react-dom/client' // adjust if not available
// ... or invest minimal effort to wire it ...
```

If the executor finds that no React testing helper is installable within D-22, FALL BACK to a "logic-only" test that exercises the math by importing the hook's internal pure helper. To support this, REFACTOR `useRestTimer.ts` to also export an internal pure helper `computeRemaining(endAt, nowMs, isActive)` and test that helper directly. This keeps the math fully covered without needing to mount React in jsdom.

Specifically: ALSO export from `useRestTimer.ts`:
```ts
/** Pure helper used by the hook. Exposed for unit testing without React. */
export function computeRemainingMs(endAt: number | null, nowMs: number, isActive: boolean): number {
  if (!isActive || endAt == null) return 0
  return Math.max(0, endAt - nowMs)
}
```

And add to the test file (always works, no jsdom mount needed):
```ts
import { computeRemainingMs } from './useRestTimer'

describe('computeRemainingMs (pure helper)', () => {
  it('returns 0 when isActive=false', () => expect(computeRemainingMs(1000, 500, false)).toBe(0))
  it('returns 0 when endAt=null', () => expect(computeRemainingMs(null, 500, true)).toBe(0))
  it('returns clamped delta', () => expect(computeRemainingMs(1000, 500, true)).toBe(500))
  it('clamps to 0 when nowMs > endAt', () => expect(computeRemainingMs(1000, 1500, true)).toBe(0))
})
```

These 4 helper tests are MANDATORY (the React-mounted tests are best-effort). Acceptance criteria below grep for them.
  </action>
  <verify>
    <automated>npm test -- --run src/hooks/useRestTimer.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function useRestTimer" src/hooks/useRestTimer.ts` matches
    - `rg "export function computeRemainingMs" src/hooks/useRestTimer.ts` matches
    - `rg "Math\.max\(0, endAt - Date\.now\(\)\)" src/hooks/useRestTimer.ts` matches
    - `rg "requestAnimationFrame" src/hooks/useRestTimer.ts` matches at least once
    - `rg "addEventListener\('visibilitychange'" src/hooks/useRestTimer.ts` matches
    - `rg "addEventListener\('pageshow'" src/hooks/useRestTimer.ts` matches
    - `rg "completedRef\.current = true" src/hooks/useRestTimer.ts` matches (idempotent onComplete)
    - `rg "removeEventListener\('visibilitychange'" src/hooks/useRestTimer.ts` matches (cleanup)
    - `rg "computeRemainingMs.*pure helper" src/hooks/useRestTimer.test.ts` matches
    - At minimum the 4 pure-helper tests pass: `npm test -- --run src/hooks/useRestTimer.test.ts` green
  </acceptance_criteria>
  <done>Drift-free timer hook in place; pure math is unit-tested; visibility/pageshow re-acquire wired; React-mounted tests best-effort.</done>
</task>

<task type="auto">
  <name>Task 2: useAudioCue + useVibration (REST-01 alerts)</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pattern 3: Web Audio gesture priming" (lines ~432-444)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 1: Web Audio without gesture"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 2: Vibration API silent failure"
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-11 (audio + vibration toggles)
  </read_first>
  <action>
Create `src/hooks/useAudioCue.ts` EXACTLY:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseAudioCueResult {
  /**
   * MUST be called from inside an actual user gesture handler (e.g. onClick of
   * "Iniciar sesión", "Reanudar", or "✓ Hecho"). Calling from a useEffect on
   * mount fails on iOS Safari (RESEARCH §Pitfall 1).
   */
  prime: () => Promise<void>
  /** Plays a short beep. No-op if AudioContext is unavailable or not primed. */
  beep: (frequencyHz?: number, durationMs?: number) => void
  isPrimed: boolean
}

/**
 * Web Audio cue (RESEARCH §Pattern 3 + §Pitfall 1).
 * Single shared AudioContext per page; lazily created in prime().
 */
export function useAudioCue(): UseAudioCueResult {
  const ctxRef = useRef<AudioContext | null>(null)
  const [isPrimed, setIsPrimed] = useState(false)

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => undefined)
      ctxRef.current = null
    }
  }, [])

  const prime = useCallback(async () => {
    if (typeof window === 'undefined') return
    const Ctor: typeof AudioContext | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).AudioContext ?? (window as any).webkitAudioContext
    if (!Ctor) return
    if (!ctxRef.current) {
      ctxRef.current = new Ctor()
    }
    if (ctxRef.current.state === 'suspended') {
      try {
        await ctxRef.current.resume()
      } catch {
        // ignore — primer just failed; UI still works without sound
      }
    }
    setIsPrimed(ctxRef.current.state === 'running')
  }, [])

  const beep = useCallback((frequencyHz: number = 880, durationMs: number = 200) => {
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running') return
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequencyHz
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + durationMs / 1000 + 0.05)
  }, [])

  return { prime, beep, isPrimed }
}
```

Create `src/hooks/useVibration.ts` EXACTLY:

```ts
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
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function useAudioCue" src/hooks/useAudioCue.ts` matches
    - `rg "ctxRef\.current\.resume\(\)" src/hooks/useAudioCue.ts` matches (gesture priming)
    - `rg "webkitAudioContext" src/hooks/useAudioCue.ts` matches (iOS Safari fallback)
    - `rg "createOscillator" src/hooks/useAudioCue.ts` matches
    - `rg "export function useVibration" src/hooks/useVibration.ts` matches
    - `rg "navigator\.vibrate" src/hooks/useVibration.ts` matches
    - `rg "typeof navigator\.vibrate === 'function'" src/hooks/useVibration.ts` matches (feature detection)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>Both alert primitives compile; gesture-priming contract documented inline; iOS-safe.</done>
</task>

<task type="auto">
  <name>Task 3: useWakeLock + useUndoableToast</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 8: Wake Lock leakage"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 7: Wake Lock auto-release on tab hide"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pattern 4: Wake Lock with re-acquire on visible"
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-12 (Wake Lock during in_progress only)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-13 (skip undo 5s)
  </read_first>
  <action>
Create `src/hooks/useWakeLock.ts` EXACTLY:

```ts
import { useEffect, useRef, useState } from 'react'

export interface UseWakeLockResult {
  isLocked: boolean
  error: string | null
}

/**
 * Wake Lock API wrapper (RESEARCH §Pitfall 7+8, §Pattern 4).
 *
 * - Acquires a 'screen' lock when `active=true`; releases when `active=false`.
 * - Re-acquires on `visibilitychange → visible` AND `pageshow` because browsers
 *   automatically release the lock when the tab is hidden (Pitfall 7).
 * - Releases unconditionally on unmount (Pitfall 8).
 * - Silent no-op when navigator.wakeLock is unavailable (older browsers, iOS < 16.4).
 *
 * The first call to `wakeLock.request('screen')` MUST originate from a user
 * gesture (some browsers reject otherwise). The component owning the
 * "Iniciar sesión" / "Reanudar" button is responsible for ensuring `active`
 * flips to true synchronously inside the click handler.
 */
type WakeLockSentinel = { release: () => Promise<void>; addEventListener: (e: 'release', cb: () => void) => void }

export function useWakeLock(active: boolean): UseWakeLockResult {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const acquire = async () => {
      if (typeof navigator === 'undefined') return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wl: any = (navigator as any).wakeLock
      if (!wl || typeof wl.request !== 'function') return
      try {
        const sentinel: WakeLockSentinel = await wl.request('screen')
        if (cancelled) {
          await sentinel.release().catch(() => undefined)
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          setIsLocked(false)
        })
        setIsLocked(true)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'wake lock failed')
      }
    }

    const release = async () => {
      const s = sentinelRef.current
      sentinelRef.current = null
      if (s) {
        try {
          await s.release()
        } catch {
          // ignore
        }
      }
      setIsLocked(false)
    }

    if (active) {
      acquire()
      const onVisible = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !sentinelRef.current && active) {
          acquire()
        }
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('pageshow', onVisible)
      return () => {
        cancelled = true
        document.removeEventListener('visibilitychange', onVisible)
        window.removeEventListener('pageshow', onVisible)
        release()
      }
    } else {
      release()
      return () => {
        cancelled = true
      }
    }
  }, [active])

  return { isLocked, error }
}
```

Create `src/hooks/useUndoableToast.ts` EXACTLY:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ToastEntry {
  id: number
  message: string
  actionLabel?: string
  onAction?: () => void
  expiresAtMs: number
}

export interface UseUndoableToastResult {
  current: ToastEntry | null
  show: (message: string, opts?: { actionLabel?: string; onAction?: () => void; durationMs?: number }) => void
  dismiss: () => void
}

/**
 * Single-slot toast with optional undo action (D-13: skip exercise → 5s undo).
 *
 * - Calling show() while a toast is active replaces it (newest wins).
 * - Calling onAction() dismisses the toast.
 * - Dismisses automatically when Date.now() >= expiresAtMs.
 */
export function useUndoableToast(): UseUndoableToastResult {
  const [current, setCurrent] = useState<ToastEntry | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const idRef = useRef<number>(0)

  const dismiss = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setCurrent(null)
  }, [])

  const show = useCallback(
    (
      message: string,
      opts: { actionLabel?: string; onAction?: () => void; durationMs?: number } = {}
    ) => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current)
      const durationMs = opts.durationMs ?? 5000
      const id = ++idRef.current
      const entry: ToastEntry = {
        id,
        message,
        actionLabel: opts.actionLabel,
        onAction: opts.onAction
          ? () => {
              opts.onAction?.()
              dismiss()
            }
          : undefined,
        expiresAtMs: Date.now() + durationMs,
      }
      setCurrent(entry)
      timeoutRef.current = window.setTimeout(() => {
        setCurrent((c) => (c?.id === id ? null : c))
        timeoutRef.current = null
      }, durationMs)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { current, show, dismiss }
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function useWakeLock" src/hooks/useWakeLock.ts` matches
    - `rg "navigator as any\)\.wakeLock" src/hooks/useWakeLock.ts` matches
    - `rg "wl\.request\('screen'\)" src/hooks/useWakeLock.ts` matches
    - `rg "addEventListener\('visibilitychange'" src/hooks/useWakeLock.ts` matches (re-acquire — Pitfall 7)
    - `rg "addEventListener\('pageshow'" src/hooks/useWakeLock.ts` matches (re-acquire — Pitfall 7)
    - `rg "removeEventListener\('visibilitychange'" src/hooks/useWakeLock.ts` matches (cleanup)
    - `rg "sentinelRef\.current = null" src/hooks/useWakeLock.ts` matches at least once (release path)
    - `rg "sentinel\.release\(\)" src/hooks/useWakeLock.ts` matches OR `rg "s\.release\(\)" src/hooks/useWakeLock.ts` matches
    - `rg "export function useUndoableToast" src/hooks/useUndoableToast.ts` matches
    - `rg "durationMs = opts\.durationMs \?\? 5000" src/hooks/useUndoableToast.ts` matches (D-13: 5s default)
    - `rg "expiresAtMs: Date\.now\(\) \+ durationMs" src/hooks/useUndoableToast.ts` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>Wake-lock + toast primitives compile, gesture-paired, leak-free.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- `npx tsc -b` exits 0 across hooks surface.
- `npm test -- --run src/hooks/useRestTimer.test.ts` is green.
- Hook files do not import any new npm dependency (`rg "^import .* from '" src/hooks/ | rg -v "from 'react'" | rg -v "^[^:]+:import \{ describe"` returns empty for non-React imports).
</verification>

<success_criteria>
The four browser-platform primitives are encapsulated, documented with inline pitfall references, and ready for plans 02-07/08/10 consumption. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-06-SUMMARY.md` documenting:
- Hook contracts (signature + return)
- Pitfalls each hook handles (cite RESEARCH §)
- Test approach for useRestTimer (pure-helper coverage + mounted best-effort)
- D-22 compliance confirmed
</output>
