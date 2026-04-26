---
phase: 2
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md
  - src/utils/restMultiplier.ts
  - src/utils/restMultiplier.test.ts
autonomous: true
requirements: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]
must_haves:
  truths:
    - "02-VALIDATION.md Per-Task Verification Map is populated with one row per task across all 11 plans, every requirement (SESS-01, SESS-02, SESS-04, REST-01, REST-02) covered by ≥1 automated row"
    - "02-VALIDATION.md frontmatter has nyquist_compliant: true and wave_0_complete: true after this plan"
    - "src/utils/restMultiplier.ts exports getRestMultiplier() that reads URLSearchParams.get('restMul') ONCE, caches the value, returns a number ≥ 0 (default 1)"
    - "Multiplier applies ONLY to restEndAt computation; rest_planned_s is never multiplied (legible in the schema as the prescribed value)"
    - "Test mode is opt-in: in absence of ?restMul= query param, getRestMultiplier() returns exactly 1 (production safe)"
  artifacts:
    - path: "src/utils/restMultiplier.ts"
      provides: "getRestMultiplier() (cached, idempotent), resetRestMultiplierCache() (test helper)"
      contains: "export function getRestMultiplier"
    - path: "src/utils/restMultiplier.test.ts"
      provides: "Tests covering: default = 1, ?restMul=0.05, ?restMul=invalid (returns 1), caching idempotence"
      contains: "getRestMultiplier"
    - path: ".planning/phases/02-guided-session-rest-timer/02-VALIDATION.md"
      provides: "Populated Per-Task Verification Map with all 11 plans' tasks"
      contains: "nyquist_compliant: true"
  key_links:
    - from: "App.tsx LOG_SET dispatcher (plan 02-10)"
      to: "src/utils/restMultiplier.ts getRestMultiplier"
      via: "Compute restEndAt = nowMs + plannedSeconds * 1000 * getRestMultiplier()"
      pattern: "getRestMultiplier\\(\\)"
---

<objective>
(1) Make Playwright E2E tests viable by adding a URL-param-controlled rest multiplier so a 90s rest can be compressed to ~4.5s with `?restMul=0.05` (RESEARCH §Open Q 3 / §Wave 0 Gaps).
(2) Lock the validation contract by populating `02-VALIDATION.md`'s Per-Task Verification Map so Wave-2 and Wave-3 executors do not need to invent test commands.

Purpose: Without (1), Wave-3 E2E plans block on 60–180s real waits. Without (2), the Nyquist sampling rule cannot be enforced.
Output: One tiny utility + one populated validation table. Both are pure additive changes; no behavioral change to the running app until plan 02-10 wires the multiplier into LOG_SET dispatch.
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
@.planning/phases/02-guided-session-rest-timer/02-VALIDATION.md

**Stack constraint (D-22 — LOCKED):** No new npm deps. Use plain `URLSearchParams` (Web API).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/utils/restMultiplier.ts + tests</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Open Questions / Risks" Q3 (test-mode fast-rest URL param recommendation: `?restMul=0.05`)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Wave 0 Gaps" (Test-mode fast-rest knob)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Anti-Patterns to Avoid" (do NOT mutate `rest_planned_s` with the multiplier — it must remain the prescribed value per D-14)
  </read_first>
  <behavior>
    - Default: `getRestMultiplier()` returns 1 when no `?restMul=` param exists.
    - `?restMul=0.05` → returns 0.05 (number).
    - `?restMul=foo` (non-parseable) → returns 1 (silent fallback; never throws).
    - `?restMul=-1` (negative) → returns 1 (clamped via `Math.max(0, ...)` then defaulted if 0; or simply: only positive finite numbers accepted).
    - `?restMul=0` → returns 1 (rejected — multiplier of 0 would cause REST_DONE to fire instantly and is treated as invalid, NOT the same as "skip rest").
    - Idempotent: calling getRestMultiplier() ten times returns the same value (cached at first call).
    - SSR-safe: if `typeof window === 'undefined'`, returns 1 without throwing.
    - resetRestMultiplierCache() (exported test helper) re-reads on next call.
  </behavior>
  <action>
Create `src/utils/restMultiplier.ts` exactly:

```ts
/**
 * Test-mode fast-rest knob (RESEARCH §Open Q 3, §Wave 0 Gaps).
 *
 * Reads `?restMul=<number>` from window.location.search ONCE per page load.
 * Used by App.tsx (plan 02-10) to multiply `plannedSeconds * 1000` when computing
 * `restEndAt`. CRITICAL: it must NOT be applied to `rest_planned_s` — that field
 * is the prescribed value per D-14 and is the source of truth for the deviation
 * calculation in plan 02-05.
 *
 * Defaults to 1.0. Invalid values (non-numeric, non-positive, non-finite) silently
 * fall back to 1.0 — production safety: no way to break prod by typoing the param.
 */
let cached: number | null = null

export function getRestMultiplier(): number {
  if (cached !== null) return cached
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    cached = 1
    return cached
  }
  try {
    const raw = new URLSearchParams(window.location.search).get('restMul')
    if (raw == null) {
      cached = 1
      return cached
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      cached = 1
      return cached
    }
    cached = parsed
    return cached
  } catch {
    cached = 1
    return cached
  }
}

/** Test-only: invalidate the cached value so the next call re-reads. */
export function resetRestMultiplierCache(): void {
  cached = null
}
```

Create `src/utils/restMultiplier.test.ts` exactly:

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { getRestMultiplier, resetRestMultiplierCache } from './restMultiplier'

describe('getRestMultiplier', () => {
  const originalLocation = window.location

  beforeEach(() => {
    resetRestMultiplierCache()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    resetRestMultiplierCache()
  })

  function setSearch(search: string) {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search },
    })
  }

  it('returns 1 when no restMul param is present', () => {
    setSearch('')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns parsed value when restMul=0.05', () => {
    setSearch('?restMul=0.05')
    expect(getRestMultiplier()).toBe(0.05)
  })

  it('returns 1 when restMul is non-numeric', () => {
    setSearch('?restMul=foo')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns 1 when restMul is negative', () => {
    setSearch('?restMul=-1')
    expect(getRestMultiplier()).toBe(1)
  })

  it('returns 1 when restMul is zero (rejected to avoid instant REST_DONE)', () => {
    setSearch('?restMul=0')
    expect(getRestMultiplier()).toBe(1)
  })

  it('caches the value across calls (idempotent)', () => {
    setSearch('?restMul=0.5')
    expect(getRestMultiplier()).toBe(0.5)
    setSearch('?restMul=0.1')
    // still 0.5 because cache hit; only resetRestMultiplierCache invalidates.
    expect(getRestMultiplier()).toBe(0.5)
    resetRestMultiplierCache()
    expect(getRestMultiplier()).toBe(0.1)
  })
})
```
  </action>
  <verify>
    <automated>npm test -- --run src/utils/restMultiplier.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function getRestMultiplier" src/utils/restMultiplier.ts` matches
    - `rg "export function resetRestMultiplierCache" src/utils/restMultiplier.ts` matches
    - `rg "URLSearchParams\(window\.location\.search\)\.get\('restMul'\)" src/utils/restMultiplier.ts` matches
    - `rg "Number\.isFinite\(parsed\)" src/utils/restMultiplier.ts` matches
    - `rg "parsed <= 0" src/utils/restMultiplier.ts` matches (rejects 0 and negatives)
    - `rg "let cached: number \| null = null" src/utils/restMultiplier.ts` matches
    - `npm test -- --run src/utils/restMultiplier.test.ts` passes 6/6 tests
  </acceptance_criteria>
  <done>Multiplier reads `?restMul=` once, caches; defaults safely; tests green.</done>
</task>

<task type="auto">
  <name>Task 2: Populate 02-VALIDATION.md Per-Task Verification Map</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md (current — table is empty placeholder)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Validation Architecture" → §"Phase Requirements → Test Map" (canonical source)
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"FSM Invariants" (INV-01..INV-10)
    - .planning/phases/02-guided-session-rest-timer/02-01-schema-v3-migration-PLAN.md (this directory; reference task IDs)
    - .planning/phases/02-guided-session-rest-timer/02-04-fsm-core-PLAN.md, 02-05-selectors-and-utils-PLAN.md, 02-06-primitive-hooks-PLAN.md, 02-07-session-active-ui-PLAN.md, 02-08-session-aux-ui-PLAN.md, 02-09-pre-session-ui-updates-PLAN.md, 02-10-app-orchestration-PLAN.md, 02-11-e2e-tests-PLAN.md (read AFTER they are written by the planner — by the time this plan EXECUTES, all sibling PLAN.md files exist on disk because all Wave-1 plans get committed together)
  </read_first>
  <action>
Replace the contents of `.planning/phases/02-guided-session-rest-timer/02-VALIDATION.md`'s "Per-Task Verification Map" section (the table that currently has the `{to fill during planning}` placeholder row) with a populated table.

Also flip frontmatter:
```yaml
nyquist_compliant: true
wave_0_complete: true
```

Populate the table EXACTLY with these rows (one per task, ordered by plan + task number). The table header MUST be:

`| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |`
`|---------|------|------|-------------|-----------|-------------------|-------------|--------|`

Rows to insert (replacing the existing placeholder row):

```
| 02-01-T1 | 02-01 | 1 | SESS-02, REST-02 | unit (typecheck) | `npx tsc -b` | ✅ src/persist/schema.ts (extended) | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | SESS-02, REST-02 | unit | `npm test -- --run src/persist/snapshot.test.ts` | ✅ src/persist/snapshot.ts (extended) | ⬜ pending |
| 02-01-T3 | 02-01 | 1 | SESS-02, REST-02 | unit | `npm test -- --run src/persist/snapshot.test.ts` | ✅ src/persist/snapshot.test.ts (extended) | ⬜ pending |
| 02-02-T1 | 02-02 | 1 | SESS-01, SESS-02, SESS-04, REST-01, REST-02 | build | `npm run build` | ✅ src/index.css (extended) | ⬜ pending |
| 02-02-T2 | 02-02 | 1 | SESS-01, SESS-02, SESS-04, REST-01, REST-02 | build | `npm run build` | ✅ src/index.css (extended) | ⬜ pending |
| 02-03-T1 | 02-03 | 1 | REST-01 (E2E enabler) | unit | `npm test -- --run src/utils/restMultiplier.test.ts` | ❌ Wave 0 (this task creates it) | ⬜ pending |
| 02-03-T2 | 02-03 | 1 | (validation contract) | doc | `rg "nyquist_compliant: true" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` | ✅ this file | ⬜ pending |
| 02-04-T1 | 02-04 | 2 | SESS-01, SESS-04 | unit (typecheck) | `npx tsc -b` | ❌ Wave 0 — creates src/session/actions.ts + seed.ts | ⬜ pending |
| 02-04-T2 | 02-04 | 2 | SESS-01, SESS-04, REST-01 | unit | `npm test -- --run src/session/reducer.test.ts` | ❌ Wave 0 — creates src/session/reducer.ts | ⬜ pending |
| 02-04-T3 | 02-04 | 2 | SESS-01, SESS-04, REST-01 | unit (invariants) | `npm test -- --run src/session/reducer.test.ts src/session/reducer.invariants.test.ts` | ❌ Wave 0 — creates both test files | ⬜ pending |
| 02-05-T1 | 02-05 | 2 | SESS-01 | unit | `npm test -- --run src/session/selectors.test.ts` | ❌ Wave 0 — creates src/session/selectors.ts | ⬜ pending |
| 02-05-T2 | 02-05 | 2 | REST-02 | unit | `npm test -- --run src/utils/restDeviation.test.ts` | ❌ Wave 0 — creates src/utils/{formatTime,restDeviation}.ts | ⬜ pending |
| 02-05-T3 | 02-05 | 2 | SESS-01, REST-02 | unit | `npm test -- --run src/session/selectors.test.ts src/utils/restDeviation.test.ts` | ❌ Wave 0 — creates both test files | ⬜ pending |
| 02-06-T1 | 02-06 | 2 | REST-01 | unit | `npm test -- --run src/hooks/useRestTimer.test.ts` | ❌ Wave 0 — creates useRestTimer + tests | ⬜ pending |
| 02-06-T2 | 02-06 | 2 | REST-01 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates useAudioCue + useVibration | ⬜ pending |
| 02-06-T3 | 02-06 | 2 | REST-01 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates useWakeLock + useUndoableToast | ⬜ pending |
| 02-07-T1 | 02-07 | 3 | SESS-01, SESS-02 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates FocusCard + ExerciseStrip | ⬜ pending |
| 02-07-T2 | 02-07 | 3 | REST-01, REST-02 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates RestStrip | ⬜ pending |
| 02-07-T3 | 02-07 | 3 | REST-01 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates RestPanel | ⬜ pending |
| 02-08-T1 | 02-08 | 3 | SESS-01, SESS-04 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates HandoffOverlay + Toast | ⬜ pending |
| 02-08-T2 | 02-08 | 3 | SESS-01 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates PauseDialog | ⬜ pending |
| 02-08-T3 | 02-08 | 3 | SESS-04, REST-02 | unit (compile) | `npx tsc -b` | ❌ Wave 0 — creates SummaryScreen | ⬜ pending |
| 02-09-T1 | 02-09 | 3 | SESS-04, REST-01 | unit (compile) | `npx tsc -b` | ✅ src/components/EmptyStateScreen.tsx (updated) | ⬜ pending |
| 02-09-T2 | 02-09 | 3 | (preferences for REST-01) | unit (compile) | `npx tsc -b` | ✅ src/components/WizardScreen.tsx (updated) | ⬜ pending |
| 02-10-T1 | 02-10 | 4 | SESS-01, SESS-02, SESS-04, REST-01, REST-02 | unit (compile) | `npx tsc -b && npm test -- --run` | ✅ src/App.tsx (rewritten) | ⬜ pending |
| 02-10-T2 | 02-10 | 4 | SESS-01, SESS-02, SESS-04, REST-01, REST-02 | unit (compile) | `npx tsc -b && npm test -- --run` | ✅ src/components/SessionScreen.tsx (rewritten) | ⬜ pending |
| 02-10-T3 | 02-10 | 4 | REST-01 | integration | `npm test -- --run` | ✅ wires hooks into App | ⬜ pending |
| 02-11-T1 | 02-11 | 5 | SESS-01, SESS-02, REST-01 | e2e | `npx playwright test e2e/guided-session.spec.ts` | ❌ Wave 0 — creates the spec | ⬜ pending |
| 02-11-T2 | 02-11 | 5 | SESS-04, REST-01 | e2e | `npx playwright test e2e/rest-timer.spec.ts e2e/skip-undo.spec.ts` | ❌ Wave 0 — creates the specs | ⬜ pending |
| 02-11-T3 | 02-11 | 5 | SESS-01 (resume), SESS-02 (V2→V3 data fidelity) | e2e | `npx playwright test e2e/pause-resume.spec.ts e2e/migration.spec.ts` | ❌ Wave 0 — creates the specs | ⬜ pending |
```

Verify the requirement coverage section by appending below the table:

```markdown

### Requirement Coverage Confirmation

| Requirement | Plans | Automated Tests |
|-------------|-------|-----------------|
| SESS-01 | 02-04, 02-05, 02-07, 02-08, 02-09, 02-10, 02-11 | reducer.test.ts (no folio en blanco), selectors.test.ts (nextAction exhaustive), guided-session.spec.ts |
| SESS-02 | 02-01, 02-04, 02-07, 02-10, 02-11 | snapshot.test.ts (V3 schema), reducer.test.ts (LOG_SET), guided-session.spec.ts (set persists) |
| SESS-04 | 02-04, 02-08, 02-09, 02-10, 02-11 | reducer.test.ts (SKIP_EXERCISE + UNDO_SKIP), skip-undo.spec.ts |
| REST-01 | 02-04, 02-06, 02-07, 02-10, 02-11 | useRestTimer.test.ts (drift + catchup), reducer.test.ts (rest invariant), rest-timer.spec.ts |
| REST-02 | 02-01, 02-05, 02-08, 02-10, 02-11 | snapshot.test.ts (rest_planned_s/rest_actual_s round-trip), restDeviation.test.ts, guided-session.spec.ts (deviation chip) |

**All 5 phase requirements have ≥1 automated test in the Per-Task Verification Map.** Sign-off met.
```

Then update the "## Validation Sign-Off" checklist by ticking the appropriate checkboxes:

```markdown
- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (`--watch`, `--ui`) in commands
- [x] Feedback latency < 5s (unit) / 30s (E2E)
- [x] All 5 phase requirements (SESS-01, SESS-02, SESS-04, REST-01, REST-02) have ≥1 automated row in Per-Task Verification Map
- [x] `nyquist_compliant: true` set in frontmatter once table is populated and signed off
```

And change "**Approval:** pending" to "**Approval:** approved (planner)".

Set frontmatter `nyquist_compliant: true` and `wave_0_complete: true`.
  </action>
  <verify>
    <automated>rg "nyquist_compliant: true" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md && rg "All 5 phase requirements" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md</automated>
  </verify>
  <acceptance_criteria>
    - `rg "^nyquist_compliant: true$" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - `rg "^wave_0_complete: true$" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - `rg "02-01-T1" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - `rg "02-11-T3" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - `rg "SESS-01.*02-04, 02-05, 02-07" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - `rg "REST-02.*02-01, 02-05" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` matches
    - The "Approval" line reads `**Approval:** approved (planner)`
    - No `--watch` or `--ui` flag appears in the populated table (`rg "\-\-watch|\-\-ui" .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` returns 0 matches inside the table rows)
  </acceptance_criteria>
  <done>Validation contract is locked; downstream executors run the listed commands verbatim; Nyquist compliance flagged.</done>
</task>

</tasks>

<verification>
- restMultiplier tests pass (6 tests).
- 02-VALIDATION.md is populated; nyquist_compliant flipped.
- `npm test -- --run` is still fully green (no regressions).
</verification>

<success_criteria>
E2E tests in plan 02-11 will be feasible (rests compress 20×); validation contract is approved before any Wave-2 work begins. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-03-SUMMARY.md` documenting:
- restMultiplier.ts API (one paragraph)
- Validation map summary (table count, requirement coverage)
- Files modified
- D-22 compliance confirmed
</output>
