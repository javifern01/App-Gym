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

export const editSet = (p: {
  setId: string
  reps: number
  weight: number
  rir: number
}): Action => ({ type: 'EDIT_SET', payload: p })

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

export const undoSkip = (nowMs: number): Action => ({
  type: 'UNDO_SKIP',
  payload: { nowMs },
})

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
