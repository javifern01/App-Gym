import { describe, expect, it } from 'vitest'
import { sessionReducer } from './reducer'
import * as A from './actions'
import { createInitialSnapshot } from '../persist/snapshot'

const ISO0 = '2024-12-31T00:00:00.000Z'
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

describe('FSM invariants', () => {
  it('INV-01 in_progress implies at most one active exercise (or status flips)', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    const counts = (st: typeof s) => st.session.exercises.filter((e) => e.status === 'active').length
    expect(counts(s)).toBeLessThanOrEqual(1)
    // Walk through a full session
    for (let i = 0; i < 12; i++) {
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: 1000 + i * 100, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      if (s.session.handoff != null) s = sessionReducer(s, A.dismissHandoff())
      if (s.session.status === 'in_progress') expect(counts(s)).toBe(1)
    }
    expect(s.session.status).toBe('completed')
    expect(counts(s)).toBe(0) // when completed, no active
  })

  it('INV-02 rest != null implies session.status === in_progress', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
    )
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
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
    )
    const before = s.session.exercises
    s = sessionReducer(s, A.pause())
    s = sessionReducer(s, A.resume())
    expect(s.session.exercises).toEqual(before)
  })

  it('INV-06 TICK with nowMs < endAt returns same reference', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, 1000, IDS))
    s = sessionReducer(
      s,
      A.logSet({ nowIso: ISO0, nowMs: 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
    )
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
