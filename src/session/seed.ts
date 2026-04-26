import type { Exercise } from '../persist/schema'

/**
 * Seed mini-routine for v1 (D-15). Used when starting a session and no
 * exercises exist. The dispatcher injects fresh `exerciseId` values per
 * session via the START_SESSION action payload (RESEARCH §Pitfall 4).
 *
 * Each exercise: 4 sets × 8 reps. Hardcoded names; weight/RIR captured live.
 */
export function getSeedExercises(exerciseIds: string[]): Exercise[] {
  if (exerciseIds.length !== 3) {
    throw new Error(`getSeedExercises expects 3 ids, got ${exerciseIds.length}`)
  }
  const names = ['Sentadilla', 'Press banca', 'Remo con barra']
  return names.map((name, i) => ({
    exerciseId: exerciseIds[i],
    name,
    status: i === 0 ? 'active' : 'pending',
    currentSetIndex: 0,
    sets: Array.from({ length: 4 }, (_, j) => ({
      setId: `${exerciseIds[i]}-set-${j + 1}`,
      planned: { reps: 8 },
    })),
  }))
}

/**
 * D-16: prescribed rest seconds based on goal focus.
 */
export function plannedRestForGoal(
  goalFocus: 'strength' | 'hypertrophy' | 'fat_loss'
): number {
  switch (goalFocus) {
    case 'strength':
      return 120
    case 'hypertrophy':
      return 90
    case 'fat_loss':
      return 60
  }
}
