import { z } from 'zod'

export const SCHEMA_VERSION = 2 as const

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
  schemaVersion: z.literal(SCHEMA_VERSION),
  preferences: PreferencesSchema.optional(),
  session: SessionSchema,
})

export type SnapshotV2 = z.infer<typeof SnapshotV2Schema>

// V1 support: stored during earlier Phase 1 plans.
export const SnapshotV1Schema = z.object({
  schemaVersion: z.literal(1),
  sets: z.array(ExerciseSetSchema),
})

export type SnapshotV1 = z.infer<typeof SnapshotV1Schema>

