import {
  SnapshotV1Schema,
  SnapshotV2Schema,
  SnapshotV3Schema,
  type SnapshotV1,
  type SnapshotV2,
  type SnapshotV3,
  type Exercise,
} from './schema'
import { STORAGE_KEY } from './storageKey'

export type LoadSnapshotResult =
  | { ok: true; snapshot: SnapshotV3 }
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

export function createInitialSnapshot(): SnapshotV3 {
  return {
    schemaVersion: 3,
    preferences: undefined,
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

export function saveSnapshot(snapshot: SnapshotV3): SaveSnapshotResult {
  const validated = SnapshotV3Schema.parse(snapshot)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
    return { ok: true }
  } catch (err) {
    if (isQuotaExceededError(err)) return { ok: false, reason: 'quota_exceeded' }
    throw err
  }
}

function migrateV1toV2(v1: SnapshotV1): SnapshotV2 {
  return {
    schemaVersion: 2,
    preferences: undefined,
    session: {
      status: 'idle',
      id: undefined,
      startedAt: undefined,
      currentExerciseIndex: 0,
      exerciseName: 'Ejemplo — Press banca',
      sets: v1.sets,
    },
  }
}

function migrateV2toV3(v2: SnapshotV2): SnapshotV3 {
  const legacy: Exercise = {
    exerciseId: 'legacy-0',
    name: v2.session.exerciseName,
    status: 'pending',
    currentSetIndex: 0,
    sets: v2.session.sets.map((s) => ({
      setId: s.setId,
      planned: s.planned,
      // D-25: legacy V2 completed sets carry only reps + at — they lack
      // weight/rir, so we cannot recover them as "completos" under V3.
      // Drop completed and let the user re-record if needed.
      completed: undefined,
    })),
  }
  return {
    schemaVersion: 3,
    preferences:
      v2.preferences === undefined
        ? undefined
        : {
            goalFocus: v2.preferences.goalFocus,
            equipmentNote: v2.preferences.equipmentNote,
            restAlertSound: true,
            restAlertVibration: true,
            effortMetric: 'rir',
          },
    session: {
      status: 'idle',
      id: undefined,
      startedAt: undefined,
      startedAtMs: undefined,
      exercises: [legacy],
      currentExerciseIndex: 0,
      rest: null,
      handoff: null,
      pendingUndo: null,
    },
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

  const v3 = SnapshotV3Schema.safeParse(parsed)
  if (v3.success) return { ok: true, snapshot: v3.data }

  const v2 = SnapshotV2Schema.safeParse(parsed)
  if (v2.success) return { ok: true, snapshot: migrateV2toV3(v2.data) }

  const v1 = SnapshotV1Schema.safeParse(parsed)
  if (v1.success) return { ok: true, snapshot: migrateV2toV3(migrateV1toV2(v1.data)) }

  return { ok: false, reason: 'invalid_schema' }
}

export { migrateV1toV2, migrateV2toV3 }
