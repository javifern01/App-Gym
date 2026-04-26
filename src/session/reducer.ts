import type {
  Exercise,
  SessionV3,
  RestState,
  HandoffState,
  SkipUndoToken,
  CompletedSet,
} from '../persist/schema'
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

      if (!isLastSet) {
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

      // Last set of exercise → look for next pending
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
      const rest = {
        ...state.session.rest,
        endAt: state.session.rest.endAt + action.payload.extraSeconds * 1000,
      }
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
        const nextPending = exercises.findIndex(
          (e, i) => i > action.payload.exerciseIndex && e.status === 'pending'
        )
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
      if (action.payload.nowMs >= tok.expiresAtMs) {
        return { ...state, session: { ...s, pendingUndo: null } }
      }

      const restored = s.exercises.map((e, i) =>
        i === tok.exerciseIndex ? { ...e, status: tok.previousStatus } : e
      )
      // Roll back any exercise that was set to 'active' after the skip
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
          currentExerciseIndex:
            tok.previousStatus === 'active' ? tok.exerciseIndex : s.currentExerciseIndex,
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
      return {
        ...state,
        session: { ...state.session, status: 'completed', rest: null, handoff: null },
      }
    }

    default: {
      const _exhaustive: never = action
      void _exhaustive
      return state
    }
  }
}
