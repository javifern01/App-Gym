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
    preferences: {
      goalFocus: 'hypertrophy',
      equipmentNote: '',
      restAlertSound: true,
      restAlertVibration: true,
      effortMetric: 'rir',
    },
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
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0 + 30_000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
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
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      expect(s.session.rest).not.toBeNull()
      expect(s.session.rest?.endAt).toBe(T0 + 90_000)
      expect(s.session.rest?.plannedSeconds).toBe(90)
    })

    it('on last set of last exercise → status = completed, rest = null', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      // Complete all 12 sets (3 ex × 4 sets) in sequence
      for (let i = 0; i < 12; i++) {
        s = sessionReducer(
          s,
          A.logSet({ nowIso: ISO0, nowMs: T0 + i * 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
        )
        // Between exercises, dismiss handoff to keep session moving
        if (s.session.handoff != null) s = sessionReducer(s, A.dismissHandoff())
      }
      expect(s.session.status).toBe('completed')
      expect(s.session.rest).toBeNull()
    })

    it('on last set of an exercise (not last) → handoff visibleUntil = nowMs+3000', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      for (let i = 0; i < 4; i++) {
        s = sessionReducer(
          s,
          A.logSet({ nowIso: ISO0, nowMs: T0 + i * 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
        )
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
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      const out = sessionReducer(s, A.tick(T0 + 30_000, ISO0))
      expect(out).toBe(s)
    })

    it('clears rest when nowMs >= endAt', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
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
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
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
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      s = sessionReducer(s, A.restDone(T0 + 90_000, ISO0))
      expect(s.session.rest).toBeNull()
    })

    it('SKIP_REST clears rest', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      s = sessionReducer(s, A.skipRest(T0 + 30_000, ISO0))
      expect(s.session.rest).toBeNull()
    })

    it('EXTEND_REST extends endAt by extraSeconds*1000', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      const before = s.session.rest!.endAt
      s = sessionReducer(s, A.extendRest(15))
      expect(s.session.rest!.endAt).toBe(before + 15_000)
    })

    it('EXTEND_REST when rest is null is a no-op', () => {
      const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      const out = sessionReducer(s, A.extendRest(15))
      expect(out).toBe(s)
    })
  })

  describe('EDIT_SET', () => {
    it('updates reps/weight/rir on a previously completed set', () => {
      let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
      s = sessionReducer(
        s,
        A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }),
      )
      const setId = s.session.exercises[0].sets[0].setId
      s = sessionReducer(s, A.editSet({ setId, reps: 7, weight: 82.5, rir: 1 }))
      const c = s.session.exercises[0].sets[0].completed!
      expect(c.reps).toBe(7)
      expect(c.weight).toBe(82.5)
      expect(c.rir).toBe(1)
    })
  })
})
