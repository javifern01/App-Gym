import { z } from 'zod'

export const SCHEMA_VERSION_V1 = 1 as const
export const SCHEMA_VERSION_V2 = 2 as const
export const SCHEMA_VERSION = 3 as const

// ---------------------------------------------------------------------------
// V1 schema (Phase 1 early — pre-wizard). Kept for the migration cascade.
// ---------------------------------------------------------------------------
export const ExerciseSetSchema = z.object({
  setId: z.string(),
  planned: z.object({
    reps: z.number().int().nonnegative(),
  }),
  completed: z
    .object({
      reps: z.number().int().nonnegative(),
      at: z.string(),
    })
    .optional(),
})

export const SnapshotV1Schema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_V1),
  sets: z.array(ExerciseSetSchema),
})

export type SnapshotV1 = z.infer<typeof SnapshotV1Schema>

// ---------------------------------------------------------------------------
// V2 schema (Phase 1 final — wizard + single-exercise session). Kept for the
// migration cascade so older snapshots in localStorage still parse.
// ---------------------------------------------------------------------------
export const PreferencesSchema = z.object({
  goalFocus: z.enum(['strength', 'hypertrophy', 'fat_loss']),
  equipmentNote: z.string().max(200),
})

export const SessionSchema = z.object({
  status: z.enum(['idle', 'in_progress', 'completed']),
  id: z.string().optional(),
  startedAt: z.string().optional(),
  currentExerciseIndex: z.number().int().nonnegative(),
  exerciseName: z.string(),
  sets: z.array(ExerciseSetSchema),
})

export const SnapshotV2Schema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION_V2),
  preferences: PreferencesSchema.optional(),
  session: SessionSchema,
})

export type SnapshotV2 = z.infer<typeof SnapshotV2Schema>

// ---------------------------------------------------------------------------
// V3 schema (Phase 2 — Guided Session + Rest Timer, D-24).
// Multi-exercise session, FSM statuses, RestState, HandoffState, expanded
// Preferences. Reducer purity (RESEARCH §Pitfall 4) is supported by carrying
// `startedAtMs` / `endAt` as epoch-ms numbers so reducers never call
// `Date.now()` themselves.
// ---------------------------------------------------------------------------
export const CompletedSetSchema = z.object({
  reps: z.number().int().min(0).max(99),
  weight: z.number().min(0).max(999),
  rir: z.number().int().min(0).max(4),
  at: z.string(),
  rest_planned_s: z.number().nonnegative().optional(),
  rest_actual_s: z.number().nonnegative().optional(),
})

export const ExerciseSetSchemaV3 = z.object({
  setId: z.string(),
  planned: z.object({ reps: z.number().int().nonnegative() }),
  completed: CompletedSetSchema.optional(),
})

export const ExerciseSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'active', 'done', 'skipped']),
  currentSetIndex: z.number().int().nonnegative(),
  sets: z.array(ExerciseSetSchemaV3),
})

export const RestStateSchema = z.object({
  startedAt: z.string(),
  startedAtMs: z.number().int(),
  endAt: z.number().int(),
  plannedSeconds: z.number().nonnegative(),
  exerciseIndex: z.number().int().nonnegative(),
  setIndex: z.number().int().nonnegative(),
})

export const HandoffStateSchema = z.object({
  visibleUntil: z.number().int(),
  nextExerciseIndex: z.number().int().nonnegative(),
})

export const SkipUndoTokenSchema = z.object({
  exerciseIndex: z.number().int().nonnegative(),
  expiresAtMs: z.number().int(),
  previousStatus: z.enum(['pending', 'active', 'done', 'skipped']),
})

export const SessionSchemaV3 = z.object({
  status: z.enum(['idle', 'in_progress', 'paused', 'completed']),
  id: z.string().optional(),
  startedAt: z.string().optional(),
  startedAtMs: z.number().int().optional(),
  exercises: z.array(ExerciseSchema),
  currentExerciseIndex: z.number().int().nonnegative(),
  rest: RestStateSchema.nullable().optional(),
  handoff: HandoffStateSchema.nullable().optional(),
  pendingUndo: SkipUndoTokenSchema.nullable().optional(),
})

export const PreferencesSchemaV3 = z.object({
  goalFocus: z.enum(['strength', 'hypertrophy', 'fat_loss']),
  equipmentNote: z.string().max(200),
  restAlertSound: z.boolean().default(true),
  restAlertVibration: z.boolean().default(true),
  effortMetric: z.enum(['rir', 'rpe']).default('rir'),
})

export const SnapshotV3Schema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  preferences: PreferencesSchemaV3.optional(),
  session: SessionSchemaV3,
})

export type CompletedSet = z.infer<typeof CompletedSetSchema>
export type ExerciseSetV3 = z.infer<typeof ExerciseSetSchemaV3>
export type Exercise = z.infer<typeof ExerciseSchema>
export type RestState = z.infer<typeof RestStateSchema>
export type HandoffState = z.infer<typeof HandoffStateSchema>
export type SkipUndoToken = z.infer<typeof SkipUndoTokenSchema>
export type SessionV3 = z.infer<typeof SessionSchemaV3>
export type PreferencesV3 = z.infer<typeof PreferencesSchemaV3>
export type SnapshotV3 = z.infer<typeof SnapshotV3Schema>
