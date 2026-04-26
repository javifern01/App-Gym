---
phase: 2
plan: "01"
subsystem: persistence
tags: [zod, schema-migration, localStorage, fsm-prep]

# Dependency graph
requires:
  - SnapshotV1Schema + SnapshotV2Schema from Phase 1 (kept exported for migration cascade)
  - localStorage availability (jsdom in tests, browser at runtime)
provides:
  - SnapshotV3Schema + inferred types (Exercise, RestState, HandoffState, SkipUndoToken, SessionV3, PreferencesV3, CompletedSet)
  - SCHEMA_VERSION = 3 constant + SCHEMA_VERSION_V1 / SCHEMA_VERSION_V2 for the migration cascade
  - migrateV2toV3 (D-25) + chained V1→V2→V3 path inside loadSnapshot
  - createInitialSnapshot returning a SnapshotV3 with empty exercises[] and null rest/handoff/pendingUndo
affects: [persistence, fsm-core (02-04), hooks (02-06), session-ui (02-07/08), app-orchestration (02-10)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-version safeParse cascade: V3 → V2(→migrate) → V1(→chained migrate) → invalid_schema"
    - "Reducer-friendly time fields (`startedAtMs`, `endAt`) carried as epoch ms numbers in the schema so future reducers stay pure (RESEARCH §Pitfall 4)"
    - "Migration drops irrecoverable legacy data rather than fabricating values (D-25): V2 completed sets lacked weight/rir → set as undefined under V3"

key-files:
  created: []
  modified:
    - src/persist/schema.ts
    - src/persist/snapshot.ts
    - src/persist/snapshot.test.ts

key-decisions:
  - "Honor D-22 LOCKED: zero new npm dependencies; reuse zod@4.3.6 already installed."
  - "Honor D-24: schema bump V2→V3 introduces multi-exercise session, FSM statuses (pending|active|done|skipped per Exercise; idle|in_progress|paused|completed at session level), RestState, HandoffState, SkipUndoToken, expanded Preferences (restAlertSound, restAlertVibration, effortMetric)."
  - "Honor D-25: V2→V3 migration preserves preferences (with safe defaults for the new keys), wraps legacy sets in ONE pending Exercise, resets session.status to 'idle', and drops V2 completed sets (they lack weight/rir under V3 fidelity)."
  - "Keep SnapshotV1Schema + SnapshotV2Schema exported so the cascade in loadSnapshot can still read older localStorage payloads written by Phase 1 deploys."
  - "Apply RIR bounds at the schema level (`min(0).max(4)`, D-07): runtime safety is enforced even though Zod's type inference does not narrow numeric ranges into the inferred TS type."

patterns-established:
  - "All version migrators are small pure functions exported for tests; loadSnapshot composes them top-down (V3 → V2 → V1)."
  - "Schema files export both Schemas (Zod) and Types (z.infer) so consumers pick the right surface — runtime validation vs. compile-time shape."

requirements-completed: [SESS-02, REST-02]

# Metrics
duration: 5m
completed: 2026-04-26
---

# Phase 2 Plan 01: Schema V3 Migration Summary

**Bumps the persistence contract from V2 to V3 (D-24) so the rest of Phase 2 (FSM, hooks, UI) can compile against a stable type surface, and migrates older snapshots in localStorage without losing user-recoverable data (D-25).**

## V3 Schema Shape (one paragraph)

`SnapshotV3` keeps the V2 envelope (`{ schemaVersion, preferences?, session }`) but the session is now multi-exercise and FSM-aware: `session.exercises: Exercise[]` (each Exercise has its own `status: 'pending'|'active'|'done'|'skipped'`, `currentSetIndex`, and `sets`), `session.status` adds `'paused'`, and the session carries optional/null transient fields `rest: RestState | null`, `handoff: HandoffState | null`, `pendingUndo: SkipUndoToken | null`. Each completed set is now a `CompletedSet` with full fidelity (`reps`, `weight`, `rir` 0–4, `at`, plus optional `rest_planned_s` / `rest_actual_s` for REST-02 deviation tracking). `PreferencesV3` extends Phase-1 prefs with `restAlertSound: boolean = true`, `restAlertVibration: boolean = true`, `effortMetric: 'rir' | 'rpe' = 'rir'` so the rest-timer alert and SESS-02 effort UI have stable defaults. Time-bearing fields used by reducers (`session.startedAtMs`, `rest.startedAtMs`, `rest.endAt`) are epoch-ms `number`s so the future `sessionReducer` (plan 02-04) never has to call `Date.now()` itself.

## Migration Semantics V2 → V3 (D-25)

`migrateV2toV3(v2)` produces a V3 snapshot whose session is reset to `'idle'` regardless of the prior V2 status, and whose `exercises` array contains exactly ONE legacy Exercise with `exerciseId='legacy-0'`, `name=v2.session.exerciseName`, `status='pending'`, `currentSetIndex=0`. Each legacy set carries forward only `setId` and `planned`; `completed` is set to `undefined` because V2 completed sets only had `reps + at` — they lack the V3-required `weight` and `rir`, so per D-25 they cannot be reconstructed as "completos" without fabricating data the user never entered. Preferences are preserved when present: `goalFocus` and `equipmentNote` are copied verbatim, and the three new V3 preference fields take their safe defaults (`restAlertSound=true`, `restAlertVibration=true`, `effortMetric='rir'`). When `v2.preferences` is `undefined`, the migrated snapshot's preferences also stay `undefined` rather than being fabricated. V1 payloads are migrated via the chained `migrateV2toV3(migrateV1toV2(v1))`, so the loader cascade (V3 → V2 → V1 → `invalid_schema`) works for any prior Phase-1 deploy and yields predictable failures (`invalid_json` / `invalid_schema`) on corrupt or unknown shapes.

## Performance

- **Duration:** 5m
- **Started:** 2026-04-26T11:50:00Z
- **Completed:** 2026-04-26T11:54:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- V3 Zod schema + types added in `src/persist/schema.ts`; V1 + V2 schemas kept exported so the migration cascade still parses pre-existing localStorage payloads.
- `migrateV1toV2` extracted from inline logic and `migrateV2toV3` added per D-25 in `src/persist/snapshot.ts`; `loadSnapshot` now does V3 → V2 (→migrate) → V1 (→chained migrate) → `invalid_schema`.
- `createInitialSnapshot` returns a clean V3 snapshot with empty exercises array and `null` rest/handoff/pendingUndo, ready for plan 02-10's orchestration.
- `saveSnapshot` validates against `SnapshotV3Schema.parse` so invariants like `rir ≤ 4`, `reps ≥ 0`, `weight ≥ 0` are enforced before localStorage writes (must-have truth #8).
- 7-test V3 suite added in `src/persist/snapshot.test.ts` covering: round-trip, completed-set fidelity (weight/rir/rest_planned_s/rest_actual_s), V2→V3 migration semantics (D-25), V1→V3 chained migration, corrupt JSON, unknown schema, RIR > 4 rejection.
- Zero new npm dependencies (D-22 LOCKED): `git diff package.json` is empty.

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: V3 Zod schema + SCHEMA_VERSION = 3** — `1729fe7` (feat)
2. **Task 2: migrateV2toV3 + extended loadSnapshot cascade** — `849ad69` (feat)
3. **Task 3: V3 round-trip + V1/V2 migration + corrupt-JSON tests** — `701e725` (test)

## Files Created/Modified

- `src/persist/schema.ts` — added `SCHEMA_VERSION` (3), `SCHEMA_VERSION_V1`, `SCHEMA_VERSION_V2`; added `CompletedSetSchema`, `ExerciseSetSchemaV3`, `ExerciseSchema`, `RestStateSchema`, `HandoffStateSchema`, `SkipUndoTokenSchema`, `SessionSchemaV3`, `PreferencesSchemaV3`, `SnapshotV3Schema` and inferred types; updated `SnapshotV2Schema` to use `z.literal(SCHEMA_VERSION_V2)` since `SCHEMA_VERSION` now means 3.
- `src/persist/snapshot.ts` — `LoadSnapshotResult` carries `SnapshotV3`; `createInitialSnapshot()` returns V3; `saveSnapshot` validates against `SnapshotV3Schema`; added `migrateV1toV2` (extracted) + `migrateV2toV3` (D-25); replaced cascade in `loadSnapshot`; re-exported migrators for tests.
- `src/persist/snapshot.test.ts` — replaced V2-shaped tests with 7 V3 tests (must match the test-name greps in the plan's acceptance criteria).

## Decisions Made

None new beyond the locked decisions in `02-CONTEXT.md` (D-22, D-24, D-25, D-07).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 – Bug] Removed unused `@ts-expect-error` directive in the RIR > 4 test**

- **Found during:** Task 3 verification (`npx tsc -b` reported `error TS2578: Unused '@ts-expect-error' directive` on `snapshot.test.ts:175`).
- **Issue:** The test passed `rir: 5` to `CompletedSet.completed` and used `@ts-expect-error` to suppress an expected TS error. However, Zod's `z.number().int().min(0).max(4)` does **not** narrow into the inferred TS type (it only constrains at runtime), so `rir: 5` is a valid `number` at the type level and TS produced no error — making the `@ts-expect-error` directive itself an error.
- **Fix:** Removed the directive and added a short comment explaining that the rejection is enforced at runtime via `SnapshotV3Schema.parse` inside `saveSnapshot`. The runtime assertion (`expect(() => saveSnapshot(snapshot)).toThrow()`) is unchanged and still proves must-have truth #8 (RIR upper bound).
- **Files modified:** `src/persist/snapshot.test.ts`
- **Commit:** Folded into Task 3 commit `701e725` (test).

No other deviations. The plan executed as written.

## Issues Encountered

None blocking. Expected TS errors in `src/App.tsx` (out of scope; will be fixed by plan 02-10 per the plan's `<verification>` block):

- `src/App.tsx(22,56)` and `src/App.tsx(26,33)` — `App.tsx` still passes `SnapshotV2`-shaped values to `saveSnapshot`/`createInitialSnapshot`, which now require V3.

`SessionScreen.tsx` was named in the plan as a likely TS-error site too, but it currently still imports the (still-exported) V2 surface and compiles cleanly — the breakage will surface only when plan 02-07 reshapes the component for the focus-card UI. The plan-level scoping check `npx tsc -b 2>&1 | grep -v "App.tsx\|SessionScreen.tsx" | grep "error TS"` returns no output, satisfying the plan's `<verification>`.

## User Setup Required

None — no external service configuration. The next user to load the app will have any pre-existing V1 or V2 localStorage snapshot transparently migrated to V3 on the first `loadSnapshot()` call after plan 02-10 ships.

## Known Stubs

None for this plan. The V3 fields `rest`, `handoff`, `pendingUndo`, and the V3-only preference toggles are intentionally `null` / default-only in `createInitialSnapshot` — they are not stubs but the canonical zero state, and plans 02-04 / 02-06 / 02-09 / 02-10 will start populating them.

## Next Phase Readiness

- Plan 02-04 (FSM core, sessionReducer) can import `Exercise`, `SessionV3`, `RestState`, `HandoffState`, `SkipUndoToken`, `CompletedSet` directly.
- Plan 02-06 (primitive hooks) gets the rest-state contract (`startedAtMs`, `endAt`, `plannedSeconds`).
- Plan 02-10 (App orchestration) is now the file responsible for unblocking `App.tsx` against V3.
- Plan 02-09 (Wizard V3 toggles) gets the V3 preference shape with explicit defaults.

## Self-Check: PASSED

- All three task commits exist on `main`: `1729fe7` (feat), `849ad69` (feat), `701e725` (test) — verified via `git log --oneline -5`.
- All `<acceptance_criteria>` blocks pass:
  - Task 1: 13/13 ripgrep checks match in `src/persist/schema.ts`; `npx tsc -b` errors are confined to out-of-scope files (`App.tsx`) per plan `<verification>`.
  - Task 2: 11/11 ripgrep checks match in `src/persist/snapshot.ts`; same scoped tsc state.
  - Task 3: 7/7 test-name ripgrep checks match in `src/persist/snapshot.test.ts`; `npm test -- --run src/persist/snapshot.test.ts` is **7/7 passed** with exit code 0.
- Plan-level `<verification>`:
  - `npx tsc -b 2>&1 | grep -v "App.tsx\|SessionScreen.tsx" | grep "error TS"` → no output (only `App.tsx` errors remain, expected per plan, fixed in 02-10).
  - `npm test -- --run src/persist/` → 7/7 green.
  - `git diff package.json` → empty (zero new npm deps; D-22 honored).

---
*Phase: 02-guided-session-rest-timer*
*Completed: 2026-04-26*
