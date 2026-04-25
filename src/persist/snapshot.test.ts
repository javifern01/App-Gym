import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './snapshot'
import { STORAGE_KEY } from './storageKey'
import { SCHEMA_VERSION, type SnapshotV1, type SnapshotV2 } from './schema'

describe('persist snapshot', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a valid snapshot through localStorage', () => {
    const snapshot: SnapshotV2 = {
      ...createInitialSnapshot(),
      schemaVersion: SCHEMA_VERSION,
      preferences: { goalFocus: 'strength', equipmentNote: 'gym completo' },
      session: {
        ...createInitialSnapshot().session,
        status: 'in_progress',
        id: 'sess-1',
        startedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        sets: [{ setId: 's1', planned: { reps: 10 } }],
      },
    }

    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()

    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot).toEqual(snapshot)
  })

  it('preserves completed set data', () => {
    const snapshot: SnapshotV2 = {
      ...createInitialSnapshot(),
      schemaVersion: SCHEMA_VERSION,
      preferences: { goalFocus: 'hypertrophy', equipmentNote: 'nada especial' },
      session: {
        ...createInitialSnapshot().session,
        status: 'in_progress',
        id: 'sess-1',
        startedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        sets: [
          {
            setId: 's1',
            planned: { reps: 10 },
            completed: { reps: 10, at: new Date('2026-01-01T00:00:00.000Z').toISOString() },
          },
        ],
      },
    }

    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()

    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot.session.sets[0]?.completed?.reps).toBe(10)
  })

  it('migrates a V1 snapshot into V2', () => {
    const v1: SnapshotV1 = {
      schemaVersion: 1,
      sets: [{ setId: 's1', planned: { reps: 10 } }],
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
    const loaded = loadSnapshot()

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.snapshot.schemaVersion).toBe(2)
    expect(loaded.snapshot.preferences).toBeUndefined()
    expect(loaded.snapshot.session.status).toBe('idle')
    expect(loaded.snapshot.session.sets).toHaveLength(1)
  })

  it('fails gracefully on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    const loaded = loadSnapshot()
    expect(loaded).toEqual({ ok: false, reason: 'invalid_json' })
  })
})

