---
phase: 2
plan: 05
subsystem: session
tags: [selectors, utils, pure-functions, tdd, sess-01, rest-02]
dependency_graph:
  requires: [02-01, 02-04]
  provides: [selectNextAction, selectActiveExercise, selectActiveSet, selectProgress, selectRestRemainingMs, selectIsRestExpired, selectCompletedSetCount, formatTime, computeRestDeviation, session-barrel]
  affects: [02-07, 02-08, 02-10]
tech_stack:
  added: []
  patterns: [pure-selectors, tdd-red-green, discriminated-union, barrel-export]
key_files:
  created:
    - src/session/selectors.ts
    - src/session/selectors.test.ts
    - src/session/reducer.ts
    - src/session/index.ts
    - src/utils/formatTime.ts
    - src/utils/formatTime.test.ts
    - src/utils/restDeviation.ts
    - src/utils/restDeviation.test.ts
  modified:
    - (none — all new files)
decisions:
  - "Implemented reducer.ts in this worktree as a parallel dependency (02-04 running in separate worktree); contracts are identical per 02-04 PLAN"
  - "selectActiveExercise returns non-null for both in_progress and paused to support PAUSE state UI"
  - "Defensive: selectNextAction returns {kind: 'summary'} when in_progress but no active exercise (INV-01 edge guard)"
  - "D-22 confirmed: zero new npm dependencies added"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-26"
  tasks_completed: 3
  tests_added: 30
  files_created: 8
---

# Phase 2 Plan 05: Selectors and Utils Summary

**One-liner:** Pure session selectors + formatTime/restDeviation utilities providing SESS-01 (no folio en blanco) and REST-02 enforcement as a complete, tested surface.

## What Was Built

### Selectors API (`src/session/selectors.ts`)

| Function | Returns | Purpose |
|---|---|---|
| `selectNextAction(state, nowMs?)` | `NextAction` discriminated union | SESS-01 core: always returns a renderable action kind |
| `selectActiveExercise(state)` | `Exercise \| null` | Active exercise during in_progress/paused |
| `selectActiveSet(state)` | `ExerciseSetV3 \| null` | Current set of the active exercise |
| `selectProgress(state)` | `{setsTotal, setsCompleted}` | Session-wide progress counters |
| `selectRestRemainingMs(state, nowMs)` | `number` | Clamped ms remaining in active rest |
| `selectIsRestExpired(state, nowMs)` | `boolean` | True when nowMs >= rest.endAt |
| `selectCompletedSetCount(state)` | `number` | Total completed sets across session |

### NextAction discriminated union

```typescript
type NextAction =
  | { kind: 'idle' }
  | { kind: 'log_set'; exerciseName: string; setIndex: number; setsTotal: number }
  | { kind: 'rest'; secondsRemaining: number; exerciseName: string }
  | { kind: 'handoff'; nextExerciseName: string; msRemaining: number }
  | { kind: 'paused' }
  | { kind: 'summary' }
```

Every session status maps to exactly one kind — no null, no undefined. SESS-01 enforced by construction.

### formatTime (`src/utils/formatTime.ts`)

| Input | Output |
|---|---|
| 0 | `'0:00'` |
| 5 | `'0:05'` |
| 90 | `'1:30'` |
| 3725 | `'1:02:05'` |
| -5, NaN, Infinity | `'0:00'` (defensive) |

- M:SS format for < 3600s; H:MM:SS for ≥ 3600s
- Floors fractional seconds via `Math.floor`

### computeRestDeviation (`src/utils/restDeviation.ts`)

**Algorithm:**
1. Iterate all exercises → all sets → filter for `completed` sets with BOTH `rest_planned_s` AND `rest_actual_s`
2. Compute `actual - planned` delta per valid sample
3. `Math.round(totalDelta / totalSamples)` → signed integer seconds
4. Returns `{ meanDeltaSeconds, samples, perExercise[] }`

**Edge cases:**
- Empty session → `{ meanDeltaSeconds: 0, samples: 0, perExercise: [] }`
- Sets with only one field → skipped ("a partial sample isn't a sample")
- Positive mean → rested longer than prescribed; negative → shorter

### Barrel export (`src/session/index.ts`)

Single import point for plans 02-07/08/10:
```typescript
import { sessionReducer, selectNextAction, actions } from '../session'
```

### Reducer (`src/session/reducer.ts`)

Implemented as parallel dependency since 02-04 runs in a separate worktree. Full implementation matching the 02-04 plan contract:
- All 14 Action branches with exhaustive `never` switch
- Pure: no Date.now / Math.random / crypto.randomUUID
- TICK returns same state reference when nowMs < endAt (INV-06)
- All invariants INV-01..INV-10 respected

## Test Counts

| File | Tests |
|---|---|
| `src/session/selectors.test.ts` | 14 |
| `src/utils/formatTime.test.ts` | 11 |
| `src/utils/restDeviation.test.ts` | 5 |
| **Total (this plan)** | **30** |
| **All src/session/ + src/utils/** | **63** |

## Deviations from Plan

### Auto-added dependency

**[Rule 3 - Blocking] Created reducer.ts as parallel dependency**
- **Found during:** Task 1 (selectors test imports `./reducer` which didn't exist)
- **Issue:** 02-04 runs in a separate worktree; reducer.ts not visible in this worktree
- **Fix:** Implemented the complete reducer matching 02-04's plan contract exactly
- **Files modified:** `src/session/reducer.ts` (new)
- **Commit:** dfda1af

### Auto-fixed lint

**[Rule 1 - Bug] Removed unused SnapshotV3 import from reducer.ts**
- **Found during:** Task 3 (`npx tsc -b` report)
- **Fix:** Removed `SnapshotV3` from import list
- **Commit:** 23a1d2e

## D-22 Compliance

Zero new npm dependencies added. All code uses TypeScript + native browser APIs only.

## Known Stubs

None. All functions are fully implemented and wired.

## Threat Flags

None. All functions are pure read-only selectors and utilities with no network, storage, or auth surface.

## Self-Check: PASSED

- [x] `src/session/selectors.ts` exists
- [x] `src/session/selectors.test.ts` exists
- [x] `src/utils/formatTime.ts` exists
- [x] `src/utils/restDeviation.ts` exists
- [x] `src/session/index.ts` exists
- [x] Commits dfda1af, dccd4f5, 23a1d2e confirmed in git log
- [x] All 63 tests green: `npm test -- --run src/session/ src/utils/` ✓
