---
phase: 2
plan: 11
subsystem: e2e-tests
tags: [playwright, e2e, guided-session, rest-timer, migration, skip, pause]
dependency_graph:
  requires: ["02-09", "02-10"]
  provides: ["E2E coverage for Phase 2 requirements"]
  affects: ["CI gate", "02-VALIDATION.md"]
tech_stack:
  added: []
  patterns:
    - "addInitScript sessionStorage guard to prevent clear on page.reload()"
    - "restMul=0.05 URL param for fast-rest in E2E (test knob, not production)"
    - "Playwright locator.or() for SESS-01 invariant (focus-card OR rest-strip)"
    - "test.setTimeout() for long happy-path (90s budget, actual ~8s)"
key_files:
  created:
    - e2e/guided-session.spec.ts
    - e2e/skip-flow.spec.ts
    - e2e/pause-resume.spec.ts
    - e2e/migration.spec.ts
  modified:
    - e2e/session-reload.spec.ts
    - src/components/session/FocusCard.tsx
    - src/components/session/RestStrip.tsx
    - src/components/session/HandoffOverlay.tsx
    - src/components/session/Toast.tsx
    - src/components/session/PauseDialog.tsx
    - src/components/session/SummaryScreen.tsx
decisions:
  - "Rule 2 deviation: added data-testid to 6 components — missing testids are under-spec, not degrees of freedom"
  - "Session-reload addInitScript uses sessionStorage guard (__pw_cleared) so localStorage.clear() runs only on first load, not on page.reload()"
  - "Happy-path waits for rest expiry only on first rest (REST-01 proof); subsequent rests are skipped immediately for test speed"
  - "test.setTimeout(90_000) on happy-path; actual wall-clock is ~8s with restMul=0.05"
metrics:
  duration: "~25 minutes (including debugging)"
  completed: "2026-04-26"
  tasks: 3
  files_created: 5
  files_modified: 7
---

# Phase 2 Plan 11: E2E Tests Summary

**One-liner:** Five Playwright E2E specs lock Phase 2's guided-session, rest-timer, skip, pause, and migration guarantees using the `?restMul=0.05` fast-rest knob.

## What Was Built

| Spec | Requirements | Tests | Status | Wall-clock |
|------|-------------|-------|--------|-----------|
| `e2e/guided-session.spec.ts` | SESS-01, SESS-02, REST-01, REST-02 | 1 | ✅ | ~8s |
| `e2e/skip-flow.spec.ts` | SESS-04, D-13, D-17 | 2 | ✅ | ~7s |
| `e2e/pause-resume.spec.ts` | SESS-01 resume, D-04 | 2 | ✅ | ~1s |
| `e2e/migration.spec.ts` | D-25, SESS-02 data fidelity | 2 | ✅ | <1s |
| `e2e/session-reload.spec.ts` | SESS-01, SESS-02 (V3 upgrade) | 1 | ✅ | <1s |
| **TOTAL** | | **8** | **9/9 ✅** | **~8.5s** |

> Note: `smoke.spec.ts` (pre-existing) also passes, bringing the total E2E count to 9/9.

## Requirements Coverage

| Requirement | Spec | Assertion |
|-------------|------|-----------|
| SESS-01: no blank screen | `guided-session`, `pause-resume`, `session-reload` | focus-card OR rest-strip OR handoff-overlay always visible between state transitions |
| SESS-02: reps+weight+rir+timestamp persisted | `guided-session`, `session-reload`, `migration` | localStorage V3 snapshot with 12 completed sets; each has numeric reps/weight/rir + ISO string |
| SESS-04: skip exercise | `skip-flow` | exercise.status === 'skipped' in snapshot; undo reverts it |
| REST-01: RestStrip text transitions | `guided-session` | "Descansando · " during, "Listo" after expiry (verified on first rest) |
| REST-02: summary deviation chip | `guided-session` | data-testid="summary-rest-deviation" with "Δ descanso" text |
| D-25 migration | `migration` | V2 snapshot → V3 idle, preferences preserved with safe defaults |

## Deviations from Plan

### Auto-fixed Issues (Rule 2 — Missing critical functionality)

**1. [Rule 2 - Missing testids] Added data-testid to 6 session components**
- **Found during:** Task 1 (before writing any tests)
- **Issue:** `FocusCard`, `RestStrip`, `HandoffOverlay`, `Toast`, `PauseDialog`, `SummaryScreen` were missing all `data-testid` attributes specified in the plan's `<interfaces>` section. Per the plan: "If any selector above is missing in a downstream component, the executor MUST add it (under-spec is a bug, not a degree of freedom)."
- **Fix:** Added all required testids: `focus-card`, `focus-log-set`, `focus-pause`, `rest-strip`, `rest-strip-skip`, `rest-strip-extend`, `handoff-overlay`, `handoff-continue`, `toast`, `toast-action`, `toast-dismiss`, `pause-dialog`, `pause-resume`, `pause-discard`, `summary`, `summary-rest-deviation`, `summary-start-new`
- **Files modified:** 6 component files
- **Commit:** `6ef5380`

**2. [Rule 1 - Bug] FSM goes directly to handoff (no rest) after last set of exercise**
- **Found during:** Task 1 (test execution)
- **Issue:** The plan's loop assumed rest appears after EVERY set. But the reducer (`reducer.ts:78-121`) skips rest after `isLastSet=true` and goes directly to `HandoffOverlay`. The original test template (from the plan) was incorrect for this FSM behavior.
- **Fix:** Restructured the happy-path loop to differentiate: non-last sets → wait for rest; last set of exercise → wait for handoff directly; last set of session → break.
- **Files modified:** `e2e/guided-session.spec.ts`

**3. [Rule 1 - Bug] `addInitScript` runs on every navigation including `page.reload()`**
- **Found during:** Task 3 (session-reload test)
- **Issue:** `addInitScript(() => localStorage.clear())` re-runs when `page.reload()` is called, wiping the persisted session that the test was trying to reload into. This caused the app to boot as a fresh install (wizard shown, idle state) instead of restoring the in-progress session.
- **Fix:** Added `sessionStorage` one-shot guard (`__pw_cleared`) so the clear runs only on the initial navigation, not on reload. This matches the pattern used in the original Phase 1 `session-reload.spec.ts`.
- **Files modified:** `e2e/session-reload.spec.ts`
- **Commit:** `5e3d4cb`

**4. [Rule 2 - Performance] Happy-path waits for "Listo" only once**
- **Found during:** Task 1 (test timeout with 9 rests × 6s = 54s > 30s default timeout)
- **Issue:** Waiting for rest expiry on every set would exceed Playwright's 30s default test timeout.
- **Fix:** Wait for "Listo" only on the first rest (sufficient to verify REST-01 text transition); skip immediately for all subsequent rests. Set `test.setTimeout(90_000)` as safety headroom. Actual runtime: ~8s.

## D-22 Confirmation

`git diff package.json` — empty. Zero new npm dependencies. All tests use `@playwright/test` already present in `package.json`.

## Known Stubs

None. All test assertions are wired to real application behavior.

## Threat Flags

None. Test-only plan with no new network endpoints, auth paths, or schema changes.

## Self-Check

### Created files exist:
- [x] `e2e/guided-session.spec.ts` ✓
- [x] `e2e/skip-flow.spec.ts` ✓
- [x] `e2e/pause-resume.spec.ts` ✓
- [x] `e2e/migration.spec.ts` ✓
- [x] `e2e/session-reload.spec.ts` (upgraded) ✓

### Commits exist:
- [x] `6ef5380` — fix(02-11): testid additions
- [x] `ae97911` — feat(02-11): guided-session.spec.ts
- [x] `1fcda70` — feat(02-11): skip-flow + pause-resume specs
- [x] `5e3d4cb` — feat(02-11): migration + session-reload specs

### Tests pass:
- [x] `npx playwright test` → 9/9 ✅ (8.5s wall-clock)
- [x] `npm run test -- --run` → 77/77 unit tests ✅

## Self-Check: PASSED
