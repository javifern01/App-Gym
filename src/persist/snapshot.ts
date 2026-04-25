import { SnapshotV1Schema, SnapshotV2Schema, type SnapshotV2 } from './schema'
import { STORAGE_KEY } from './storageKey'

export type LoadSnapshotResult =
  | { ok: true; snapshot: SnapshotV2 }
  | { ok: false; reason: 'missing' | 'invalid_json' | 'invalid_schema' }

export type SaveSnapshotResult = { ok: true } | { ok: false; reason: 'quota_exceeded' }

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false
  if (err.name === 'QuotaExceededError') return true
  // Safari can use legacy codes; keep permissive here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any
  return anyErr?.code === 22 || anyErr?.code === 1014
}

export function createInitialSnapshot(): SnapshotV2 {
  return {
    schemaVersion: 2,
    preferences: undefined,
    session: {
      status: 'idle',
      id: undefined,
      startedAt: undefined,
      currentExerciseIndex: 0,
      exerciseName: 'Ejemplo — Press banca',
      sets: [],
    },
  }
}

export function saveSnapshot(snapshot: SnapshotV2): SaveSnapshotResult {
  const validated = SnapshotV2Schema.parse(snapshot)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
    return { ok: true }
  } catch (err) {
    if (isQuotaExceededError(err)) return { ok: false, reason: 'quota_exceeded' }
    throw err
  }
}

export function loadSnapshot(): LoadSnapshotResult {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw == null) return { ok: false, reason: 'missing' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }

  const v2 = SnapshotV2Schema.safeParse(parsed)
  if (v2.success) return { ok: true, snapshot: v2.data }

  // Migration path from V1 → V2 (no preferences; session stays idle).
  const v1 = SnapshotV1Schema.safeParse(parsed)
  if (!v1.success) return { ok: false, reason: 'invalid_schema' }

  const migrated: SnapshotV2 = {
    ...createInitialSnapshot(),
    session: {
      ...createInitialSnapshot().session,
      sets: v1.data.sets,
    },
  }
  return { ok: true, snapshot: migrated }
}

