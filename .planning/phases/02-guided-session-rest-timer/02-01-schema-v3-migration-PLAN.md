---
phase: 2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/persist/schema.ts
  - src/persist/snapshot.ts
  - src/persist/snapshot.test.ts
autonomous: true
requirements: [SESS-02, REST-02]
must_haves:
  truths:
    - "loadSnapshot() returns ok:true with a SnapshotV3-shaped object when localStorage holds a valid V3 JSON"
    - "loadSnapshot() returns ok:true with a SnapshotV3-shaped object when localStorage holds a valid V2 JSON (V2→V3 migration)"
    - "loadSnapshot() returns ok:true with a SnapshotV3-shaped object when localStorage holds a valid V1 JSON (chained V1→V2→V3 migration)"
    - "loadSnapshot() returns { ok: false, reason: 'invalid_json' } when localStorage holds malformed JSON"
    - "loadSnapshot() returns { ok: false, reason: 'invalid_schema' } when JSON is well-formed but matches no version"
    - "saveSnapshot() persists a V3 snapshot and round-trips byte-equal through loadSnapshot()"
    - "After V2→V3 migration: legacy V2 sets are wrapped into ONE Exercise with status 'pending'; session.status resets to 'idle'; preferences are preserved with defaults restAlertSound=true, restAlertVibration=true, effortMetric='rir'"
    - "Schema rejects rir > 4, rir < 0, reps < 0, weight < 0"
  artifacts:
    - path: "src/persist/schema.ts"
      provides: "V3 type contracts: SnapshotV3Schema, SessionSchemaV3, ExerciseSchema, ExerciseSetSchemaV3, CompletedSetSchema, RestStateSchema, HandoffStateSchema, PreferencesSchemaV3, SCHEMA_VERSION = 3"
      contains: "SCHEMA_VERSION = 3"
    - path: "src/persist/snapshot.ts"
      provides: "migrateV2toV3 + extended loadSnapshot chain (V3 → V2→V3 → V1→V2→V3 → invalid_schema). createInitialSnapshot returns SnapshotV3."
      contains: "function migrateV2toV3"
    - path: "src/persist/snapshot.test.ts"
      provides: "Round-trip + migration + corrupt-JSON tests for V3"
      contains: "migrates a V1 snapshot into V3"
  key_links:
    - from: "src/persist/snapshot.ts loadSnapshot"
      to: "src/persist/schema.ts SnapshotV3Schema.safeParse"
      via: "safeParse cascade"
      pattern: "SnapshotV3Schema\\.safeParse"
    - from: "src/persist/snapshot.ts loadSnapshot V2 path"
      to: "migrateV2toV3"
      via: "if SnapshotV2Schema.safeParse succeeds → migrateV2toV3(v2.data)"
      pattern: "migrateV2toV3"
    - from: "src/persist/snapshot.ts loadSnapshot V1 path"
      to: "migrateV1toV2 → migrateV2toV3"
      via: "chained migration"
      pattern: "migrateV2toV3\\(migrateV1toV2"
---

<objective>
Bump the persistence contract from V2 to V3 (D-24) so that the rest of Phase 2 (FSM, hooks, UI) compiles against a stable type surface, and ensure no user data is lost on first run after deploy (D-25).

Purpose: Locks the schema first so all downstream Wave-2 plans (FSM core, selectors+utils, hooks) can import V3 types without speculation.
Output: V3 Zod schema + types + migration + tests, all green via `npm test -- --run src/persist/`.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-RESEARCH.md
@src/persist/schema.ts
@src/persist/snapshot.ts
@src/persist/snapshot.test.ts

<interfaces>
<!-- Current V2 contract that must be migrated FROM -->

From src/persist/schema.ts (current V2 — to be EXTENDED, not deleted; keep V1Schema + V2Schema for migration safeParse cascade):
```typescript
export const SCHEMA_VERSION = 2 as const  // BUMP TO 3 in this plan

export const ExerciseSetSchema = z.object({
  setId: z.string(),
  planned: z.object({ reps: z.number().int().nonnegative() }),
  completed: z.object({ reps: z.number().int().nonnegative(), at: z.string() }).optional(),
})

export const SessionSchema = z.object({
  status: z.enum(['idle', 'in_progress', 'completed']),
  id: z.string().optional(),
  startedAt: z.string().optional(),
  currentExerciseIndex: z.number().int().nonnegative(),
  exerciseName: z.string(),     // V2 had ONE exercise name; V3 replaces with exercises: Exercise[]
  sets: z.array(ExerciseSetSchema),
})

export const SnapshotV2Schema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  preferences: PreferencesSchema.optional(),
  session: SessionSchema,
})
```

From src/persist/snapshot.ts (current loadSnapshot cascade — extend with V3 case at the top):
```typescript
export function loadSnapshot(): LoadSnapshotResult {
  // ... raw parse ...
  const v2 = SnapshotV2Schema.safeParse(parsed)
  if (v2.success) return { ok: true, snapshot: v2.data }
  const v1 = SnapshotV1Schema.safeParse(parsed)
  if (!v1.success) return { ok: false, reason: 'invalid_schema' }
  // ... migrate V1 → V2 inline ...
}
```
</interfaces>

**Stack constraint (D-22 — LOCKED):** ZERO new npm dependencies. Reuse `zod@4.3.6` already installed. Do NOT install `nanoid`, `uuid`, `date-fns`, or anything else. If you find yourself wanting a new dep, stop and re-read CONTEXT.md D-22.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add V3 schema types in schema.ts (preserve V1+V2 schemas for migration)</name>
  <read_first>
    - src/persist/schema.ts (current V2 source — RENAME constant references but keep V1Schema and V2Schema exported for the migration cascade)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Example C: Zod V3 schema (extending Phase 1)" (lines ~525-590)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-24 (schema changes)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-07 (RIR chips 0–4, "0 = fallo")
  </read_first>
  <behavior>
    - SnapshotV3Schema.safeParse({ schemaVersion: 3, preferences: {...}, session: {...} }) succeeds for valid input.
    - CompletedSetSchema rejects: { reps: -1 }, { reps: 1, weight: -1 }, { rir: 5 }, { rir: -1 }.
    - PreferencesSchemaV3.parse({ goalFocus: 'strength', equipmentNote: 'x' }) returns object with restAlertSound=true, restAlertVibration=true, effortMetric='rir' via defaults.
    - SessionSchemaV3 accepts status enum 'idle' | 'in_progress' | 'paused' | 'completed' (paused is NEW in V3, D-24).
  </behavior>
  <action>
Edit `src/persist/schema.ts` keeping ALL existing V1 and V2 exports intact (rename `SCHEMA_VERSION` to `SCHEMA_VERSION_V2 = 2 as const` so V2Schema still references the literal `2`; the V2Schema must continue to parse old localStorage). Then APPEND V3 definitions:

Bump primary version constant:
```ts
export const SCHEMA_VERSION_V1 = 1 as const
export const SCHEMA_VERSION_V2 = 2 as const
export const SCHEMA_VERSION = 3 as const  // current; replaces previous "2 as const"
```

Update `SnapshotV2Schema` to use `z.literal(SCHEMA_VERSION_V2)` instead of `z.literal(SCHEMA_VERSION)` (since SCHEMA_VERSION now means 3).

Add V3 types EXACTLY:
```ts
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
```

Notes:
- Per RESEARCH §Pitfall 4 (reducer purity), the schema includes `startedAtMs` and `endAt` as `number` (epoch ms) so the reducer never needs to call `Date.now()` itself. The dispatcher injects these from action payloads.
- Per D-07 RIR chips 0–4, the schema enforces `min(0).max(4)`. Do NOT widen this; RPE is a separate effortMetric toggle (handled in UI later, not in schema).
- Do NOT delete `SnapshotV2Schema`, `SnapshotV1Schema`, `ExerciseSetSchema` (V2), `SessionSchema` (V2), `PreferencesSchema` (V2). They are needed by snapshot.ts for the migration safeParse cascade.

Reject any temptation to use `nanoid` / `uuid`. IDs are generated by the dispatcher via `crypto.randomUUID()` (already in use in App.tsx) — they are not the schema's concern.
  </action>
  <verify>
    <automated>npm test -- --run src/persist/snapshot.test.ts && npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export const SCHEMA_VERSION = 3 as const" src/persist/schema.ts` matches exactly one line
    - `rg "SnapshotV3Schema = z\.object" src/persist/schema.ts` matches
    - `rg "ExerciseSchema = z\.object" src/persist/schema.ts` matches
    - `rg "RestStateSchema = z\.object" src/persist/schema.ts` matches
    - `rg "HandoffStateSchema = z\.object" src/persist/schema.ts` matches
    - `rg "PreferencesSchemaV3 = z\.object" src/persist/schema.ts` matches
    - `rg "z\.literal\(SCHEMA_VERSION_V2\)" src/persist/schema.ts` matches (V2 schema uses the V2 literal, not the new SCHEMA_VERSION which now = 3)
    - `rg "'paused'" src/persist/schema.ts` matches inside SessionSchemaV3
    - `rg "rest_planned_s" src/persist/schema.ts` matches inside CompletedSetSchema
    - `rg "rest_actual_s" src/persist/schema.ts` matches inside CompletedSetSchema
    - `rg "min\(0\)\.max\(4\)" src/persist/schema.ts` matches (RIR bound)
    - `rg "restAlertSound: z\.boolean\(\)\.default\(true\)" src/persist/schema.ts` matches
    - `rg "effortMetric: z\.enum\(\['rir', 'rpe'\]\)\.default\('rir'\)" src/persist/schema.ts` matches
    - `npx tsc -b` exits 0 (no TS errors)
  </acceptance_criteria>
  <done>schema.ts compiles; V3 types exported; V1/V2 schemas remain exported for migration cascade.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add migrateV2toV3 + extend loadSnapshot cascade in snapshot.ts</name>
  <read_first>
    - src/persist/snapshot.ts (current loadSnapshot cascade)
    - src/persist/schema.ts (V3 types just added in Task 1)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Example D: V2 → V3 migration" (lines ~593-628)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-25 (migration semantics)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 5: V2 → V3 migration drops user data"
  </read_first>
  <behavior>
    - migrateV2toV3(v2) returns SnapshotV3 with: schemaVersion=3; session.status='idle' (regardless of v2 status); session.exercises=[ONE exercise wrapping legacy v2.session.sets]; session.currentExerciseIndex=0; session.rest=null; session.handoff=null; session.pendingUndo=null.
    - The single legacy exercise has: name=v2.session.exerciseName; status='pending'; currentSetIndex=0; sets carry `setId` and `planned` from V2 sets, but `completed` is `undefined` for ALL of them (D-25: legacy completed sets lack weight/rir, so we drop them).
    - migrateV2toV3 preserves preferences: copies goalFocus + equipmentNote; injects defaults restAlertSound=true, restAlertVibration=true, effortMetric='rir'. If v2.preferences is undefined → result.preferences is also undefined (don't fabricate).
    - loadSnapshot tries V3 first, then V2 (→ migrateV2toV3), then V1 (→ migrateV1toV2 → migrateV2toV3 chained), else returns { ok: false, reason: 'invalid_schema' }.
    - createInitialSnapshot() now returns a SnapshotV3 with schemaVersion=3, no preferences, session.status='idle', empty exercises array, currentExerciseIndex=0, rest=null, handoff=null, pendingUndo=null.
  </behavior>
  <action>
Replace `src/persist/snapshot.ts` end-to-end. The file should:

1. Update imports:
```ts
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
```

2. Update `LoadSnapshotResult` to carry V3:
```ts
export type LoadSnapshotResult =
  | { ok: true; snapshot: SnapshotV3 }
  | { ok: false; reason: 'missing' | 'invalid_json' | 'invalid_schema' }
```

3. Replace `createInitialSnapshot` to return V3:
```ts
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
```

4. Replace `saveSnapshot` to validate against V3:
```ts
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
```

5. Add `migrateV1toV2` (extracted from inline V1→V2 logic in current snapshot.ts):
```ts
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
```

6. Add `migrateV2toV3` (per D-25 — legacy sets wrapped, completed dropped, status reset):
```ts
function migrateV2toV3(v2: SnapshotV2): SnapshotV3 {
  const legacy: Exercise = {
    exerciseId: 'legacy-0',
    name: v2.session.exerciseName,
    status: 'pending',
    currentSetIndex: 0,
    sets: v2.session.sets.map((s) => ({
      setId: s.setId,
      planned: s.planned,
      completed: undefined, // D-25: old sets lack weight/rir; not recoverable as 'completos'
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
```

7. Replace `loadSnapshot` cascade:
```ts
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
```

8. Export the migrators for tests:
```ts
export { migrateV1toV2, migrateV2toV3 }
```

Keep `isQuotaExceededError` unchanged.
  </action>
  <verify>
    <automated>npm test -- --run src/persist/snapshot.test.ts && npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "function migrateV2toV3" src/persist/snapshot.ts` matches
    - `rg "function migrateV1toV2" src/persist/snapshot.ts` matches
    - `rg "SnapshotV3Schema\.safeParse" src/persist/snapshot.ts` matches at least once
    - `rg "migrateV2toV3\(migrateV1toV2" src/persist/snapshot.ts` matches (chained migration)
    - `rg "schemaVersion: 3" src/persist/snapshot.ts` matches inside createInitialSnapshot AND inside migrateV2toV3
    - `rg "status: 'idle'" src/persist/snapshot.ts` matches inside migrateV2toV3 (D-25 reset)
    - `rg "completed: undefined" src/persist/snapshot.ts` matches inside migrateV2toV3 (D-25 drop)
    - `rg "restAlertSound: true" src/persist/snapshot.ts` matches inside migrateV2toV3
    - `rg "effortMetric: 'rir'" src/persist/snapshot.ts` matches inside migrateV2toV3
    - `rg "export \{ migrateV1toV2, migrateV2toV3 \}" src/persist/snapshot.ts` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>snapshot.ts compiles; cascade returns V3 for any valid stored version; corrupt JSON yields invalid_json; unrecognized shape yields invalid_schema.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extend snapshot.test.ts with V3 round-trip + V2→V3 + V1→V3 migration tests</name>
  <read_first>
    - src/persist/snapshot.test.ts (current V2-shaped tests — REPLACE with V3 versions; current tests will fail after Tasks 1+2)
    - src/persist/schema.ts (V3 types from Task 1)
    - src/persist/snapshot.ts (V3 cascade from Task 2)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Persistence Invariants" (lines ~707-714)
  </read_first>
  <behavior>
    - Test "round-trips a valid V3 snapshot": save+load yields toEqual original.
    - Test "preserves completed set data with weight, rir, rest_planned_s, rest_actual_s": after save+load, completed contains those fields.
    - Test "migrates a V2 snapshot into V3 (D-25)": seed localStorage with valid V2 (schemaVersion: 2, exerciseName: 'X', sets with completed: { reps, at }). After loadSnapshot: snapshot.schemaVersion === 3; session.status === 'idle'; session.exercises.length === 1; session.exercises[0].name === 'X'; session.exercises[0].status === 'pending'; session.exercises[0].sets[i].completed === undefined for all i (legacy completed dropped); preferences carry restAlertSound=true, restAlertVibration=true, effortMetric='rir'.
    - Test "migrates a V1 snapshot into V3 chained": seed V1 (schemaVersion: 1, sets: [...]). After loadSnapshot: snapshot.schemaVersion === 3; session.exercises.length === 1.
    - Test "fails gracefully on corrupt JSON": load yields { ok: false, reason: 'invalid_json' }.
    - Test "fails gracefully on unknown schema shape": seed `{ schemaVersion: 99 }` → load yields { ok: false, reason: 'invalid_schema' }.
    - Test "saveSnapshot rejects RIR > 4": passing { rir: 5 } in completed throws (Zod parse).
  </behavior>
  <action>
Replace the file contents (the V2-shaped tests will fail after Task 1+2; rewrite for V3). Keep the existing structure and `beforeEach { localStorage.clear() }` pattern. Use these test names (must match `-t` greps below):

```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './snapshot'
import { STORAGE_KEY } from './storageKey'
import { SCHEMA_VERSION, type SnapshotV1, type SnapshotV2, type SnapshotV3 } from './schema'

describe('persist snapshot V3', () => {
  beforeEach(() => { localStorage.clear() })

  it('round-trips a valid V3 snapshot', () => {
    const snapshot: SnapshotV3 = {
      schemaVersion: SCHEMA_VERSION,
      preferences: {
        goalFocus: 'strength',
        equipmentNote: 'gym completo',
        restAlertSound: true,
        restAlertVibration: true,
        effortMetric: 'rir',
      },
      session: {
        status: 'in_progress',
        id: 'sess-1',
        startedAt: '2026-01-01T00:00:00.000Z',
        startedAtMs: 1767225600000,
        exercises: [{
          exerciseId: 'ex-1',
          name: 'Press banca',
          status: 'active',
          currentSetIndex: 0,
          sets: [{ setId: 's1', planned: { reps: 8 } }],
        }],
        currentExerciseIndex: 0,
        rest: null,
        handoff: null,
        pendingUndo: null,
      },
    }
    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.snapshot).toEqual(snapshot)
  })

  it('preserves completed set data with weight, rir, rest_planned_s, rest_actual_s', () => {
    const snapshot: SnapshotV3 = {
      ...createInitialSnapshot(),
      preferences: { goalFocus: 'hypertrophy', equipmentNote: '', restAlertSound: true, restAlertVibration: true, effortMetric: 'rir' },
      session: {
        status: 'in_progress',
        id: 's',
        startedAt: '2026-01-01T00:00:00.000Z',
        startedAtMs: 1767225600000,
        exercises: [{
          exerciseId: 'e',
          name: 'Sentadilla',
          status: 'active',
          currentSetIndex: 1,
          sets: [{
            setId: 's1',
            planned: { reps: 10 },
            completed: {
              reps: 10,
              weight: 80,
              rir: 2,
              at: '2026-01-01T00:01:00.000Z',
              rest_planned_s: 90,
              rest_actual_s: 92,
            },
          }],
        }],
        currentExerciseIndex: 0,
        rest: null,
        handoff: null,
        pendingUndo: null,
      },
    }
    expect(saveSnapshot(snapshot)).toEqual({ ok: true })
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    const completed = loaded.snapshot.session.exercises[0].sets[0].completed
    expect(completed?.weight).toBe(80)
    expect(completed?.rir).toBe(2)
    expect(completed?.rest_planned_s).toBe(90)
    expect(completed?.rest_actual_s).toBe(92)
  })

  it('migrates a V2 snapshot into V3 (D-25)', () => {
    const v2: SnapshotV2 = {
      schemaVersion: 2,
      preferences: { goalFocus: 'strength', equipmentNote: 'gym' },
      session: {
        status: 'in_progress',
        id: 'old',
        startedAt: '2026-01-01T00:00:00.000Z',
        currentExerciseIndex: 0,
        exerciseName: 'Press banca',
        sets: [
          { setId: 's1', planned: { reps: 8 }, completed: { reps: 8, at: '2026-01-01T00:01:00.000Z' } },
          { setId: 's2', planned: { reps: 8 } },
        ],
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v2))

    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.snapshot.schemaVersion).toBe(3)
    expect(loaded.snapshot.session.status).toBe('idle')
    expect(loaded.snapshot.session.exercises).toHaveLength(1)
    expect(loaded.snapshot.session.exercises[0].name).toBe('Press banca')
    expect(loaded.snapshot.session.exercises[0].status).toBe('pending')
    // D-25: legacy completed dropped
    expect(loaded.snapshot.session.exercises[0].sets.every((s) => s.completed === undefined)).toBe(true)
    expect(loaded.snapshot.preferences?.restAlertSound).toBe(true)
    expect(loaded.snapshot.preferences?.restAlertVibration).toBe(true)
    expect(loaded.snapshot.preferences?.effortMetric).toBe('rir')
  })

  it('migrates a V1 snapshot into V3 chained', () => {
    const v1: SnapshotV1 = {
      schemaVersion: 1,
      sets: [{ setId: 's1', planned: { reps: 10 } }],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1))
    const loaded = loadSnapshot()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.snapshot.schemaVersion).toBe(3)
    expect(loaded.snapshot.session.exercises).toHaveLength(1)
    expect(loaded.snapshot.session.exercises[0].sets).toHaveLength(1)
  })

  it('fails gracefully on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')
    expect(loadSnapshot()).toEqual({ ok: false, reason: 'invalid_json' })
  })

  it('fails gracefully on unknown schema shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99, foo: 'bar' }))
    expect(loadSnapshot()).toEqual({ ok: false, reason: 'invalid_schema' })
  })

  it('saveSnapshot rejects RIR > 4', () => {
    const snapshot: SnapshotV3 = {
      ...createInitialSnapshot(),
      session: {
        ...createInitialSnapshot().session,
        exercises: [{
          exerciseId: 'e', name: 'X', status: 'active', currentSetIndex: 0,
          sets: [{
            setId: 's',
            planned: { reps: 1 },
            // @ts-expect-error intentional invalid input for runtime test
            completed: { reps: 1, weight: 0, rir: 5, at: '2026-01-01T00:00:00.000Z' },
          }],
        }],
      },
    }
    expect(() => saveSnapshot(snapshot)).toThrow()
  })
})
```
  </action>
  <verify>
    <automated>npm test -- --run src/persist/snapshot.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "round-trips a valid V3 snapshot" src/persist/snapshot.test.ts` matches
    - `rg "migrates a V2 snapshot into V3" src/persist/snapshot.test.ts` matches
    - `rg "migrates a V1 snapshot into V3 chained" src/persist/snapshot.test.ts` matches
    - `rg "fails gracefully on corrupt JSON" src/persist/snapshot.test.ts` matches
    - `rg "fails gracefully on unknown schema shape" src/persist/snapshot.test.ts` matches
    - `rg "saveSnapshot rejects RIR > 4" src/persist/snapshot.test.ts` matches
    - `npm test -- --run src/persist/snapshot.test.ts` passes 7/7 tests with exit code 0
  </acceptance_criteria>
  <done>All 7 V3-related tests green; legacy V2 tests removed; coverage proves the migration cascade and RIR bound enforcement.</done>
</task>

</tasks>

<verification>
- All three tasks' acceptance criteria pass.
- `npx tsc -b` from repo root exits 0 (no TS regressions in App.tsx — App still imports `SnapshotV2` which now no longer exists at the previous shape; this WILL break App.tsx compile, but App.tsx is the responsibility of plan 02-10. For this plan, accept tsc errors confined to App.tsx and SessionScreen.tsx; verify with `npx tsc -b 2>&1 | grep -v "App.tsx\|SessionScreen.tsx" | grep "error TS"` → no output).
- `npm test -- --run src/persist/` is fully green.
</verification>

<success_criteria>
The schema/persistence layer compiles and round-trips V3 data; V2 and V1 snapshots from prior Phase-1 deploys migrate cleanly to V3 without throwing; preferences are preserved with sane defaults; corrupt or unknown data fails predictably.

NO new npm dependencies installed (verify `git diff package.json` shows zero additions to `dependencies` or `devDependencies`).
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-01-SUMMARY.md` documenting:
- V3 schema shape (one paragraph)
- Migration semantics V2→V3 (one paragraph; cite D-25)
- Files modified
- Test count (7) and pass rate
- Known consequence: App.tsx + SessionScreen.tsx now have TS errors (expected — fixed by plan 02-10)
</output>
