import { describe, expect, it } from 'vitest'
import { computeRestDeviation } from './restDeviation'
import { createInitialSnapshot } from '../persist/snapshot'
import type { SnapshotV3 } from '../persist/schema'

function withCompletedSets(
  rests: Array<
    { planned: number; actual: number } | { planned: number } | { actual: number } | null
  >
): SnapshotV3 {
  const s = createInitialSnapshot()
  return {
    ...s,
    session: {
      ...s.session,
      status: 'completed',
      exercises: [
        {
          exerciseId: 'e1',
          name: 'Sentadilla',
          status: 'done',
          currentSetIndex: 0,
          sets: rests.map((r, i) => {
            if (r === null) return { setId: `s${i}`, planned: { reps: 8 } }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const completed: any = {
              reps: 8,
              weight: 80,
              rir: 2,
              at: '2026-01-01T00:00:00.000Z',
            }
            if ('planned' in r) completed.rest_planned_s = (r as { planned: number }).planned
            if ('actual' in r) completed.rest_actual_s = (r as { actual: number }).actual
            return { setId: `s${i}`, planned: { reps: 8 }, completed }
          }),
        },
      ],
      currentExerciseIndex: 0,
      rest: null,
      handoff: null,
      pendingUndo: null,
    },
  }
}

describe('computeRestDeviation (REST-02)', () => {
  it('returns 0 / 0 / [] on empty session', () => {
    expect(computeRestDeviation(createInitialSnapshot())).toEqual({
      meanDeltaSeconds: 0,
      samples: 0,
      perExercise: [],
    })
  })

  it('returns 0 / 0 / [] when no set has both rest fields', () => {
    const s = withCompletedSets([{ planned: 90 }, { actual: 80 }, null])
    const r = computeRestDeviation(s)
    expect(r.samples).toBe(0)
    expect(r.meanDeltaSeconds).toBe(0)
    expect(r.perExercise).toEqual([])
  })

  it('computes mean deviation across two valid samples', () => {
    const s = withCompletedSets([
      { planned: 90, actual: 92 },
      { planned: 90, actual: 80 },
    ])
    const r = computeRestDeviation(s)
    expect(r.samples).toBe(2)
    expect(r.meanDeltaSeconds).toBe(-4)
    expect(r.perExercise).toHaveLength(1)
    expect(r.perExercise[0].samples).toBe(2)
    expect(r.perExercise[0].name).toBe('Sentadilla')
  })

  it('skips partial samples (missing actual or missing planned)', () => {
    const s = withCompletedSets([
      { planned: 90, actual: 90 },
      { planned: 90 },
      { actual: 100 },
      { planned: 60, actual: 70 },
    ])
    const r = computeRestDeviation(s)
    expect(r.samples).toBe(2) // first and last
    expect(r.meanDeltaSeconds).toBe(5) // (0 + 10) / 2 = 5
  })

  it('rounds the mean delta to integer seconds', () => {
    const s = withCompletedSets([
      { planned: 90, actual: 91 },
      { planned: 90, actual: 92 },
      { planned: 90, actual: 92 },
    ])
    const r = computeRestDeviation(s)
    // (1 + 2 + 2) / 3 = 1.666… → 2
    expect(r.meanDeltaSeconds).toBe(2)
  })
})
