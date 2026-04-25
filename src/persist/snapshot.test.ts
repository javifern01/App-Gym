import { describe, expect, it, beforeEach } from 'vitest'
import { loadSnapshot, saveSnapshot } from './snapshot'
import { STORAGE_KEY } from './storageKey'
import { SCHEMA_VERSION, type SnapshotV1 } from './schema'

describe('persist snapshot', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a valid snapshot through localStorage', () => {
    const snapshot: SnapshotV1 = {
      schemaVersion: SCHEMA_VERSION,
      sets: [{ setId: 's1', planned: { reps: 10 } }],
    }

    saveSnapshot(snapshot)
    const loaded = loadSnapshot()

    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot).toEqual(snapshot)
  })

  it('preserves completed set data', () => {
    const snapshot: SnapshotV1 = {
      schemaVersion: SCHEMA_VERSION,
      sets: [
        {
          setId: 's1',
          planned: { reps: 10 },
          completed: { reps: 10, at: new Date('2026-01-01T00:00:00.000Z').toISOString() },
        },
      ],
    }

    saveSnapshot(snapshot)
    const loaded = loadSnapshot()

    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot.sets[0]?.completed?.reps).toBe(10)
  })

  it('fails gracefully on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    const loaded = loadSnapshot()
    expect(loaded).toEqual({ ok: false, reason: 'invalid_json' })
  })
})

