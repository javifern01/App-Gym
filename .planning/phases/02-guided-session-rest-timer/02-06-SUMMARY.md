---
phase: 2
plan: "06"
subsystem: hooks
tags: [rest-timer, audio, vibration, wake-lock, toast, browser-platform]
dependency_graph:
  requires: ["02-01"]
  provides: ["useRestTimer", "useAudioCue", "useVibration", "useWakeLock", "useUndoableToast"]
  affects: ["02-07", "02-08", "02-10"]
tech_stack:
  added: []
  patterns:
    - "rAF drift-free timer (RESEARCH §Pattern 2)"
    - "Web Audio gesture priming (RESEARCH §Pattern 3)"
    - "Wake Lock re-acquire on visibilitychange + pageshow (RESEARCH §Pitfall 7+8)"
    - "Single-slot toast with auto-dismiss setTimeout"
key_files:
  created:
    - src/hooks/useRestTimer.ts
    - src/hooks/useRestTimer.test.ts
    - src/hooks/useAudioCue.ts
    - src/hooks/useVibration.ts
    - src/hooks/useWakeLock.ts
    - src/hooks/useUndoableToast.ts
  modified: []
decisions:
  - "D-22 (no new deps): @testing-library/react absent; React-mounted tests deferred to plan 02-11; 4 pure-math helper tests cover timing correctness"
  - "computeRemainingMs exported as pure helper to enable unit testing without React mounting"
  - "useWakeLock cancelled flag prevents sentinel leak on rapid active→false toggle before async acquire resolves"
metrics:
  duration: "~8 min"
  completed: "2026-04-26"
  tasks: 3
  files_created: 6
  files_modified: 0
---

# Phase 2 Plan 06: Primitive Hooks Summary

**One-liner:** Four drift-free browser-platform hooks (rAF timer, Web Audio, Vibration, Wake Lock) + undoable toast, encapsulating all RESEARCH pitfalls for REST-01 with zero new npm deps.

## Hook Contracts

### useRestTimer

```ts
useRestTimer({ endAt: number | null, isActive: boolean, onComplete?: () => void })
  → { remainingMs: number, secondsRemaining: number }
```

- Truth: `Math.max(0, endAt - Date.now())` — never an accumulated counter (RESEARCH §Pattern 2)
- Loop: `requestAnimationFrame` (pauses in hidden tabs automatically)
- Completion: `completedRef` guard ensures `onComplete` fires **exactly once** per `endAt`
- Background: `visibilitychange` + `pageshow` listeners force immediate re-tick on restore (Pitfall 7)
- Cleanup: cancels rAF + removes listeners on unmount / `isActive → false`

**Also exports:** `computeRemainingMs(endAt, nowMs, isActive)` — pure helper for unit testing

### useAudioCue

```ts
useAudioCue() → { prime: () => Promise<void>, beep: (hz?, ms?) => void, isPrimed: boolean }
```

- `prime()` **MUST** be called from an `onClick` handler (Pitfall 1 / RESEARCH §Pattern 3)
- Falls back to `webkitAudioContext` for iOS Safari compatibility
- `beep()` uses OscillatorNode + GainNode with exponential ramp; no-op if ctx not `'running'`
- AudioContext closed on unmount

### useVibration

```ts
useVibration() → { vibrate: (pattern: number | number[]) => void, isSupported: boolean }
```

- `typeof navigator.vibrate === 'function'` feature detection (Pitfall 2)
- Silent no-op on iOS Safari (no `navigator.vibrate`); visual + audio cues remain

### useWakeLock

```ts
useWakeLock(active: boolean) → { isLocked: boolean, error: string | null }
```

- Acquires `WakeLockSentinel` when `active=true`; releases when `active=false` (Pitfall 8)
- Re-acquires on `visibilitychange → visible` AND `pageshow` (Pitfall 7)
- `cancelled` flag prevents sentinel leak on rapid toggle before async acquire resolves
- Silent no-op on unsupported browsers (no error UI per D-23)

### useUndoableToast

```ts
useUndoableToast() → { current: ToastEntry | null, show: (msg, opts?) => void, dismiss: () => void }
```

- Single-slot: newest `show()` call replaces any active toast
- Default `durationMs: 5000` (D-13: skip exercise → 5s undo)
- `expiresAtMs` tracked in `ToastEntry` state (useful for test assertions and progress bar)
- Cleanup clears `setTimeout` on unmount

## Test Approach

| Layer | Status | Notes |
|-------|--------|-------|
| Pure math (`computeRemainingMs`) | ✅ 7 tests passing | Covers isActive=false, endAt=null, clamped delta, nowMs>endAt, edge cases |
| React-mounted hook | Deferred to 02-11 | `@testing-library/react` not installed (D-22) |
| useAudioCue / useVibration / useWakeLock / useUndoableToast | Deferred to 02-11 | Integration-style tests at plan 02-11 |

## D-22 Compliance

No new npm dependencies added. All hooks use:
- `react` (useEffect, useRef, useState, useCallback, useMemo) — already in project
- Web Audio API (native browser)
- Vibration API (native browser)
- Wake Lock API (native browser)
- `requestAnimationFrame` / `cancelAnimationFrame` (native browser)

## Deviations from Plan

### Auto-applied: D-22 test fallback

- **Found during:** Task 1
- **Issue:** `@testing-library/react` absent from `devDependencies`; React-mounted hook test would fail with import error
- **Fix:** Per plan's explicit fallback instructions, wrote 7 pure-math tests against `computeRemainingMs` helper instead. Exported `computeRemainingMs` from `useRestTimer.ts` as documented.
- **Files modified:** `src/hooks/useRestTimer.ts` (added export), `src/hooks/useRestTimer.test.ts` (pure helper tests only)
- **Commits:** `42dc6ae`, `c34bbb2`

### Out-of-scope pre-existing TS errors (deferred)

Pre-existing TypeScript errors in `src/App.tsx` (schemaVersion mismatch V2/V3) and `src/session/selectors.test.ts` (missing module) were present before this plan. Not modified or introduced by these hooks. Logged to deferred-items.

## Self-Check: PASSED

- [x] `src/hooks/useRestTimer.ts` exists
- [x] `src/hooks/useRestTimer.test.ts` exists
- [x] `src/hooks/useAudioCue.ts` exists
- [x] `src/hooks/useVibration.ts` exists
- [x] `src/hooks/useWakeLock.ts` exists
- [x] `src/hooks/useUndoableToast.ts` exists
- [x] Commits: `42dc6ae` (test RED), `c34bbb2` (feat GREEN), `cafb933` (audio+vibration), `9e60253` (wakelook+toast)
- [x] Tests: 7/7 passing
- [x] No new npm deps
