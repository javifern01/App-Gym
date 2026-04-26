---
phase: 2
plan: 04
type: tdd
wave: 2
depends_on: ["02-01"]
files_modified:
  - src/session/types.ts
  - src/session/actions.ts
  - src/session/seed.ts
  - src/session/reducer.ts
  - src/session/reducer.test.ts
  - src/session/reducer.invariants.test.ts
autonomous: true
requirements: [SESS-01, SESS-02, SESS-04, REST-01]
must_haves:
  truths:
    - "Pure reducer (no Date.now / Math.random / crypto.randomUUID inside reducer.ts)"
    - "All time and id values arrive via action payload (nowMs, nowIso, id) — see RESEARCH §Pitfall 4"
    - "After START_SESSION + LOG_SET, snapshot.session.exercises[0].sets[0].completed contains { reps, weight, rir, at, rest_planned_s } (rest_actual_s injected later by REST_DONE)"
    - "TICK action exists and returns the SAME snapshot reference unless rest just expired (RESEARCH §Pitfall 6: NO localStorage write per tick)"
    - "INV-01: in_progress always has currentExercise.status === 'active' (verified by invariants test)"
    - "INV-02: rest != null implies session.status === 'in_progress' (verified by invariants test)"
    - "INV-03: SKIP_EXERCISE always advances or completes the session (no orphan state)"
    - "INV-04: LOG_SET → REST or SUMMARY transition is deterministic (last set of last exercise → completed; otherwise → rest)"
    - "INV-05: PAUSE then RESUME preserves exercises array byte-equal (no data loss)"
    - "Seed mini-routine: 3 exercises × 4 sets × 8 reps (D-15) — getSeedExercises() returns Exercise[3] each with sets length 4 planned reps 8"
  artifacts:
    - path: "src/session/types.ts"
      provides: "SessionState type alias for SnapshotV3, Action discriminated union"
      contains: "export type Action ="
    - path: "src/session/actions.ts"
      provides: "Action constructor helpers (action creators) with TS narrowing"
      contains: "export function startSession"
    - path: "src/session/seed.ts"
      provides: "getSeedExercises() returning the 3 mini-routine exercises (D-15)"
      contains: "export function getSeedExercises"
    - path: "src/session/reducer.ts"
      provides: "sessionReducer(state, action) — pure, deterministic"
      contains: "export function sessionReducer"
    - path: "src/session/reducer.test.ts"
      provides: "Reducer transition tests covering each Action × happy and edge paths"
      contains: "describe('sessionReducer'"
    - path: "src/session/reducer.invariants.test.ts"
      provides: "FSM invariants INV-01..INV-10 test suite"
      contains: "INV-01"
  key_links:
    - from: "src/session/reducer.ts LOG_SET branch"
      to: "src/persist/schema.ts CompletedSetSchema"
      via: "constructs CompletedSet { reps, weight, rir, at, rest_planned_s }"
      pattern: "rest_planned_s"
    - from: "src/session/reducer.ts SKIP_EXERCISE branch"
      to: "session.pendingUndo (SkipUndoToken)"
      via: "writes pendingUndo with expiresAtMs from action.nowMs + 5000"
      pattern: "pendingUndo"
---

<objective>
Build the pure, deterministic state machine that drives the guided session. The reducer is the single source of truth for SESS-01 (no folio en blanco), SESS-04 (skip), and the LOG_SET trigger that hands control to REST-01 timing.

Purpose: Decouple session logic from React rendering. Reducer is fully unit-testable; UI consumes selector projections.
Output: 6 files, ~250 LOC + ~400 LOC of tests. All tests green.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-RESEARCH.md
@src/persist/schema.ts

<interfaces>
<!-- V3 types this plan consumes (defined by plan 02-01) -->

From src/persist/schema.ts:
```typescript
export type CompletedSet = z.infer<typeof CompletedSetSchema>
export type ExerciseSetV3 = z.infer<typeof ExerciseSetSchemaV3>
export type Exercise = z.infer<typeof ExerciseSchema>
export type RestState = z.infer<typeof RestStateSchema>
export type HandoffState = z.infer<typeof HandoffStateSchema>
export type SkipUndoToken = z.infer<typeof SkipUndoTokenSchema>
export type SessionV3 = z.infer<typeof SessionSchemaV3>
export type SnapshotV3 = z.infer<typeof SnapshotV3Schema>
```

</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. No xstate, no @reduxjs/toolkit. Plain `useReducer` from React, plain TypeScript discriminated union.

**Reducer purity (RESEARCH §Pitfall 4 — MANDATORY):** The reducer file MUST NOT contain `Date.now`, `Math.random`, or `crypto.randomUUID` (grep-checked in acceptance criteria). All time/id values come from the action payload.

**Persistence-tick boundary (RESEARCH §Pitfall 6):** TICK action MUST be a pure read of `state.session.rest?.endAt` vs the action's `nowMs`. If `nowMs >= endAt` AND rest is active, transition to "rest just expired" (clear rest, set handoff or stay in active). If `nowMs < endAt`, return `state` BY REFERENCE (so callers can shallow-compare and skip rendering).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Write Action union, action creators, types, and seed</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Example A: FSM with reducer purity (Pattern 1)" (lines ~445-486)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"FSM Invariants" (INV-01..INV-10)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-15 (seed mini-routine: Sentadilla 4×8, Press banca 4×8, Remo 4×8)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-13 (skip semantics: undo within 5s)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-14 (rest_planned_s ALWAYS the prescribed value)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-16 (descansos prescritos: fuerza 120s, hipertrofia 90s, fat_loss 60s)
    - src/persist/schema.ts (V3 types)
  </read_first>
  <behavior>
    - Action union compiles with exhaustive `never` switch case in reducer.
    - getSeedExercises() returns array length 3, each with sets length 4 and planned.reps = 8.
    - Each seed exercise has a stable `name`: 'Sentadilla', 'Press banca', 'Remo con barra'.
    - Action creators produce correctly-typed actions; passing wrong payload shape fails `tsc -b`.
  </behavior>
  <action>
Create `src/session/types.ts` EXACTLY:
```ts
import type { SnapshotV3 } from '../persist/schema'
import type { GoalFocus } from '../persist/schema' // if not exported, infer below

export type SessionState = SnapshotV3

/**
 * Discriminated union of all FSM transitions.
 *
 * RULE (RESEARCH §Pitfall 4): every action that depends on time or identity carries the
 * impure value(s) in its payload (nowMs, nowIso, id). The reducer never reads them itself.
 *
 * RULE (RESEARCH §Pitfall 6): TICK is a read-only action; it returns the same state
 * reference unless rest has just expired.
 */
export type Action =
  | {
      type: 'START_SESSION'
      payload: {
        id: string
        nowIso: string
        nowMs: number
        exerciseIds: string[] // length 3, generated by dispatcher per START_SESSION
      }
    }
  | {
      type: 'LOG_SET'
      payload: {
        nowIso: string
        nowMs: number
        reps: number
        weight: number
        rir: number
        plannedRestSeconds: number // dispatcher reads goalFocus → 60/90/120
      }
    }
  | { type: 'EDIT_SET'; payload: { setId: string; reps: number; weight: number; rir: number } }
  | { type: 'SKIP_REST'; payload: { nowMs: number; nowIso: string } }
  | { type: 'EXTEND_REST'; payload: { extraSeconds: number } }
  | { type: 'REST_DONE'; payload: { nowMs: number; nowIso: string } }
  | { type: 'TICK'; payload: { nowMs: number; nowIso: string } }
  | { type: 'SKIP_EXERCISE'; payload: { exerciseIndex: number; nowMs: number } }
  | { type: 'UNDO_SKIP'; payload: { nowMs: number } }
  | { type: 'ADVANCE_TO_NEXT_EXERCISE'; payload: { nowMs: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'DISCARD' }
  | { type: 'COMPLETE_SESSION'; payload: { nowMs: number; nowIso: string } }
  | { type: 'DISMISS_HANDOFF' }
```

Create `src/session/actions.ts` EXACTLY:
```ts
import type { Action } from './types'

export const startSession = (
  id: string,
  nowIso: string,
  nowMs: number,
  exerciseIds: string[]
): Action => ({ type: 'START_SESSION', payload: { id, nowIso, nowMs, exerciseIds } })

export const logSet = (p: {
  nowIso: string
  nowMs: number
  reps: number
  weight: number
  rir: number
  plannedRestSeconds: number
}): Action => ({ type: 'LOG_SET', payload: p })

export const editSet = (p: { setId: string; reps: number; weight: number; rir: number }): Action => ({
  type: 'EDIT_SET',
  payload: p,
})

export const skipRest = (nowMs: number, nowIso: string): Action => ({
  type: 'SKIP_REST',
  payload: { nowMs, nowIso },
})

export const extendRest = (extraSeconds: number): Action => ({
  type: 'EXTEND_REST',
  payload: { extraSeconds },
})

export const restDone = (nowMs: number, nowIso: string): Action => ({
  type: 'REST_DONE',
  payload: { nowMs, nowIso },
})

export const tick = (nowMs: number, nowIso: string): Action => ({
  type: 'TICK',
  payload: { nowMs, nowIso },
})

export const skipExercise = (exerciseIndex: number, nowMs: number): Action => ({
  type: 'SKIP_EXERCISE',
  payload: { exerciseIndex, nowMs },
})

export const undoSkip = (nowMs: number): Action => ({ type: 'UNDO_SKIP', payload: { nowMs } })

export const advanceToNextExercise = (nowMs: number): Action => ({
  type: 'ADVANCE_TO_NEXT_EXERCISE',
  payload: { nowMs },
})

export const pause = (): Action => ({ type: 'PAUSE' })
export const resume = (): Action => ({ type: 'RESUME' })
export const discard = (): Action => ({ type: 'DISCARD' })

export const completeSession = (nowMs: number, nowIso: string): Action => ({
  type: 'COMPLETE_SESSION',
  payload: { nowMs, nowIso },
})

export const dismissHandoff = (): Action => ({ type: 'DISMISS_HANDOFF' })
```

Create `src/session/seed.ts` EXACTLY (D-15):
```ts
import type { Exercise } from '../persist/schema'

/**
 * Seed mini-routine for v1 (D-15). Used when starting a session and no
 * exercises exist. The dispatcher injects fresh `exerciseId` values per
 * session via the START_SESSION action payload (RESEARCH §Pitfall 4).
 *
 * Each exercise: 4 sets × 8 reps. Hardcoded names; weight/RIR captured live.
 */
export function getSeedExercises(exerciseIds: string[]): Exercise[] {
  if (exerciseIds.length !== 3) {
    throw new Error(`getSeedExercises expects 3 ids, got ${exerciseIds.length}`)
  }
  const names = ['Sentadilla', 'Press banca', 'Remo con barra']
  return names.map((name, i) => ({
    exerciseId: exerciseIds[i],
    name,
    status: i === 0 ? 'active' : 'pending',
    currentSetIndex: 0,
    sets: Array.from({ length: 4 }, (_, j) => ({
      setId: `${exerciseIds[i]}-set-${j + 1}`,
      planned: { reps: 8 },
    })),
  }))
}

/**
 * D-16: prescribed rest seconds based on goal focus.
 */
export function plannedRestForGoal(goalFocus: 'strength' | 'hypertrophy' | 'fat_loss'): number {
  switch (goalFocus) {
    case 'strength':    return 120
    case 'hypertrophy': return 90
    case 'fat_loss':    return 60
  }
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export type Action =" src/session/types.ts` matches
    - `rg "type: 'START_SESSION'" src/session/types.ts` matches
    - `rg "type: 'LOG_SET'" src/session/types.ts` matches
    - `rg "type: 'TICK'" src/session/types.ts` matches
    - `rg "type: 'SKIP_EXERCISE'" src/session/types.ts` matches
    - `rg "type: 'UNDO_SKIP'" src/session/types.ts` matches
    - `rg "type: 'ADVANCE_TO_NEXT_EXERCISE'" src/session/types.ts` matches
    - `rg "type: 'PAUSE'" src/session/types.ts` matches
    - `rg "type: 'RESUME'" src/session/types.ts` matches
    - `rg "type: 'DISCARD'" src/session/types.ts` matches
    - `rg "type: 'REST_DONE'" src/session/types.ts` matches
    - `rg "type: 'EXTEND_REST'" src/session/types.ts` matches
    - `rg "type: 'COMPLETE_SESSION'" src/session/types.ts` matches
    - `rg "type: 'DISMISS_HANDOFF'" src/session/types.ts` matches
    - `rg "export function getSeedExercises" src/session/seed.ts` matches
    - `rg "'Sentadilla'" src/session/seed.ts` matches
    - `rg "'Press banca'" src/session/seed.ts` matches
    - `rg "'Remo con barra'" src/session/seed.ts` matches
    - `rg "length: 4" src/session/seed.ts` matches (4 sets per exercise)
    - `rg "planned: \{ reps: 8 \}" src/session/seed.ts` matches
    - `rg "export function plannedRestForGoal" src/session/seed.ts` matches
    - `rg "case 'strength':\s*return 120" src/session/seed.ts` matches
    - `rg "case 'hypertrophy':\s*return 90" src/session/seed.ts` matches
    - `rg "case 'fat_loss':\s*return 60" src/session/seed.ts` matches
    - `rg "export const startSession" src/session/actions.ts` matches
    - `rg "export const logSet" src/session/actions.ts` matches
    - `rg "export const tick" src/session/actions.ts` matches
    - `npx tsc -b` exits 0
    - `rg "Date\.now|Math\.random|crypto\.randomUUID" src/session/types.ts src/session/actions.ts src/session/seed.ts` returns 0 matches
  </acceptance_criteria>
  <done>Type surface and seed are stable; action creators provide TS-narrowed entry points; no impure calls anywhere in this trio.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write the pure sessionReducer</name>
  <read_first>
    - src/session/types.ts (just created — Action union)
    - src/session/seed.ts (just created — getSeedExercises, plannedRestForGoal)
    - src/persist/schema.ts (CompletedSetSchema fields, RestStateSchema fields)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Example A: FSM with reducer purity" (full)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 4: reducer impurity"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 6: persistence sized to TICK frequency"
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-13 (skip undo 5s window)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-08 (handoff overlay, NOT auto-skip mid-set)
  </read_first>
  <behavior>
    - START_SESSION on idle snapshot: returns snapshot with status='in_progress', exercises=getSeedExercises(payload.exerciseIds), currentExerciseIndex=0, startedAt=nowIso, startedAtMs=nowMs, id=payload.id, rest=null, handoff=null, pendingUndo=null. Existing preferences preserved.
    - START_SESSION on already-in_progress snapshot: returns state unchanged (idempotent).
    - LOG_SET: writes completed { reps, weight, rir, at: nowIso, rest_planned_s: plannedRestSeconds } into the active exercise's currentSetIndex; bumps currentSetIndex; if currentSetIndex < sets.length → set rest = { startedAt: nowIso, startedAtMs: nowMs, endAt: nowMs + plannedRestSeconds*1000, plannedSeconds, exerciseIndex: currentExerciseIndex, setIndex: justCompletedIndex }; else (last set of exercise) → exercise.status='done', if no more pending exercises → session.status='completed', else → handoff = { visibleUntil: nowMs + 3000, nextExerciseIndex: <next pending> }, currentExerciseIndex = nextPending, the new active exercise.status='active'.
    - REST_DONE: clears rest to null. Does NOT change session status.
    - SKIP_REST: same as REST_DONE (clears rest).
    - EXTEND_REST: extends rest.endAt by extraSeconds*1000. No-op if rest is null.
    - TICK: if rest is null OR nowMs < rest.endAt → returns SAME state reference (===). Else → clears rest (rest expired naturally; identical to REST_DONE).
    - SKIP_EXERCISE: marks exercise.status='skipped', writes pendingUndo = { exerciseIndex, expiresAtMs: nowMs+5000, previousStatus: oldStatus }. If skipped exercise was current → advance currentExerciseIndex to next pending; if no more pending → session.status='completed', currentExerciseIndex stays at last index.
    - UNDO_SKIP: if pendingUndo != null and nowMs < pendingUndo.expiresAtMs → restore exercise.status=previousStatus; restore currentExerciseIndex to that exercise; clear pendingUndo. Else → no-op.
    - ADVANCE_TO_NEXT_EXERCISE: clears handoff. If next exercise exists → currentExerciseIndex = next pending; that exercise.status='active'. Else → session.status='completed'.
    - PAUSE: only when status='in_progress'. Sets status='paused'. Preserves rest as-is (timer math handled at resume). Does not mutate exercises.
    - RESUME: only when status='paused'. Sets status='in_progress'. Preserves rest (UI re-derives time-left from endAt).
    - DISCARD: resets to fresh idle session (preserving preferences). exercises=[], rest=null, etc. (RESEARCH: "vuelve a Inicio").
    - COMPLETE_SESSION: forces status='completed'. Used as a terminal action when user taps "Finalizar" early.
    - DISMISS_HANDOFF: clears handoff field (alias of ADVANCE_TO_NEXT_EXERCISE for the user-tap case, but kept distinct for clarity).
    - Reducer must use exhaustive switch with `never` default to force compile-error if Action grows.
  </behavior>
  <action>
Create `src/session/reducer.ts` with the following structure (full implementation; the executor must write the body matching every behavior above). Skeleton + key branches:

```ts
import type { Exercise, SessionV3, SnapshotV3, RestState, HandoffState, SkipUndoToken, CompletedSet } from '../persist/schema'
import type { Action, SessionState } from './types'
import { getSeedExercises } from './seed'

/**
 * Pure FSM reducer for the guided session.
 *
 * INVARIANTS (also enforced via tests in reducer.invariants.test.ts):
 *   INV-01 status === 'in_progress' implies exactly one exercise has status === 'active' (unless all are done/skipped → status flips to 'completed' on the same transition)
 *   INV-02 rest != null implies status === 'in_progress'
 *   INV-03 SKIP_EXERCISE always advances or completes; no orphan in_progress with no active exercise
 *   INV-04 LOG_SET deterministically transitions to either { rest != null } or { status: 'completed' }
 *   INV-05 PAUSE+RESUME preserves exercises array deep-equal
 *   INV-06 TICK with nowMs < endAt returns state by reference (===)
 *   INV-07 reducer never calls Date.now / Math.random / crypto.randomUUID
 *   INV-08 UNDO_SKIP after expiry is a no-op
 *   INV-09 EXTEND_REST when rest is null is a no-op
 *   INV-10 START_SESSION on already in_progress is idempotent (returns same reference)
 */
export function sessionReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'START_SESSION': {
      if (state.session.status === 'in_progress') return state
      const exercises = getSeedExercises(action.payload.exerciseIds)
      return {
        ...state,
        session: {
          status: 'in_progress',
          id: action.payload.id,
          startedAt: action.payload.nowIso,
          startedAtMs: action.payload.nowMs,
          exercises,
          currentExerciseIndex: 0,
          rest: null,
          handoff: null,
          pendingUndo: null,
        },
      }
    }

    case 'LOG_SET': {
      const s = state.session
      if (s.status !== 'in_progress') return state
      const exIdx = s.currentExerciseIndex
      const ex = s.exercises[exIdx]
      if (!ex || ex.status !== 'active') return state
      const setIdx = ex.currentSetIndex
      const set = ex.sets[setIdx]
      if (!set) return state

      const completed: CompletedSet = {
        reps: action.payload.reps,
        weight: action.payload.weight,
        rir: action.payload.rir,
        at: action.payload.nowIso,
        rest_planned_s: action.payload.plannedRestSeconds,
      }

      const updatedSets = ex.sets.map((s2, i) =>
        i === setIdx ? { ...s2, completed } : s2
      )
      const isLastSet = setIdx + 1 >= ex.sets.length
      const updatedEx: Exercise = {
        ...ex,
        sets: updatedSets,
        currentSetIndex: isLastSet ? setIdx : setIdx + 1,
        status: isLastSet ? 'done' : 'active',
      }
      const exercises = s.exercises.map((e, i) => (i === exIdx ? updatedEx : e))

      // Determine next state
      if (!isLastSet) {
        // Stay on this exercise; start rest.
        const rest: RestState = {
          startedAt: action.payload.nowIso,
          startedAtMs: action.payload.nowMs,
          endAt: action.payload.nowMs + action.payload.plannedRestSeconds * 1000,
          plannedSeconds: action.payload.plannedRestSeconds,
          exerciseIndex: exIdx,
          setIndex: setIdx,
        }
        return { ...state, session: { ...s, exercises, rest, handoff: null } }
      }

      // Last set of the exercise → look for next pending
      const nextIdx = exercises.findIndex((e, i) => i > exIdx && e.status === 'pending')
      if (nextIdx === -1) {
        return {
          ...state,
          session: {
            ...s,
            exercises,
            rest: null,
            handoff: null,
            status: 'completed',
          },
        }
      }
      // Advance to handoff: mark next as active
      const handoffExercises = exercises.map((e, i) =>
        i === nextIdx ? { ...e, status: 'active' as const } : e
      )
      const handoff: HandoffState = {
        visibleUntil: action.payload.nowMs + 3000,
        nextExerciseIndex: nextIdx,
      }
      return {
        ...state,
        session: {
          ...s,
          exercises: handoffExercises,
          currentExerciseIndex: nextIdx,
          rest: null,
          handoff,
        },
      }
    }

    case 'EDIT_SET': {
      const s = state.session
      if (s.status !== 'in_progress' && s.status !== 'paused') return state
      let touched = false
      const exercises = s.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((set) => {
          if (set.setId !== action.payload.setId) return set
          if (set.completed == null) return set
          touched = true
          return {
            ...set,
            completed: {
              ...set.completed,
              reps: action.payload.reps,
              weight: action.payload.weight,
              rir: action.payload.rir,
            },
          }
        }),
      }))
      if (!touched) return state
      return { ...state, session: { ...s, exercises } }
    }

    case 'SKIP_REST':
    case 'REST_DONE': {
      if (state.session.rest == null) return state
      return { ...state, session: { ...state.session, rest: null } }
    }

    case 'EXTEND_REST': {
      if (state.session.rest == null) return state
      const rest = { ...state.session.rest, endAt: state.session.rest.endAt + action.payload.extraSeconds * 1000 }
      return { ...state, session: { ...state.session, rest } }
    }

    case 'TICK': {
      const rest = state.session.rest
      if (rest == null) return state
      if (action.payload.nowMs < rest.endAt) return state
      return { ...state, session: { ...state.session, rest: null } }
    }

    case 'SKIP_EXERCISE': {
      const s = state.session
      if (s.status !== 'in_progress') return state
      const target = s.exercises[action.payload.exerciseIndex]
      if (!target || target.status === 'skipped' || target.status === 'done') return state

      const previousStatus = target.status
      const exercises = s.exercises.map((e, i) =>
        i === action.payload.exerciseIndex ? { ...e, status: 'skipped' as const } : e
      )
      const wasCurrent = action.payload.exerciseIndex === s.currentExerciseIndex
      let currentExerciseIndex = s.currentExerciseIndex
      let nextActiveExercises = exercises
      let nextStatus: SessionV3['status'] = s.status

      if (wasCurrent) {
        const nextPending = exercises.findIndex((e, i) => i > action.payload.exerciseIndex && e.status === 'pending')
        if (nextPending === -1) {
          nextStatus = 'completed'
        } else {
          currentExerciseIndex = nextPending
          nextActiveExercises = exercises.map((e, i) =>
            i === nextPending ? { ...e, status: 'active' as const } : e
          )
        }
      }

      const pendingUndo: SkipUndoToken = {
        exerciseIndex: action.payload.exerciseIndex,
        expiresAtMs: action.payload.nowMs + 5000,
        previousStatus,
      }

      return {
        ...state,
        session: {
          ...s,
          exercises: nextActiveExercises,
          currentExerciseIndex,
          rest: null,
          handoff: null,
          pendingUndo,
          status: nextStatus,
        },
      }
    }

    case 'UNDO_SKIP': {
      const s = state.session
      const tok = s.pendingUndo
      if (tok == null) return state
      if (action.payload.nowMs >= tok.expiresAtMs) return { ...state, session: { ...s, pendingUndo: null } }

      const restored = s.exercises.map((e, i) =>
        i === tok.exerciseIndex ? { ...e, status: tok.previousStatus } : e
      )
      // If we advanced past, roll currentExerciseIndex back; also unset whatever was made active
      const finalExercises = restored.map((e, i) => {
        if (i === tok.exerciseIndex) return e
        if (e.status === 'active' && tok.previousStatus === 'active') {
          return { ...e, status: 'pending' as const }
        }
        return e
      })
      return {
        ...state,
        session: {
          ...s,
          exercises: finalExercises,
          currentExerciseIndex: tok.previousStatus === 'active' ? tok.exerciseIndex : s.currentExerciseIndex,
          status: 'in_progress',
          pendingUndo: null,
        },
      }
    }

    case 'ADVANCE_TO_NEXT_EXERCISE':
    case 'DISMISS_HANDOFF': {
      const s = state.session
      if (s.handoff == null && action.type === 'DISMISS_HANDOFF') return state
      return { ...state, session: { ...s, handoff: null } }
    }

    case 'PAUSE': {
      if (state.session.status !== 'in_progress') return state
      return { ...state, session: { ...state.session, status: 'paused' } }
    }

    case 'RESUME': {
      if (state.session.status !== 'paused') return state
      return { ...state, session: { ...state.session, status: 'in_progress' } }
    }

    case 'DISCARD': {
      return {
        ...state,
        session: {
          status: 'idle',
          id: undefined,
          startedAt: undefined,
          startedAtMs: undefined,
          exercises: [],
          currentExerciseIndex: 0,
          rest: null,
          handoff: null,
          pendingUndo: null,
        },
      }
    }

    case 'COMPLETE_SESSION': {
      return { ...state, session: { ...state.session, status: 'completed', rest: null, handoff: null } }
    }

    default: {
      const _exhaustive: never = action
      void _exhaustive
      return state
    }
  }
}
```
  </action>
  <verify>
    <automated>npx tsc -b && npm test -- --run src/session/reducer.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function sessionReducer" src/session/reducer.ts` matches
    - `rg "Date\.now|Math\.random|crypto\.randomUUID" src/session/reducer.ts` returns 0 matches (PURITY GATE — RESEARCH §Pitfall 4)
    - `rg "INV-01" src/session/reducer.ts` matches (invariant comments)
    - `rg "case 'START_SESSION'" src/session/reducer.ts` matches
    - `rg "case 'LOG_SET'" src/session/reducer.ts` matches
    - `rg "case 'SKIP_EXERCISE'" src/session/reducer.ts` matches
    - `rg "case 'UNDO_SKIP'" src/session/reducer.ts` matches
    - `rg "case 'TICK'" src/session/reducer.ts` matches
    - `rg "_exhaustive: never" src/session/reducer.ts` matches (exhaustiveness)
    - `rg "rest_planned_s: action.payload.plannedRestSeconds" src/session/reducer.ts` matches
    - `rg "expiresAtMs: action.payload.nowMs \+ 5000" src/session/reducer.ts` matches (D-13: 5s undo)
    - `rg "visibleUntil: action.payload.nowMs \+ 3000" src/session/reducer.ts` matches (D-08: 3s handoff)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>Reducer compiles; pure; all 14 action branches reachable.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Write reducer tests + invariants tests</name>
  <read_first>
    - src/session/reducer.ts (just written)
    - src/session/types.ts
    - src/session/seed.ts
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"FSM Invariants" INV-01..INV-10
    - src/persist/snapshot.ts createInitialSnapshot (use as starting state)
  </read_first>
  <behavior>
    - reducer.test.ts covers each Action type with at least one happy-path case + 1-2 edge cases.
    - reducer.invariants.test.ts loops a sequence of actions and asserts each invariant.
    - All tests pass.
  </behavior>
  <action>
Create `src/session/reducer.test.ts` with at least these `it` blocks (executor writes full bodies):

```ts
import { describe, expect, it } from 'vitest'
import { sessionReducer } from './reducer'
import * as A from './actions'
import { createInitialSnapshot } from '../persist/snapshot'
import type { SnapshotV3 } from '../persist/schema'

const T0 = 1_700_000_000_000
const ISO0 = '2024-12-31T00:00:00.000Z'
const IDS = ['ex-a', 'ex-b', 'ex-c']

function fresh(): SnapshotV3 {
  const s = createInitialSnapshot()
  return {
    ...s,
    preferences: { goalFocus: 'hypertrophy', equipmentNote: '', restAlertSound: true, restAlertVibration: true, effortMetric: 'rir' },
  }
}

describe('sessionReducer', () => {
  describe('START_SESSION', () => {
    it('seeds 3 exercises × 4 sets and marks first active', () => {
      const next = sessionReducer(fresh(), A.startSession('id-1', ISO0, T0, IDS))
      expect(next.session.status).toBe('in_progress')
      expect(next.session.exercises).toHaveLength(3)
      expect(next.session.exercises[0].status).toBe('active')
      expect(next.session.exercises[1].status).toBe('pending')
      expect(next.session.exercises[0].sets).toHaveLength(4)
      expect(next.session.exercises[0].sets[0].planned.reps).toBe(8)
    })

    it('is idempotent on already-in_progress session (returns same reference)', () => {
      const s1 = sessionReducer(fresh(), A.startSession('id-1', ISO0, T0, IDS))
      const s2 = sessionReducer(s1, A.startSession('id-2', ISO0, T0, IDS))
      expect(s2).toBe(s1)
    })
  })

  describe('LOG_SET', () => {
    it('writes completed set with reps/weight/rir/at/rest_planned_s', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0 + 30_000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const c = s.session.exercises[0].sets[0].completed
      expect(c).toBeDefined()
      expect(c?.reps).toBe(8)
      expect(c?.weight).toBe(80)
      expect(c?.rir).toBe(2)
      expect(c?.at).toBe(ISO0)
      expect(c?.rest_planned_s).toBe(90)
    })

    it('starts rest with endAt = nowMs + plannedRestSeconds*1000', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      expect(s.session.rest).not.toBeNull()
      expect(s.session.rest?.endAt).toBe(T0 + 90_000)
      expect(s.session.rest?.plannedSeconds).toBe(90)
    })

    it('on last set of last exercise → status = completed, rest = null', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      // Complete all 12 sets (3 ex × 4 sets) in sequence
      for (let i = 0; i < 12; i++) {
        s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0 + i * 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
        // Between exercises, dismiss handoff to keep session moving
        if (s.session.handoff != null) s = sessionReducer(s, A.dismissHandoff())
      }
      expect(s.session.status).toBe('completed')
      expect(s.session.rest).toBeNull()
    })

    it('on last set of an exercise (not last) → handoff visibleUntil = nowMs+3000', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      for (let i = 0; i < 4; i++) {
        s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0 + i * 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      }
      expect(s.session.handoff).not.toBeNull()
      expect(s.session.handoff?.visibleUntil).toBe(T0 + 3 * 1000 + 3000)
      expect(s.session.handoff?.nextExerciseIndex).toBe(1)
      expect(s.session.exercises[0].status).toBe('done')
      expect(s.session.exercises[1].status).toBe('active')
    })
  })

  describe('TICK', () => {
    it('returns same reference when rest is null', () => {
      const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      const out = sessionReducer(s, A.tick(T0 + 1000, ISO0))
      expect(out).toBe(s)
    })

    it('returns same reference when nowMs < endAt (no localStorage churn)', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const out = sessionReducer(s, A.tick(T0 + 30_000, ISO0))
      expect(out).toBe(s)
    })

    it('clears rest when nowMs >= endAt', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const out = sessionReducer(s, A.tick(T0 + 91_000, ISO0))
      expect(out.session.rest).toBeNull()
    })
  })

  describe('SKIP_EXERCISE + UNDO_SKIP', () => {
    it('skipping current exercise advances to next pending', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.skipExercise(0, T0 + 1000))
      expect(s.session.exercises[0].status).toBe('skipped')
      expect(s.session.exercises[1].status).toBe('active')
      expect(s.session.currentExerciseIndex).toBe(1)
      expect(s.session.pendingUndo).not.toBeNull()
      expect(s.session.pendingUndo?.expiresAtMs).toBe(T0 + 1000 + 5000)
    })

    it('UNDO_SKIP within 5s window restores previous status', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.skipExercise(0, T0 + 1000))
      s = sessionReducer(s, A.undoSkip(T0 + 2000))
      expect(s.session.exercises[0].status).toBe('active')
      expect(s.session.currentExerciseIndex).toBe(0)
      expect(s.session.pendingUndo).toBeNull()
    })

    it('UNDO_SKIP after expiry is a no-op (clears token only)', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.skipExercise(0, T0 + 1000))
      const before = s.session.exercises.map((e) => e.status)
      s = sessionReducer(s, A.undoSkip(T0 + 7_000))
      expect(s.session.exercises.map((e) => e.status)).toEqual(before)
      expect(s.session.pendingUndo).toBeNull()
    })

    it('skipping last pending exercise transitions to completed', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.skipExercise(0, T0))
      s = sessionReducer(s, A.skipExercise(1, T0))
      s = sessionReducer(s, A.skipExercise(2, T0))
      expect(s.session.status).toBe('completed')
    })
  })

  describe('PAUSE / RESUME / DISCARD', () => {
    it('PAUSE then RESUME preserves exercises array deep-equal', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const before = s.session.exercises
      s = sessionReducer(s, A.pause())
      expect(s.session.status).toBe('paused')
      s = sessionReducer(s, A.resume())
      expect(s.session.status).toBe('in_progress')
      expect(s.session.exercises).toEqual(before)
    })

    it('DISCARD resets to idle but keeps preferences', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.discard())
      expect(s.session.status).toBe('idle')
      expect(s.session.exercises).toEqual([])
      expect(s.preferences?.goalFocus).toBe('hypertrophy')
    })
  })

  describe('REST_DONE / SKIP_REST / EXTEND_REST', () => {
    it('REST_DONE clears rest', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      s = sessionReducer(s, A.restDone(T0 + 90_000, ISO0))
      expect(s.session.rest).toBeNull()
    })

    it('SKIP_REST clears rest', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      s = sessionReducer(s, A.skipRest(T0 + 30_000, ISO0))
      expect(s.session.rest).toBeNull()
    })

    it('EXTEND_REST extends endAt by extraSeconds*1000', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const before = s.session.rest!.endAt
      s = sessionReducer(s, A.extendRest(15))
      expect(s.session.rest!.endAt).toBe(before + 15_000)
    })

    it('EXTEND_REST when rest is null is a no-op', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      const out = sessionReducer(s, A.extendRest(15))
      expect(out).toBe(s)
    })
  })

  describe('EDIT_SET', () => {
    it('updates reps/weight/rir on a previously completed set', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      const setId = s.session.exercises[0].sets[0].setId
      s = sessionReducer(s, A.editSet({ setId, reps: 7, weight: 82.5, rir: 1 }))
      const c = s.session.exercises[0].sets[0].completed!
      expect(c.reps).toBe(7)
      expect(c.weight).toBe(82.5)
      expect(c.rir).toBe(1)
    })
  })
})
```

Create `src/session/reducer.invariants.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sessionReducer } from './reducer'
import * as A from './actions'
import { createInitialSnapshot } from '../persist/snapshot'

const ISO0 = '2024-12-31T00:00:00.000Z'
const IDS = ['ex-a', 'ex-b', 'ex-c']

function fresh() {
  return {
    ...createInitialSnapshot(),
    preferences: { goalFocus: 'hypertrophy' as const, equipmentNote: '', restAlertSound: true, restAlertVibration: true, effortMetric: 'rir' as const },
  }
}

describe('FSM invariants', () => {
  it('INV-01 in_progress implies at most one active exercise (or status flips)', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    const counts = (st: typeof s) => st.session.exercises.filter((e) => e.status === 'active').length
    expect(counts(s)).toBeLessThanOrEqual(1)
    // Walk through a full session
    for (let i = 0; i < 12; i++) {
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: 1000 + i * 100, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
      if (s.session.handoff != null) s = sessionReducer(s, A.dismissHandoff())
      if (s.session.status === 'in_progress') expect(counts(s)).toBe(1)
    }
    expect(s.session.status).toBe('completed')
    expect(counts(s)).toBe(0) // when completed, no active
  })

  it('INV-02 rest != null implies session.status === in_progress', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    expect(s.session.rest).not.toBeNull()
    expect(s.session.status).toBe('in_progress')
  })

  it('INV-03 SKIP_EXERCISE never leaves orphan in_progress with no active exercise', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(s, A.skipExercise(0, 2000))
    if (s.session.status === 'in_progress') {
      const active = s.session.exercises.filter((e) => e.status === 'active').length
      expect(active).toBe(1)
    } else {
      expect(s.session.status).toBe('completed')
    }
  })

  it('INV-05 PAUSE+RESUME preserves exercises array deep-equal', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    const before = s.session.exercises
    s = sessionReducer(s, A.pause())
    s = sessionReducer(s, A.resume())
    expect(s.session.exercises).toEqual(before)
  })

  it('INV-06 TICK with nowMs < endAt returns same reference', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    const out = sessionReducer(s, A.tick(2000, ISO0))
    expect(out).toBe(s)
  })

  it('INV-08 UNDO_SKIP after expiry is a no-op for exercises', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(s, A.skipExercise(0, 2000))
    const skippedStatuses = s.session.exercises.map((e) => e.status)
    s = sessionReducer(s, A.undoSkip(8000))
    expect(s.session.exercises.map((e) => e.status)).toEqual(skippedStatuses)
  })

  it('INV-10 START_SESSION on already in_progress is idempotent', () => {
    const s1 = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    const s2 = sessionReducer(s1, A.startSession('id-2', ISO0, 2000, IDS))
    expect(s2).toBe(s1)
  })
})
```
  </action>
  <verify>
    <automated>npm test -- --run src/session/reducer.test.ts src/session/reducer.invariants.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "describe\('sessionReducer'" src/session/reducer.test.ts` matches
    - `rg "INV-01" src/session/reducer.invariants.test.ts` matches
    - `rg "INV-02" src/session/reducer.invariants.test.ts` matches
    - `rg "INV-05" src/session/reducer.invariants.test.ts` matches
    - `rg "INV-06" src/session/reducer.invariants.test.ts` matches
    - `rg "INV-10" src/session/reducer.invariants.test.ts` matches
    - `npm test -- --run src/session/reducer.test.ts src/session/reducer.invariants.test.ts` exits 0
    - All test counts: reducer.test.ts ≥ 16 tests; invariants test ≥ 7 tests
    - `rg "Date\.now|Math\.random" src/session/reducer.ts` returns 0 matches (RE-VERIFY purity gate)
  </acceptance_criteria>
  <done>Reducer is fully covered; purity gate stays green; invariants pass.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- `npx tsc -b` exits 0 (within new src/session/* surface; App.tsx/SessionScreen.tsx may still have errors — that's plan 02-10).
- `rg "Date\.now|Math\.random" src/session/reducer.ts` returns 0 matches.
- `npm test -- --run src/session/` is fully green.
</verification>

<success_criteria>
The session FSM is implemented, pure, exhaustively tested, and ready for selectors (plan 02-05) + UI (plans 02-07/08) consumption. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-04-SUMMARY.md` documenting:
- Action union shape (one paragraph)
- Reducer transition matrix (table: Action → next state shape)
- Invariants verified
- Test counts
- D-22 compliance confirmed
</output>
