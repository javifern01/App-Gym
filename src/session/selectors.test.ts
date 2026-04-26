import { describe, expect, it } from 'vitest'
import {
  selectNextAction,
  selectActiveExercise,
  selectActiveSet,
  selectProgress,
  selectRestRemainingMs,
  selectIsRestExpired,
} from './selectors'
import { sessionReducer } from './reducer'
import * as A from './actions'
import { createInitialSnapshot } from '../persist/snapshot'

const ISO0 = '2024-12-31T00:00:00.000Z'
const T0 = 1_700_000_000_000
const IDS = ['ex-a', 'ex-b', 'ex-c']
function fresh() {
  return {
    ...createInitialSnapshot(),
    preferences: {
      goalFocus: 'hypertrophy' as const,
      equipmentNote: '',
      restAlertSound: true,
      restAlertVibration: true,
      effortMetric: 'rir' as const,
    },
  }
}

describe('selectNextAction', () => {
  it('returns idle on a fresh snapshot', () => {
    expect(selectNextAction(fresh())).toEqual({ kind: 'idle' })
  })

  it('returns log_set after START_SESSION', () => {
    const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    const a = selectNextAction(s)
    expect(a.kind).toBe('log_set')
    if (a.kind === 'log_set') {
      expect(a.exerciseName).toBe('Sentadilla')
      expect(a.setIndex).toBe(0)
      expect(a.setsTotal).toBe(4)
    }
  })

  it('returns rest after LOG_SET', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 })
    )
    const a = selectNextAction(s, T0 + 30_000)
    expect(a.kind).toBe('rest')
    if (a.kind === 'rest') {
      expect(a.secondsRemaining).toBe(60) // (T0+90_000 - (T0+30_000)) / 1000 = 60
    }
  })

  it('returns handoff after last set of an exercise', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    for (let i = 0; i < 4; i++) {
      s = sessionReducer(
        s,
        A.logSet({
          nowIso: ISO0,
          nowMs: T0 + i * 1000,
          reps: 8,
          weight: 80,
          rir: 2,
          plannedRestSeconds: 90,
        })
      )
    }
    const a = selectNextAction(s, T0 + 4000)
    expect(a.kind).toBe('handoff')
    if (a.kind === 'handoff') {
      expect(a.nextExerciseName).toBe('Press banca')
      expect(a.msRemaining).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns summary when status === completed', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.completeSession(T0 + 1000, ISO0))
    expect(selectNextAction(s)).toEqual({ kind: 'summary' })
  })

  it('returns paused when status === paused', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.pause())
    expect(selectNextAction(s)).toEqual({ kind: 'paused' })
  })

  it('NEVER returns a kind that the UI cannot render (SESS-01 contract)', () => {
    const states = [fresh(), sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))]
    for (const s of states) {
      const a = selectNextAction(s, T0)
      expect(['idle', 'log_set', 'rest', 'handoff', 'paused', 'summary']).toContain(a.kind)
    }
  })
})

describe('selectActiveExercise / selectActiveSet', () => {
  it('returns null on idle', () => {
    expect(selectActiveExercise(fresh())).toBeNull()
    expect(selectActiveSet(fresh())).toBeNull()
  })

  it('returns active exercise + set during in_progress', () => {
    const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    expect(selectActiveExercise(s)?.name).toBe('Sentadilla')
    expect(selectActiveSet(s)?.planned.reps).toBe(8)
  })
})

describe('selectProgress', () => {
  it('counts completed sets across all exercises', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    expect(selectProgress(s)).toEqual({ setsTotal: 12, setsCompleted: 0 })
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 })
    )
    expect(selectProgress(s)).toEqual({ setsTotal: 12, setsCompleted: 1 })
  })
})

describe('selectRestRemainingMs', () => {
  it('returns 0 when rest is null', () => {
    const s = fresh()
    expect(selectRestRemainingMs(s, T0)).toBe(0)
  })

  it('returns clamped delta when rest is active', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 })
    )
    expect(selectRestRemainingMs(s, T0 + 30_000)).toBe(60_000)
    expect(selectRestRemainingMs(s, T0 + 200_000)).toBe(0)
  })
})

describe('selectIsRestExpired', () => {
  it('false when rest is null', () => {
    expect(selectIsRestExpired(fresh(), T0)).toBe(false)
  })
  it('true when nowMs >= endAt', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 })
    )
    expect(selectIsRestExpired(s, T0 + 89_999)).toBe(false)
    expect(selectIsRestExpired(s, T0 + 90_000)).toBe(true)
  })
})
