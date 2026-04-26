import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './snapshot'
import { STORAGE_KEY } from './storageKey'
import { SCHEMA_VERSION, type SnapshotV1, type SnapshotV2, type SnapshotV3 } from './schema'

describe('persist snapshot V3', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a valid V3 snapshot', () => {
    const snapshot: SnapshotV3 = {
      schemaVersion: SCHEMA_VERSION,
      preferences: {
        goalFocus: 'strength',
        equipmentNote: 'gym completo',
        restAlertSound: true,
        restAlertVibration: true,
        effortMetric: 'rir',
      },
      session: {
        status: 'in_progress',
        id: 'sess-1',
        startedAt: '2026-01-01T00:00:00.000Z',
        startedAtMs: 1767225600000,
        exercises: [
          {
            exerciseId: 'ex-1',
            name: 'Press banca',
            status: 'active',
            currentSetIndex: 0,
            sets: [{ setId: 's1', planned: { reps: 8 } }],
          },
        ],
        currentExerciseIndex: 0,
        rest: null,
        handoff: null,
        pendingUndo: null,
      },
    }

    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot).toEqual(snapshot)
  })

  it('preserves completed set data with weight, rir, rest_planned_s, rest_actual_s', () => {
    const snapshot: SnapshotV3 = {
      ...createInitialSnapshot(),
      preferences: {
        goalFocus: 'hypertrophy',
        equipmentNote: '',
        restAlertSound: true,
        restAlertVibration: true,
        effortMetric: 'rir',
      },
      session: {
        status: 'in_progress',
        id: 's',
        startedAt: '2026-01-01T00:00:00.000Z',
        startedAtMs: 1767225600000,
        exercises: [
          {
            exerciseId: 'e',
            name: 'Sentadilla',
            status: 'active',
            currentSetIndex: 1,
            sets: [
              {
                setId: 's1',
                planned: { reps: 10 },
                completed: {
                  reps: 10,
                  weight: 80,
                  rir: 2,
                  at: '2026-01-01T00:01:00.000Z',
                  rest_planned_s: 90,
                  rest_actual_s: 92,
                },
              },
            ],
          },
        ],
        currentExerciseIndex: 0,
        rest: null,
        handoff: null,
        pendingUndo: null,
      },
    }

    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    const completed = loaded.snapshot.session.exercises[0].sets[0].completed
    expect(completed?.weight).toBe(80)
    expect(completed?.rir).toBe(2)
    expect(completed?.rest_planned_s).toBe(90)
    expect(completed?.rest_actual_s).toBe(92)
  })

  it('migrates a V2 snapshot into V3 (D-25)', () => {
    const v2: SnapshotV2 = {
      schemaVersion: 2,
      preferences: { goalFocus: 'strength', equipmentNote: 'gym' },
      session: {
        status: 'in_progress',
        id: 'old',
        startedAt: '2026-01-01T00:00:00.000Z',
        currentExerciseIndex: 0,
        exerciseName: 'Press banca',
        sets: [
          { setId: 's1', planned: { reps: 8 }, completed: { reps: 8, at: '2026-01-01T00:01:00.000Z' } },
          { setId: 's2', planned: { reps: 8 } },
        ],
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2))

    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.snapshot.schemaVersion).toBe(3)
    expect(loaded.snapshot.session.status).toBe('idle')
    expect(loaded.snapshot.session.exercises).toHaveLength(1)
    expect(loaded.snapshot.session.exercises[0].name).toBe('Press banca')
    expect(loaded.snapshot.session.exercises[0].status).toBe('pending')
    // D-25: legacy completed dropped because V2 lacked weight/rir
    expect(loaded.snapshot.session.exercises[0].sets.every((s) => s.completed === undefined)).toBe(true)
    expect(loaded.snapshot.preferences?.restAlertSound).toBe(true)
    expect(loaded.snapshot.preferences?.restAlertVibration).toBe(true)
    expect(loaded.snapshot.preferences?.effortMetric).toBe('rir')
  })

  it('migrates a V1 snapshot into V3 chained', () => {
    const v1: SnapshotV1 = {
      schemaVersion: 1,
      sets: [{ setId: 's1', planned: { reps: 10 } }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.snapshot.schemaVersion).toBe(3)
    expect(loaded.snapshot.session.exercises).toHaveLength(1)
    expect(loaded.snapshot.session.exercises[0].sets).toHaveLength(1)
  })

  it('fails gracefully on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(loadSnapshot()).toEqual({ ok: false, reason: 'invalid_json' })
  })

  it('fails gracefully on unknown schema shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, foo: 'bar' }))
    expect(loadSnapshot()).toEqual({ ok: false, reason: 'invalid_schema' })
  })

  it('saveSnapshot rejects RIR > 4', () => {
    const snapshot: SnapshotV3 = {
      ...createInitialSnapshot(),
      session: {
        ...createInitialSnapshot().session,
        exercises: [
          {
            exerciseId: 'e',
            name: 'X',
            status: 'active',
            currentSetIndex: 0,
            sets: [
              {
                setId: 's',
                planned: { reps: 1 },
                // rir=5 is a valid `number` at the type level (Zod's min/max
                // doesn't narrow into the inferred type); the rejection happens
                // at runtime via SnapshotV3Schema.parse inside saveSnapshot.
                completed: { reps: 1, weight: 0, rir: 5, at: '2026-01-01T00:00:00.000Z' },
              },
            ],
          },
        ],
      },
    }
    expect(() => saveSnapshot(snapshot)).toThrow()
  })
})
