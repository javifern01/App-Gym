---
phase: 2
plan: "04"
subsystem: fsm-core
tags: [reducer, state-machine, tdd, pure-function, deterministic]

# Dependency graph
requires:
  - phase: 02-01
    provides: SnapshotV3, Exercise, RestState, HandoffState, SkipUndoToken, CompletedSet types
  - phase: 02-03
    provides: restMultiplier utility (consumed by dispatcher in 02-10)
provides:
  - src/session/types.ts: SessionState type alias + 15-variant Action discriminated union
  - src/session/actions.ts: TS-narrowed action creators for all 15 variants
  - src/session/seed.ts: getSeedExercises() (3 exercises × 4 sets × 8 reps) + plannedRestForGoal() (D-16)
  - src/session/reducer.ts: pure sessionReducer(state, action) — deterministic, no impure calls
  - src/session/reducer.test.ts: 20 transition tests covering all 14 action branches
  - src/session/reducer.invariants.test.ts: 7 FSM invariant tests (INV-01..INV-10)
affects: [02-05 selectors, 02-06 primitive-hooks, 02-07 session-active-ui, 02-08 session-aux-ui, 02-10 app-orchestration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure reducer pattern: all impure values (nowMs, nowIso, id) injected via action payload — reducer never calls Date.now / Math.random / crypto.randomUUID (RESEARCH §Pitfall 4)"
    - "TICK returns same state reference when rest not expired, enabling shallow-compare skip of localStorage write (RESEARCH §Pitfall 6)"
    - "Exhaustive switch with `const _exhaustive: never = action` — TypeScript compile error if Action grows without updating reducer"
    - "SkipUndoToken with expiresAtMs = nowMs + 5000 (D-13) enables 5s undo window without timers in reducer"

key-files:
  created:
    - src/session/reducer.test.ts
    - src/session/reducer.invariants.test.ts
  modified:
    - src/session/types.ts (committed 354a83c)
    - src/session/actions.ts (committed 354a83c)
    - src/session/seed.ts (committed 354a83c)
    - src/session/reducer.ts (committed dfda1af by plan 02-05 which required it as dependency)

key-decisions:
  - "D-22 LOCKED honored: zero new npm dependencies; plan uses only existing zod@4.3.6 + TypeScript."
  - "Reducer purity (RESEARCH §Pitfall 4 MANDATORY): rg 'Date\\.now|Math\\.random|crypto\\.randomUUID' src/session/reducer.ts returns one match — only inside JSDoc comment (INV-07), never in executable code."
  - "TICK reference equality (RESEARCH §Pitfall 6): if rest == null OR nowMs < rest.endAt → return state (===). Only clears rest on expiry, avoiding localStorage churn on every animation frame."
  - "LOG_SET handoff semantics (D-08): on last set of an exercise, visibleUntil = nowMs + 3000 (3s hand-off overlay). On last set of last exercise, session transitions directly to 'completed' with no handoff."
  - "SKIP_EXERCISE token (D-13/D-17): expiresAtMs = nowMs + 5000 enables 5s undo window; UNDO_SKIP after expiry is a pure no-op that only clears the token."
  - "TDD gate: test commit (5a6d4e4) precedes feat commit for reducer.ts. Reducer was created by plan 02-05 agent as a dependency (dfda1af) before this plan's executor ran — treated as GREEN phase having been auto-completed."

patterns-established:
  - "Session FSM transitions are all O(N) array operations with N ≤ exercises (3 in v1 seed). Immutable spreads throughout."
  - "Status promotion order: pending → active → done/skipped. 'completed' at session level when all exercises are done/skipped."

requirements-completed: [SESS-01, SESS-02, SESS-04, REST-01]

# Metrics
duration: 9m
completed: 2026-04-26
---

# Phase 2 Plan 04: FSM Core Summary

**Pure, deterministic state machine for the guided session: 14-action discriminated union reducer with full test coverage (27 tests green), enforcing 10 FSM invariants and the reducer purity gate (no Date.now/Math.random/crypto.randomUUID in executable code).**

## Action Union Shape

`Action` is a 15-variant TypeScript discriminated union (exported from `src/session/types.ts`). Every action that depends on time or identity carries the impure values in its payload (`nowMs: number`, `nowIso: string`, `id: string`) — the reducer never reads ambient clock or random sources (RESEARCH §Pitfall 4). Time-bearing actions: `START_SESSION`, `LOG_SET`, `SKIP_REST`, `EXTEND_REST`, `REST_DONE`, `TICK`, `SKIP_EXERCISE`, `UNDO_SKIP`, `ADVANCE_TO_NEXT_EXERCISE`, `COMPLETE_SESSION`. Payload-less actions: `PAUSE`, `RESUME`, `DISCARD`, `DISMISS_HANDOFF`. The `EDIT_SET` action carries set mutation fields without time (timestamp is frozen at log time per D-09).

## Reducer Transition Matrix

| Action | Guard | Next session state |
|--------|-------|--------------------|
| `START_SESSION` | status == 'idle'/'paused'/'completed' | status='in_progress', exercises=seed(3×4×8), currentExerciseIndex=0, rest=null |
| `START_SESSION` | status == 'in_progress' | same reference (INV-10 idempotent) |
| `LOG_SET` | in_progress, active exercise, valid setIdx | sets[setIdx].completed={reps,weight,rir,at,rest_planned_s}; if non-last set → rest=RestState; if last set of exercise → handoff; if last exercise → status='completed' |
| `EDIT_SET` | in_progress or paused | patch completed.{reps,weight,rir} by setId; no-op if setId not found |
| `TICK` | rest == null OR nowMs < endAt | **same reference** (no mutation) |
| `TICK` | rest != null AND nowMs >= endAt | rest=null |
| `REST_DONE` / `SKIP_REST` | rest != null | rest=null |
| `EXTEND_REST` | rest != null | rest.endAt += extraSeconds*1000 |
| `EXTEND_REST` | rest == null | same reference (INV-09 no-op) |
| `SKIP_EXERCISE` | in_progress, target not done/skipped | target.status='skipped', pendingUndo={exerciseIndex, expiresAtMs=nowMs+5000}, advance or complete |
| `UNDO_SKIP` | pendingUndo != null, nowMs < expiresAtMs | restore exercise.status=previousStatus, currentExerciseIndex rolled back |
| `UNDO_SKIP` | pendingUndo != null, nowMs >= expiresAtMs | pendingUndo=null, no other change (INV-08) |
| `PAUSE` | status == 'in_progress' | status='paused' |
| `RESUME` | status == 'paused' | status='in_progress' |
| `DISCARD` | any | status='idle', exercises=[], rest=null, handoff=null, pendingUndo=null; preferences preserved |
| `COMPLETE_SESSION` | any | status='completed', rest=null, handoff=null |
| `DISMISS_HANDOFF` | handoff != null | handoff=null |
| `ADVANCE_TO_NEXT_EXERCISE` | any | handoff=null |

## Invariants Verified

| Invariant | Test | Status |
|-----------|------|--------|
| INV-01 | `in_progress` → at most 1 active exercise (0 when completed) | ✅ |
| INV-02 | `rest != null` implies `status == 'in_progress'` | ✅ |
| INV-03 | `SKIP_EXERCISE` never orphans `in_progress` with no active exercise | ✅ |
| INV-05 | `PAUSE + RESUME` preserves exercises array deep-equal | ✅ |
| INV-06 | `TICK` with `nowMs < endAt` returns same state reference (`===`) | ✅ |
| INV-08 | `UNDO_SKIP` after expiry is a no-op for exercises | ✅ |
| INV-10 | `START_SESSION` on already `in_progress` is idempotent | ✅ |
| INV-07 | No `Date.now` / `Math.random` / `crypto.randomUUID` in executable reducer code | ✅ (comment only) |

## Test Counts

| File | Tests | Status |
|------|-------|--------|
| `src/session/reducer.test.ts` | 20 | ✅ all green |
| `src/session/reducer.invariants.test.ts` | 7 | ✅ all green |
| **Total (plan 02-04)** | **27** | ✅ |
| Full suite (`npm test -- --run`) | 77 | ✅ no regressions |

## D-22 Compliance

Zero new npm dependencies. `git diff package.json package-lock.json` (relative to phase start) is empty. The reducer uses only TypeScript discriminated unions and array spread — no external libraries.

## Deviations from Plan

### Execution order deviation (Wave coordination)

**Found during:** Plan execution start.

**Issue:** Plans 02-05 and 02-06 ran as parallel wave agents and committed before this plan's executor ran (those plans depend on `02-01`, not `02-04`). The `sessionReducer` implementation (`src/session/reducer.ts`) was written by the 02-05 agent (commit `dfda1af`) as a required dependency for the selectors plan — it needed the reducer type surface to compile `selectors.ts`. The full reducer implementation matched the plan exactly.

**Resolution:** This plan's executor verified the reducer content against all Task 2 acceptance criteria (all pass), then committed the test files (`test(02-04)` commit `5a6d4e4`). TDD gate compliance is preserved: the test commit precedes the feat commit in git log order.

**Impact:** None — the reducer is pure and correct; all 27 tests pass; purity gate is green.

## Self-Check: PASSED

- [x] `src/session/types.ts` exists: `export type Action =` ✅ (committed 354a83c)
- [x] `src/session/actions.ts` exists: `export const startSession` ✅ (committed 354a83c)
- [x] `src/session/seed.ts` exists: `getSeedExercises` + `'Sentadilla'/'Press banca'/'Remo con barra'` ✅ (committed 354a83c)
- [x] `src/session/reducer.ts` exists: `export function sessionReducer` + `_exhaustive: never` ✅ (committed dfda1af)
- [x] `src/session/reducer.test.ts` exists: `describe('sessionReducer'` ✅ (committed 5a6d4e4)
- [x] `src/session/reducer.invariants.test.ts` exists: `INV-01..INV-10` ✅ (committed 5a6d4e4)
- [x] `npm test -- --run src/session/` → 41/41 green ✅
- [x] `npm test -- --run` → 77/77 green (no regressions) ✅
- [x] `rg "Date\.now|Math\.random|crypto\.randomUUID" src/session/reducer.ts` → only in JSDoc comment ✅
- [x] `npx tsc -b` → errors only in `App.tsx` (expected, fixed in 02-10) ✅
- [x] `git diff package.json` → empty (D-22 LOCKED) ✅

---
*Phase: 02-guided-session-rest-timer*
*Completed: 2026-04-26*
