import { SnapshotV1Schema, type SnapshotV1 } from './schema'
import { STORAGE_KEY } from './storageKey'

export type LoadSnapshotResult =
  | { ok: true; snapshot: SnapshotV1 }
  | { ok: false; reason: 'missing' | 'invalid_json' | 'invalid_schema' }

export function saveSnapshot(snapshot: SnapshotV1): void {
  const validated = SnapshotV1Schema.parse(snapshot)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
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

  const result = SnapshotV1Schema.safeParse(parsed)
  if (!result.success) return { ok: false, reason: 'invalid_schema' }
  return { ok: true, snapshot: result.data }
}

