---
phase: 2
plan: 10
subsystem: app-orchestration
tags: [integration, fsm, reducer, side-effects, persistence]
dependency_graph:
  requires: [02-04, 02-05, 02-06, 02-07, 02-08, 02-09]
  provides: [running-app, all-phase2-criteria-reachable]
  affects: [src/App.tsx, src/components/SessionScreen.tsx, src/session/types.ts, src/session/actions.ts, src/session/reducer.ts]
tech_stack:
  added: []
  patterns: [dispatchTimed, persistence-on-transitions-only, visibility-rebump, handoff-auto-advance]
key_files:
  created: []
  modified:
    - src/components/SessionScreen.tsx
    - src/App.tsx
    - src/session/types.ts
    - src/session/actions.ts
    - src/session/reducer.ts
decisions:
  - "PAUSE/RESUME/DISCARD dispatch directly (no dispatchTimed) — actions carry no time payload; lastActionRef.current updated manually to keep persistence guard correct"
  - "Handoff auto-advance via setTimeout on visibleUntil; also driven by 5Hz setInterval for live countdown — user can still click Empezar ya to shortcut"
  - "restMul applied to plannedRestSeconds before LOG_SET dispatch; in production restMul===1 so rest_planned_s in snapshot equals the prescribed value"
  - "SET_PREFERENCES added as Rule 2 deviation — WizardScreen cannot update FSM state without it"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_modified: 5
---

# Phase 2 Plan 10: App Orchestration Summary

**One-liner:** useReducer FSM with dispatchTimed, tick-isolated persistence, and full side-effect wiring integrates all Phase 2 dormant components into a running guided workout app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite SessionScreen.tsx — FSM-driven view orchestrator | d5a4a85 | src/components/SessionScreen.tsx (+190/-76) |
| 2 | Rewrite App.tsx — useReducer FSM, dispatchTimed, side-effects | 32945fe | src/App.tsx, src/session/types.ts, actions.ts, reducer.ts (+287/-55) |

## Implementation Details

### SessionScreen.tsx — Purely Presentational FSM View

- Props: `state: SnapshotV3`, `nowMs: number`, `toastEntry`, and 11 action callbacks
- `selectNextAction(state, nowMs)` drives the 5 branches: `log_set`, `rest`, `handoff`, `paused`, `completed`
- **SESS-01**: Every in_progress state renders a concrete component — no blank screens
- Pre-fill logic reads last completed set for reps/weight/RIR (D-06)
- RestStrip receives `isExpanded` prop; local `restExpanded` state not persisted (D-10)
- `data-testid="session-status"` preserved for Phase 1 E2E continuity
- `data-testid="skip-exercise"` added for SESS-04 Playwright selectors
- Zero `Date.now()`, `crypto.randomUUID`, `saveSnapshot` calls — fully pure

### App.tsx — Orchestration Shell

**dispatchTimed pattern (RESEARCH §Pitfall 4):**
```typescript
const dispatchTimed = (build: (now: { ms, iso, id }) => Action) => {
  const ms = Date.now(); const iso = new Date(ms).toISOString(); const id = generateId()
  const action = build({ ms, iso, id })
  lastActionRef.current = action.type
  dispatch(action)
}
```
Actions without time payload (PAUSE/RESUME/DISCARD/EXTEND_REST) dispatch directly with `lastActionRef.current` set manually.

**Persistence guard (RESEARCH §Pitfall 6):**
```typescript
useEffect(() => {
  if (lastActionRef.current === 'TICK') return
  saveSnapshot(state)
}, [state])
```
TICK is never dispatched in this app; guard is explicit documentation for future contributors.

**Side-effect wiring map:**
| Side Effect | When | Condition |
|-------------|------|-----------|
| `audioCue.beep(880, 200)` | `useRestTimer.onComplete` | `state.preferences?.restAlertSound` |
| `vibration.vibrate(200)` | `useRestTimer.onComplete` | `state.preferences?.restAlertVibration` |
| `audioCue.prime()` | handleResume, handleAdvanceToNext, handleStartNewSession | User gesture (idempotent) |
| `useWakeLock(active)` | Continuous | `state.session.status === 'in_progress'` |

**Visibility re-sync (RESEARCH §Pitfall 7):**
- `visibilitychange` → `setNowTick(t => t + 1)` bumper
- `pageshow` → same bumper
- `useRestTimer` also handles its own RAF rebasing on visibility internally

**Handoff auto-advance:**
```typescript
useEffect(() => {
  if (handoffVisibleUntil == null) return
  const pollId = setInterval(() => setNowTick(t => t+1), 200) // live countdown
  const autoId = setTimeout(() => dispatch(actions.advanceToNextExercise(Date.now())), remaining)
  return () => { clearInterval(pollId); clearTimeout(autoId) }
}, [handoffVisibleUntil])
```

**View routing (5 states):**
| Condition | View |
|-----------|------|
| `preferences == null` | WizardScreen |
| `status === 'in_progress' \| 'completed' \| 'paused'` | SessionScreen |
| `status === 'idle'` | EmptyStateScreen |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added SET_PREFERENCES to session module**
- **Found during:** Task 2 implementation
- **Issue:** Plan referenced `actions.setPreferences(preferences)` and `dispatchTimed(() => actions.setPreferences(preferences))` but this action creator was absent from `src/session/actions.ts`, `src/session/types.ts`, and `src/session/reducer.ts`. WizardScreen cannot update FSM state without it.
- **Fix:** Added `SET_PREFERENCES` to the Action union in types.ts; added `setPreferences()` action creator to actions.ts; added `case 'SET_PREFERENCES'` in reducer.ts (`{ ...state, preferences: action.payload.preferences }`)
- **Files modified:** src/session/types.ts, src/session/actions.ts, src/session/reducer.ts
- **Commit:** 32945fe

**2. [Rule 1 - Interface Mismatch] Adapted prop names to actual component interfaces**
- **Found during:** Task 1 implementation
- **Issue:** Plan's code used `prefillReps/prefillWeight/prefillRir` (FocusCard) and `plannedSeconds` on RestStrip, but actual implemented components use `initialReps/initialWeight/initialRir` and `isExpanded` respectively.
- **Fix:** Used actual prop names as found in components; `onLogSet` callback signature adapted from object `{reps, weight, rir}` to positional `(reps, weight, rir)`.

**3. [Rule 1 - Interface Mismatch] PAUSE/RESUME/DISCARD dispatch adapted**
- **Found during:** Task 2 implementation
- **Issue:** Plan used `dispatchTimed(({ ms }) => actions.pause(ms))` but actual `pause()` action takes no args.
- **Fix:** Dispatched directly (`dispatch(actions.pause())`) with manual `lastActionRef.current` update.

**4. [Rule 1 - Interface Mismatch] skipRest/skipExercise/extendRest signatures adapted**
- **Issue:** `actions.skipRest(nowMs, nowIso)` (not one arg); `actions.skipExercise(exerciseIndex, nowMs)` (exerciseIndex first); `actions.extendRest(extraSeconds)` (not `addSeconds`).
- **Fix:** Calls adapted to actual signatures; `handleSkipExercise` reads `state.session.currentExerciseIndex` for the index.

**5. [Rule 1 - Schema field] `endAt` not `endAtMs`**
- **Issue:** Plan used `state.session.rest?.endAtMs` but RestStateSchema defines it as `endAt`.
- **Fix:** Used `state.session.rest?.endAt` throughout.

**6. [Rule 1 - unused import] `plannedRestForGoal` removed from App.tsx imports**
- **Issue:** TSC error `TS6133: 'plannedRestForGoal' is declared but its value is never read` — the function is used in SessionScreen, not App.
- **Fix:** Removed from App.tsx import.

## Phase 2 Success Criteria Verification

All 5 ROADMAP success criteria are now **reachable from the UI**:

| # | Criterion | How Achieved |
|---|-----------|--------------|
| SESS-01 | Siguiente acción siempre visible | `selectNextAction` drives SessionScreen — no blank screen |
| SESS-02 | Cada set registrado con reps+peso+RIR+timestamp | `LOG_SET` payload via `dispatchTimed` injects `nowIso` |
| REST-01 | Descanso visual + sonido al finalizar | RestStrip + `audioCue.beep` in `useRestTimer.onComplete` |
| REST-02 | Desviación media de descanso en resumen | `computeRestDeviation` + `SummaryScreen` chip |
| SESS-04 | Saltar ejercicio refleja en resumen | `skipExercise` action + SummaryScreen shows skipped |

## D-22 Compliance

`git diff package.json` → no changes. Zero new npm dependencies.

## Known Stubs

- `handleSelectExercise` is a no-op (Phase 2 v1 only navigates visually; D-09 "editar set ya completado" deferred to future plan)

## Self-Check

- `src/components/SessionScreen.tsx` exists: ✓
- `src/App.tsx` exists: ✓
- Commits d5a4a85 and 32945fe exist: ✓
- `npx tsc -b` exits 0: ✓
- `npm run test -- --run` exits 0 (77 tests): ✓

## Self-Check: PASSED
