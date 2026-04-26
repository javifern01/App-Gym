---
phase: 2
plan: 05
type: tdd
wave: 2
depends_on: ["02-01", "02-04"]
files_modified:
  - src/session/selectors.ts
  - src/session/selectors.test.ts
  - src/utils/formatTime.ts
  - src/utils/formatTime.test.ts
  - src/utils/restDeviation.ts
  - src/utils/restDeviation.test.ts
autonomous: true
requirements: [SESS-01, REST-02]
must_haves:
  truths:
    - "selectNextAction(state) ALWAYS returns a non-null { kind, copy } when status === 'in_progress' or 'paused' (SESS-01: no folio en blanco)"
    - "selectNextAction returns { kind: 'idle' } only when status === 'idle' (no exercises)"
    - "selectNextAction returns { kind: 'rest' } when rest != null"
    - "selectNextAction returns { kind: 'handoff' } when handoff != null"
    - "selectNextAction returns { kind: 'log_set' } when active exercise has a pending set"
    - "selectNextAction returns { kind: 'summary' } when status === 'completed'"
    - "formatTime(s) outputs M:SS for s < 3600 (e.g., 90 → '1:30', 5 → '0:05', 0 → '0:00')"
    - "computeRestDeviation iterates all completed sets and returns { meanDeltaSeconds, samples } where mean uses ms.round(diff) and samples = number of sets that have BOTH rest_planned_s AND rest_actual_s"
    - "computeRestDeviation returns { meanDeltaSeconds: 0, samples: 0 } when no completed set has both fields (REST-02 edge case)"
  artifacts:
    - path: "src/session/selectors.ts"
      provides: "selectNextAction, selectActiveExercise, selectActiveSet, selectProgress, selectRestRemainingMs, selectIsRestExpired, selectCompletedSetCount"
      contains: "export function selectNextAction"
    - path: "src/utils/formatTime.ts"
      provides: "formatTime(seconds): 'M:SS' string (or 'H:MM:SS' if ≥ 3600s)"
      contains: "export function formatTime"
    - path: "src/utils/restDeviation.ts"
      provides: "computeRestDeviation(state) → { meanDeltaSeconds, samples, perExercise }"
      contains: "export function computeRestDeviation"
  key_links:
    - from: "src/components/SessionScreen.tsx (plan 02-10)"
      to: "selectNextAction"
      via: "switch over .kind to render FocusCard | RestPanel | HandoffOverlay | SummaryScreen"
      pattern: "selectNextAction"
    - from: "src/components/SummaryScreen.tsx (plan 02-08)"
      to: "computeRestDeviation"
      via: "renders 'Δ descanso: ±N s'"
      pattern: "computeRestDeviation"
---

<objective>
Provide pure derivative functions ("selectors") and small UI utilities so the React layer never re-implements logic that belongs to the session model.

Purpose: SESS-01 (no folio en blanco) is enforced by `selectNextAction` returning a non-null narrative for every legitimate session state. REST-02 is enforced by `computeRestDeviation` using only the schema's two fields.
Output: 3 source files + 3 test files, fully covered.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-RESEARCH.md
@.planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md
@src/persist/schema.ts
@src/session/reducer.ts

<interfaces>
<!-- From plans 02-01 + 02-04 -->

From src/persist/schema.ts:
```typescript
export type CompletedSet = { reps: number; weight: number; rir: number; at: string; rest_planned_s?: number; rest_actual_s?: number }
export type Exercise = { exerciseId: string; name: string; status: 'pending'|'active'|'done'|'skipped'; currentSetIndex: number; sets: ExerciseSetV3[] }
export type SessionV3 = { status: 'idle'|'in_progress'|'paused'|'completed'; exercises: Exercise[]; currentExerciseIndex: number; rest: RestState | null; handoff: HandoffState | null; pendingUndo: SkipUndoToken | null; ... }
export type SnapshotV3 = { schemaVersion: 3; preferences?: PreferencesV3; session: SessionV3 }
```

From src/session/types.ts:
```typescript
export type SessionState = SnapshotV3
```

</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. No reselect, no immer.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/session/selectors.ts (SESS-01 enforcement)</name>
  <read_first>
    - src/session/reducer.ts (transitions defining when rest/handoff/exercises take values)
    - src/persist/schema.ts (V3 types)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Copywriting (Spanish, locked)" (use the EXACT verb tense + word from the spec)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-01 (Focus Mode), D-08 (handoff overlay), D-23 (NO completion banner — directly Summary), D-15 (mini-routine)
  </read_first>
  <behavior>
    - selectNextAction(state) returns a discriminated union: { kind: 'idle' } | { kind: 'log_set', exerciseName: string, setIndex: number, setsTotal: number } | { kind: 'rest', secondsRemaining: number, exerciseName: string } | { kind: 'handoff', nextExerciseName: string, msRemaining: number } | { kind: 'paused' } | { kind: 'summary' }
    - When status='in_progress' AND rest != null → { kind: 'rest', ... }
    - When status='in_progress' AND handoff != null → { kind: 'handoff', ... }
    - When status='in_progress' AND no rest, no handoff, active exercise has a pending set → { kind: 'log_set', ... }
    - When status='paused' → { kind: 'paused' }
    - When status='completed' → { kind: 'summary' }
    - When status='idle' → { kind: 'idle' }
    - selectActiveExercise(state) returns the exercise at currentExerciseIndex when status='in_progress', else null
    - selectActiveSet(state) returns the set at currentSetIndex of the active exercise, else null
    - selectProgress(state) returns { setsTotal, setsCompleted } across the entire session (sum across exercises, including non-active)
    - selectRestRemainingMs(state, nowMs) returns max(0, rest.endAt - nowMs) when rest != null, else 0
    - selectIsRestExpired(state, nowMs) returns rest != null && nowMs >= rest.endAt
    - selectCompletedSetCount(state) returns total number of sets with completed != null
  </behavior>
  <action>
Create `src/session/selectors.ts` EXACTLY:

```ts
import type { Exercise } from '../persist/schema'
import type { SessionState } from './types'

export type NextAction =
  | { kind: 'idle' }
  | { kind: 'log_set'; exerciseName: string; setIndex: number; setsTotal: number }
  | { kind: 'rest'; secondsRemaining: number; exerciseName: string }
  | { kind: 'handoff'; nextExerciseName: string; msRemaining: number }
  | { kind: 'paused' }
  | { kind: 'summary' }

/**
 * SESS-01 enforcement: this function NEVER returns null/undefined for a session in
 * 'in_progress' or 'paused' or 'completed' state. Every status maps to a concrete
 * "siguiente acción" the UI can render.
 */
export function selectNextAction(state: SessionState, nowMs: number = 0): NextAction {
  const s = state.session
  if (s.status === 'idle') return { kind: 'idle' }
  if (s.status === 'completed') return { kind: 'summary' }
  if (s.status === 'paused') return { kind: 'paused' }
  // in_progress
  if (s.handoff != null) {
    const next = s.exercises[s.handoff.nextExerciseIndex]
    return {
      kind: 'handoff',
      nextExerciseName: next?.name ?? '',
      msRemaining: Math.max(0, s.handoff.visibleUntil - nowMs),
    }
  }
  if (s.rest != null) {
    const ex = s.exercises[s.rest.exerciseIndex]
    return {
      kind: 'rest',
      secondsRemaining: Math.max(0, Math.ceil((s.rest.endAt - nowMs) / 1000)),
      exerciseName: ex?.name ?? '',
    }
  }
  const ex = s.exercises[s.currentExerciseIndex]
  if (ex == null) {
    // Defensive: should never happen in 'in_progress' (INV-01). Return summary kind so UI
    // doesn't crash on stale data.
    return { kind: 'summary' }
  }
  return {
    kind: 'log_set',
    exerciseName: ex.name,
    setIndex: ex.currentSetIndex,
    setsTotal: ex.sets.length,
  }
}

export function selectActiveExercise(state: SessionState): Exercise | null {
  const s = state.session
  if (s.status !== 'in_progress' && s.status !== 'paused') return null
  return s.exercises[s.currentExerciseIndex] ?? null
}

export function selectActiveSet(state: SessionState) {
  const ex = selectActiveExercise(state)
  if (!ex) return null
  return ex.sets[ex.currentSetIndex] ?? null
}

export function selectProgress(state: SessionState): { setsTotal: number; setsCompleted: number } {
  let setsTotal = 0
  let setsCompleted = 0
  for (const ex of state.session.exercises) {
    setsTotal += ex.sets.length
    for (const set of ex.sets) {
      if (set.completed != null) setsCompleted += 1
    }
  }
  return { setsTotal, setsCompleted }
}

export function selectRestRemainingMs(state: SessionState, nowMs: number): number {
  const r = state.session.rest
  if (r == null) return 0
  return Math.max(0, r.endAt - nowMs)
}

export function selectIsRestExpired(state: SessionState, nowMs: number): boolean {
  const r = state.session.rest
  return r != null && nowMs >= r.endAt
}

export function selectCompletedSetCount(state: SessionState): number {
  return selectProgress(state).setsCompleted
}
```

Create `src/session/selectors.test.ts` with these `it` blocks:

```ts
import { describe, expect, it } from 'vitest'
import {
  selectNextAction,
  selectActiveExercise,
  selectActiveSet,
  selectProgress,
  selectRestRemainingMs,
  selectIsRestExpired,
} from './selectors'
import { sessionReducer } from './reducer'
import * as A from './actions'
import { createInitialSnapshot } from '../persist/snapshot'

const ISO0 = '2024-12-31T00:00:00.000Z'
const T0 = 1_700_000_000_000
const IDS = ['ex-a', 'ex-b', 'ex-c']
function fresh() {
  return {
    ...createInitialSnapshot(),
    preferences: { goalFocus: 'hypertrophy' as const, equipmentNote: '', restAlertSound: true, restAlertVibration: true, effortMetric: 'rir' as const },
  }
}

describe('selectNextAction', () => {
  it('returns idle on a fresh snapshot', () => {
    expect(selectNextAction(fresh())).toEqual({ kind: 'idle' })
  })

  it('returns log_set after START_SESSION', () => {
    const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    const a = selectNextAction(s)
    expect(a.kind).toBe('log_set')
    if (a.kind === 'log_set') {
      expect(a.exerciseName).toBe('Sentadilla')
      expect(a.setIndex).toBe(0)
      expect(a.setsTotal).toBe(4)
    }
  })

  it('returns rest after LOG_SET', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    const a = selectNextAction(s, T0 + 30_000)
    expect(a.kind).toBe('rest')
    if (a.kind === 'rest') {
      expect(a.secondsRemaining).toBe(60) // (T0+90_000 - (T0+30_000)) / 1000 = 60
    }
  })

  it('returns handoff after last set of an exercise', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    for (let i = 0; i < 4; i++) {
      s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0 + i * 1000, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    }
    const a = selectNextAction(s, T0 + 4000)
    expect(a.kind).toBe('handoff')
    if (a.kind === 'handoff') {
      expect(a.nextExerciseName).toBe('Press banca')
      expect(a.msRemaining).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns summary when status === completed', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.completeSession(T0 + 1000, ISO0))
    expect(selectNextAction(s)).toEqual({ kind: 'summary' })
  })

  it('returns paused when status === paused', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.pause())
    expect(selectNextAction(s)).toEqual({ kind: 'paused' })
  })

  it('NEVER returns a kind that the UI cannot render (SESS-01 contract)', () => {
    const states = [fresh(), sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))]
    for (const s of states) {
      const a = selectNextAction(s, T0)
      expect(['idle', 'log_set', 'rest', 'handoff', 'paused', 'summary']).toContain(a.kind)
    }
  })
})

describe('selectActiveExercise / selectActiveSet', () => {
  it('returns null on idle', () => {
    expect(selectActiveExercise(fresh())).toBeNull()
    expect(selectActiveSet(fresh())).toBeNull()
  })

  it('returns active exercise + set during in_progress', () => {
    const s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    expect(selectActiveExercise(s)?.name).toBe('Sentadilla')
    expect(selectActiveSet(s)?.planned.reps).toBe(8)
  })
})

describe('selectProgress', () => {
  it('counts completed sets across all exercises', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    expect(selectProgress(s)).toEqual({ setsTotal: 12, setsCompleted: 0 })
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    expect(selectProgress(s)).toEqual({ setsTotal: 12, setsCompleted: 1 })
  })
})

describe('selectRestRemainingMs', () => {
  it('returns 0 when rest is null', () => {
    const s = fresh()
    expect(selectRestRemainingMs(s, T0)).toBe(0)
  })

  it('returns clamped delta when rest is active', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    expect(selectRestRemainingMs(s, T0 + 30_000)).toBe(60_000)
    expect(selectRestRemainingMs(s, T0 + 200_000)).toBe(0)
  })
})

describe('selectIsRestExpired', () => {
  it('false when rest is null', () => {
    expect(selectIsRestExpired(fresh(), T0)).toBe(false)
  })
  it('true when nowMs >= endAt', () => {
    let s = sessionReducer(fresh(), A.startSession('id', ISO0, T0, IDS))
    s = sessionReducer(s, A.logSet({ nowIso: ISO0, nowMs: T0, reps: 8, weight: 80, rir: 2, plannedRestSeconds: 90 }))
    expect(selectIsRestExpired(s, T0 + 89_999)).toBe(false)
    expect(selectIsRestExpired(s, T0 + 90_000)).toBe(true)
  })
})
```
  </action>
  <verify>
    <automated>npm test -- --run src/session/selectors.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function selectNextAction" src/session/selectors.ts` matches
    - `rg "export function selectActiveExercise" src/session/selectors.ts` matches
    - `rg "export function selectActiveSet" src/session/selectors.ts` matches
    - `rg "export function selectProgress" src/session/selectors.ts` matches
    - `rg "export function selectRestRemainingMs" src/session/selectors.ts` matches
    - `rg "export function selectIsRestExpired" src/session/selectors.ts` matches
    - `rg "kind: 'log_set'" src/session/selectors.ts` matches
    - `rg "kind: 'rest'" src/session/selectors.ts` matches
    - `rg "kind: 'handoff'" src/session/selectors.ts` matches
    - `rg "kind: 'summary'" src/session/selectors.ts` matches
    - `rg "kind: 'paused'" src/session/selectors.ts` matches
    - `rg "Date\.now|Math\.random|crypto\.randomUUID" src/session/selectors.ts` returns 0 matches (selectors must be pure)
    - `npm test -- --run src/session/selectors.test.ts` passes ≥ 12 tests
  </acceptance_criteria>
  <done>Selectors exhaustively cover the SESS-01 contract; tests prove no state ever returns null.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create formatTime + restDeviation utilities</name>
  <read_first>
    - src/persist/schema.ts (CompletedSet shape — rest_planned_s, rest_actual_s)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Example E: rest deviation aggregation" (lines ~630-660)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"REST-02" rows in the Test Map
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Copywriting" (exact summary chip strings, e.g., "Δ descanso: ±N s")
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-19 (summary metrics: total time, total sets, mean rest deviation)
  </read_first>
  <behavior>
    - formatTime(0) === '0:00'
    - formatTime(5) === '0:05'
    - formatTime(60) === '1:00'
    - formatTime(90) === '1:30'
    - formatTime(125) === '2:05'
    - formatTime(3600) === '1:00:00'
    - formatTime(3725) === '1:02:05'
    - formatTime(-5) === '0:00' (negative clamps to zero, defensive)
    - formatTime(NaN) === '0:00' (defensive)
    - computeRestDeviation on empty session → { meanDeltaSeconds: 0, samples: 0, perExercise: [] }
    - computeRestDeviation on session with no completed sets having both fields → { meanDeltaSeconds: 0, samples: 0, perExercise: [] }
    - computeRestDeviation on session with [{rest_planned_s: 90, rest_actual_s: 92}, {rest_planned_s: 90, rest_actual_s: 80}] → { meanDeltaSeconds: -4, samples: 2, perExercise: [...] } (mean of (92-90)+(80-90) = (2 + -10) / 2 = -4)
    - computeRestDeviation IGNORES sets where either rest_planned_s OR rest_actual_s is undefined (a partial sample isn't a sample)
    - perExercise array contains one entry per exercise with at least one valid sample, with shape { exerciseId, name, samples, meanDeltaSeconds }
  </behavior>
  <action>
Create `src/utils/formatTime.ts` EXACTLY:

```ts
/**
 * Render seconds as M:SS (or H:MM:SS for ≥ 1 hour).
 * Defensive against negatives, NaN, Infinity.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}
```

Create `src/utils/formatTime.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('renders 0 as 0:00', () => expect(formatTime(0)).toBe('0:00'))
  it('renders 5 as 0:05', () => expect(formatTime(5)).toBe('0:05'))
  it('renders 60 as 1:00', () => expect(formatTime(60)).toBe('1:00'))
  it('renders 90 as 1:30', () => expect(formatTime(90)).toBe('1:30'))
  it('renders 125 as 2:05', () => expect(formatTime(125)).toBe('2:05'))
  it('renders 3600 as 1:00:00', () => expect(formatTime(3600)).toBe('1:00:00'))
  it('renders 3725 as 1:02:05', () => expect(formatTime(3725)).toBe('1:02:05'))
  it('clamps negatives to 0:00', () => expect(formatTime(-5)).toBe('0:00'))
  it('clamps NaN to 0:00', () => expect(formatTime(NaN)).toBe('0:00'))
  it('clamps Infinity to 0:00', () => expect(formatTime(Infinity)).toBe('0:00'))
  it('floors fractional seconds', () => expect(formatTime(89.9)).toBe('1:29'))
})
```

Create `src/utils/restDeviation.ts` EXACTLY:

```ts
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
```

Create `src/utils/restDeviation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeRestDeviation } from './restDeviation'
import { createInitialSnapshot } from '../persist/snapshot'
import type { SnapshotV3 } from '../persist/schema'

function withCompletedSets(rests: Array<{ planned: number; actual: number } | { planned: number } | { actual: number } | null>): SnapshotV3 {
  const s = createInitialSnapshot()
  return {
    ...s,
    session: {
      ...s.session,
      status: 'completed',
      exercises: [{
        exerciseId: 'e1',
        name: 'Sentadilla',
        status: 'done',
        currentSetIndex: 0,
        sets: rests.map((r, i) => {
          if (r === null) return { setId: `s${i}`, planned: { reps: 8 } }
          const completed: any = { reps: 8, weight: 80, rir: 2, at: '2026-01-01T00:00:00.000Z' }
          if ('planned' in r) completed.rest_planned_s = (r as any).planned
          if ('actual' in r) completed.rest_actual_s = (r as any).actual
          return { setId: `s${i}`, planned: { reps: 8 }, completed }
        }),
      }],
      currentExerciseIndex: 0,
      rest: null,
      handoff: null,
      pendingUndo: null,
    },
  }
}

describe('computeRestDeviation (REST-02)', () => {
  it('returns 0 / 0 / [] on empty session', () => {
    expect(computeRestDeviation(createInitialSnapshot())).toEqual({ meanDeltaSeconds: 0, samples: 0, perExercise: [] })
  })

  it('returns 0 / 0 / [] when no set has both rest fields', () => {
    const s = withCompletedSets([{ planned: 90 }, { actual: 80 }, null])
    const r = computeRestDeviation(s)
    expect(r.samples).toBe(0)
    expect(r.meanDeltaSeconds).toBe(0)
    expect(r.perExercise).toEqual([])
  })

  it('computes mean deviation across two valid samples', () => {
    const s = withCompletedSets([{ planned: 90, actual: 92 }, { planned: 90, actual: 80 }])
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
    const s = withCompletedSets([{ planned: 90, actual: 91 }, { planned: 90, actual: 92 }, { planned: 90, actual: 92 }])
    const r = computeRestDeviation(s)
    // (1 + 2 + 2) / 3 = 1.666… → 2
    expect(r.meanDeltaSeconds).toBe(2)
  })
})
```
  </action>
  <verify>
    <automated>npm test -- --run src/utils/formatTime.test.ts src/utils/restDeviation.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function formatTime" src/utils/formatTime.ts` matches
    - `rg "Number\.isFinite\(seconds\)" src/utils/formatTime.ts` matches
    - `rg "padStart\(2, '0'\)" src/utils/formatTime.ts` matches
    - `rg "export function computeRestDeviation" src/utils/restDeviation.ts` matches
    - `rg "rest_actual_s - c\.rest_planned_s" src/utils/restDeviation.ts` matches
    - `rg "rest_planned_s == null \|\| c\.rest_actual_s == null" src/utils/restDeviation.ts` matches (partial-sample skip)
    - `rg "Math\.round\(" src/utils/restDeviation.ts` matches at least once
    - `npm test -- --run src/utils/formatTime.test.ts` passes ≥ 11 tests
    - `npm test -- --run src/utils/restDeviation.test.ts` passes ≥ 5 tests
  </acceptance_criteria>
  <done>Both utilities pure, tested, ready for UI consumption (SummaryScreen, RestStrip, RestPanel).</done>
</task>

<task type="auto">
  <name>Task 3: Wire selectors barrel export + verify type surface</name>
  <read_first>
    - src/session/selectors.ts (just created)
    - src/session/types.ts
    - src/session/actions.ts
  </read_first>
  <action>
Create `src/session/index.ts` (barrel export so consumers import once):

```ts
export type { Action, SessionState } from './types'
export { sessionReducer } from './reducer'
export {
  selectNextAction,
  selectActiveExercise,
  selectActiveSet,
  selectProgress,
  selectRestRemainingMs,
  selectIsRestExpired,
  selectCompletedSetCount,
  type NextAction,
} from './selectors'
export { getSeedExercises, plannedRestForGoal } from './seed'
export * as actions from './actions'
```
  </action>
  <verify>
    <automated>npx tsc -b && npm test -- --run src/session/ src/utils/</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export type \{ Action, SessionState \}" src/session/index.ts` matches
    - `rg "export \{ sessionReducer \}" src/session/index.ts` matches
    - `rg "selectNextAction" src/session/index.ts` matches
    - `rg "export \* as actions" src/session/index.ts` matches
    - `npx tsc -b` exits 0
    - `npm test -- --run src/session/ src/utils/` is fully green
  </acceptance_criteria>
  <done>Single import point ready for plans 02-07/08/10.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- `npx tsc -b` exits 0 across plan 02-04 + 02-05 surface (App.tsx may still error — fixed by 02-10).
- `npm test -- --run src/session/ src/utils/` is green.
</verification>

<success_criteria>
The reducer's pure outputs are projected through selectors so the React layer can render any session state with a single switch over `selectNextAction(state).kind`. Rest deviation is computable from V3 schema fields alone (REST-02 ready). Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-05-SUMMARY.md` documenting:
- Selectors API table (function → returns)
- formatTime cases
- restDeviation algorithm + edge cases
- Test counts
- D-22 compliance confirmed
</output>
