import { z } from 'zod'

export const SCHEMA_VERSION = 1 as const

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
  schemaVersion: z.literal(SCHEMA_VERSION),
  sets: z.array(ExerciseSetSchema),
})

export type SnapshotV1 = z.infer<typeof SnapshotV1Schema>

