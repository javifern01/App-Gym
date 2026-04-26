import type { Exercise } from '../persist/schema'
import type { SessionState } from './types'

export type NextAction =
  | { kind: 'idle' }
  | { kind: 'log_set'; exerciseName: string; setIndex: number; setsTotal: number }
  | { kind: 'rest'; secondsRemaining: number; exerciseName: string }
  | { kind: 'handoff'; nextExerciseName: string; msRemaining: number }
  | { kind: 'paused' }
  | { kind: 'summary' }

/**
 * SESS-01 enforcement: this function NEVER returns null/undefined for a session in
 * 'in_progress' or 'paused' or 'completed' state. Every status maps to a concrete
 * "siguiente acción" the UI can render.
 */
export function selectNextAction(state: SessionState, nowMs: number = 0): NextAction {
  const s = state.session
  if (s.status === 'idle') return { kind: 'idle' }
  if (s.status === 'completed') return { kind: 'summary' }
  if (s.status === 'paused') return { kind: 'paused' }
  // in_progress
  if (s.handoff != null) {
    const next = s.exercises[s.handoff.nextExerciseIndex]
    return {
      kind: 'handoff',
      nextExerciseName: next?.name ?? '',
      msRemaining: Math.max(0, s.handoff.visibleUntil - nowMs),
    }
  }
  if (s.rest != null) {
    const ex = s.exercises[s.rest.exerciseIndex]
    return {
      kind: 'rest',
      secondsRemaining: Math.max(0, Math.ceil((s.rest.endAt - nowMs) / 1000)),
      exerciseName: ex?.name ?? '',
    }
  }
  const ex = s.exercises[s.currentExerciseIndex]
  if (ex == null) {
    // Defensive: should never happen in 'in_progress' (INV-01). Return summary kind so UI
    // doesn't crash on stale data.
    return { kind: 'summary' }
  }
  return {
    kind: 'log_set',
    exerciseName: ex.name,
    setIndex: ex.currentSetIndex,
    setsTotal: ex.sets.length,
  }
}

export function selectActiveExercise(state: SessionState): Exercise | null {
  const s = state.session
  if (s.status !== 'in_progress' && s.status !== 'paused') return null
  return s.exercises[s.currentExerciseIndex] ?? null
}

export function selectActiveSet(state: SessionState) {
  const ex = selectActiveExercise(state)
  if (!ex) return null
  return ex.sets[ex.currentSetIndex] ?? null
}

export function selectProgress(state: SessionState): {
  setsTotal: number
  setsCompleted: number
} {
  let setsTotal = 0
  let setsCompleted = 0
  for (const ex of state.session.exercises) {
    setsTotal += ex.sets.length
    for (const set of ex.sets) {
      if (set.completed != null) setsCompleted += 1
    }
  }
  return { setsTotal, setsCompleted }
}

export function selectRestRemainingMs(state: SessionState, nowMs: number): number {
  const r = state.session.rest
  if (r == null) return 0
  return Math.max(0, r.endAt - nowMs)
}

export function selectIsRestExpired(state: SessionState, nowMs: number): boolean {
  const r = state.session.rest
  return r != null && nowMs >= r.endAt
}

export function selectCompletedSetCount(state: SessionState): number {
  return selectProgress(state).setsCompleted
}
