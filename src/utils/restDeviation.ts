import type { SessionState } from '../session/types'

export type RestDeviationPerExercise = {
  exerciseId: string
  name: string
  samples: number
  meanDeltaSeconds: number
}

export type RestDeviationResult = {
  meanDeltaSeconds: number
  samples: number
  perExercise: RestDeviationPerExercise[]
}

/**
 * REST-02: compute the mean signed deviation (in seconds) between actual and prescribed
 * rest, across all completed sets that recorded BOTH `rest_planned_s` and `rest_actual_s`.
 *
 * - Positive value → rested longer than prescribed.
 * - Negative value → rested less than prescribed.
 * - Zero with samples=0 → no measurable data (UI should render "—" instead of "0 s").
 *
 * Sets missing either field are skipped (a partial sample isn't a sample).
 */
export function computeRestDeviation(state: SessionState): RestDeviationResult {
  let totalDelta = 0
  let totalSamples = 0
  const perExercise: RestDeviationPerExercise[] = []

  for (const ex of state.session.exercises) {
    let exDelta = 0
    let exSamples = 0
    for (const set of ex.sets) {
      const c = set.completed
      if (!c) continue
      if (c.rest_planned_s == null || c.rest_actual_s == null) continue
      exDelta += c.rest_actual_s - c.rest_planned_s
      exSamples += 1
    }
    if (exSamples > 0) {
      perExercise.push({
        exerciseId: ex.exerciseId,
        name: ex.name,
        samples: exSamples,
        meanDeltaSeconds: Math.round(exDelta / exSamples),
      })
      totalDelta += exDelta
      totalSamples += exSamples
    }
  }

  return {
    meanDeltaSeconds: totalSamples > 0 ? Math.round(totalDelta / totalSamples) : 0,
    samples: totalSamples,
    perExercise,
  }
}
