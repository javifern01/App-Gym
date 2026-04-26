import type { SnapshotV3 } from '../persist/schema'

export type SessionState = SnapshotV3

/**
 * Discriminated union of all FSM transitions.
 *
 * RULE (RESEARCH §Pitfall 4): every action that depends on time or identity
 * carries the impure value(s) in its payload (`nowMs`, `nowIso`, `id`). The
 * reducer NEVER reads them itself — it must remain pure.
 *
 * RULE (RESEARCH §Pitfall 6): TICK is a read-only action; the reducer must
 * return the same state reference unless rest has just expired (no
 * localStorage churn per tick).
 */
export type Action =
  | {
      type: 'START_SESSION'
      payload: {
        id: string
        nowIso: string
        nowMs: number
        exerciseIds: string[]
      }
    }
  | {
      type: 'LOG_SET'
      payload: {
        nowIso: string
        nowMs: number
        reps: number
        weight: number
        rir: number
        plannedRestSeconds: number
      }
    }
  | { type: 'EDIT_SET'; payload: { setId: string; reps: number; weight: number; rir: number } }
  | { type: 'SKIP_REST'; payload: { nowMs: number; nowIso: string } }
  | { type: 'EXTEND_REST'; payload: { extraSeconds: number } }
  | { type: 'REST_DONE'; payload: { nowMs: number; nowIso: string } }
  | { type: 'TICK'; payload: { nowMs: number; nowIso: string } }
  | { type: 'SKIP_EXERCISE'; payload: { exerciseIndex: number; nowMs: number } }
  | { type: 'UNDO_SKIP'; payload: { nowMs: number } }
  | { type: 'ADVANCE_TO_NEXT_EXERCISE'; payload: { nowMs: number } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'DISCARD' }
  | { type: 'COMPLETE_SESSION'; payload: { nowMs: number; nowIso: string } }
  | { type: 'DISMISS_HANDOFF' }
  | { type: 'SET_PREFERENCES'; payload: { preferences: import('../persist/schema').PreferencesV3 } }
