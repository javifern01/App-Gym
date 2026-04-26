---
phase: 2
plan: "03"
subsystem: testing-infra
tags: [validation, nyquist, e2e-enabler, test-utility, deviation-rules]

# Dependency graph
requires:
  - phase: 02-01
    provides: V3 schema (rest_planned_s/rest_actual_s) — validated by snapshot.test.ts rows in the verification map.
  - phase: 02-02
    provides: Phase 2 visual contract — referenced by build-verify rows for plan 02-02.
provides:
  - src/utils/restMultiplier.ts — getRestMultiplier() (cached, idempotent) reads URLSearchParams once; resetRestMultiplierCache() (test-only).
  - 02-VALIDATION.md Per-Task Verification Map populated for all 11 plans (30 task rows).
  - Requirement Coverage Confirmation table — every requirement (SESS-01, SESS-02, SESS-04, REST-01, REST-02) maps to ≥1 automated row.
  - Frontmatter flips: nyquist_compliant: true, wave_0_complete: true.
  - Validation Sign-Off checklist fully ticked; Approval flipped to "approved (planner)".
affects: [02-04 fsm-core, 02-05 selectors-and-utils, 02-06 primitive-hooks, 02-07 session-active-ui, 02-08 session-aux-ui, 02-09 pre-session-ui-updates, 02-10 app-orchestration (consumes getRestMultiplier in LOG_SET dispatch), 02-11 e2e-tests (relies on ?restMul=0.05 to compress 90s rests to ~4.5s)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain Web API (URLSearchParams) — D-22 LOCKED honored, zero new npm deps."
    - "Module-level cache with explicit reset helper for test isolation — avoids vi.mock() on window.location and sidesteps jsdom location-replacement quirks."
    - "Production-safe defaults: every invalid path (no param, NaN, ≤0, non-finite, SSR with undefined window, thrown URLSearchParams) silently returns 1 — typoing the param can never break prod."
    - "Test-mode opt-in: REST timer behavior is identical to production unless ?restMul= is present in the URL — no env flag, no build-time switch."

key-files:
  created:
    - src/utils/restMultiplier.ts
    - src/utils/restMultiplier.test.ts
  modified:
    - .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md

key-decisions:
  - "D-22 LOCKED honored: `git diff package.json package-lock.json` is empty after this plan."
  - "Multiplier scope confirmed (D-14): getRestMultiplier() only multiplies the elapsed-time computation that produces restEndAt. The persisted rest_planned_s field MUST remain the prescribed value so the deviation calculation in plan 02-05 is meaningful. Plan 02-10's LOG_SET dispatcher will compute `restEndAt = nowMs + plannedSeconds * 1000 * getRestMultiplier()` and persist `rest_planned_s = plannedSeconds` (unmultiplied)."
  - "Reject zero (?restMul=0 → returns 1) — a zero multiplier would fire REST_DONE instantly, defeating the purpose of timing the test. 'Skip rest' is a separate concept handled by REST_DONE actions, not by the multiplier."
  - "Cache the read at first call rather than per-render — prevents the multiplier from changing mid-session if the URL is rewritten by the router; the test helper resetRestMultiplierCache() is the only legitimate way to invalidate."
  - "Verification map authored from the canonical RESEARCH.md §Validation Architecture → §Phase Requirements → Test Map; rows mirror task IDs declared in each plan's frontmatter so downstream executors can run the listed command verbatim."

patterns-established:
  - "Test-mode knobs live under src/utils/ with explicit reset helpers — keeps the production code path identical to test mode (no environment flags required)."
  - "Validation maps cite plan + task ID + requirement + automated command — Wave-2/3 executors don't need to invent commands or guess Nyquist coverage."

requirements-completed: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]

# Metrics
duration: 4m
completed: 2026-04-26
---

# Phase 2 Plan 03: Validation & Fast-Rest Knob Summary

**Two outputs delivered: (1) `src/utils/restMultiplier.ts` exposes `getRestMultiplier()` — reads `?restMul=<number>` from `window.location.search` ONCE, caches it, defaults to 1, and rejects every invalid path (NaN, ≤0, non-finite, no window) by silently returning 1. The plan 02-10 LOG_SET dispatcher will compose `restEndAt = nowMs + plannedSeconds * 1000 * getRestMultiplier()` so Playwright can compress a 90s rest to ~4.5s with `?restMul=0.05` while production behavior is unchanged. (2) `02-VALIDATION.md` Per-Task Verification Map is now populated with 30 rows across all 11 Phase 2 plans, each row carrying its automated command; a Requirement Coverage Confirmation table proves every requirement (SESS-01, SESS-02, SESS-04, REST-01, REST-02) maps to ≥1 automated test, and the frontmatter flips `nyquist_compliant: true` + `wave_0_complete: true` so Wave-2 executors can begin without inventing test commands.**

## Performance

| Stage | Result |
|-------|--------|
| `npm test -- --run src/utils/restMultiplier.test.ts` | 6/6 passed in 632ms |
| `npm test -- --run` (full unit suite) | 13/13 passed in 734ms |
| `git diff package.json package-lock.json` | empty (D-22 LOCKED honored) |

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — failing tests for getRestMultiplier | 8ccb884 | src/utils/restMultiplier.test.ts |
| 1 | GREEN — restMultiplier utility | aa59959 | src/utils/restMultiplier.ts |
| 2 | Populate Per-Task Verification Map | 8b807da | .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md |

## restMultiplier.ts API

```ts
export function getRestMultiplier(): number
export function resetRestMultiplierCache(): void
```

- **Default:** 1 (no `?restMul=` query param).
- **Valid input:** any positive finite number (e.g. `?restMul=0.05` → 0.05).
- **Rejected (returns 1):** missing param, non-numeric (`?restMul=foo`), negative (`?restMul=-1`), zero (`?restMul=0`), Infinity, NaN, missing `window` (SSR).
- **Caching:** value is read at first call and frozen for the page lifetime. `resetRestMultiplierCache()` is exported for tests; production code never calls it.
- **No throws:** wrapped in try/catch — even a synthetic `URLSearchParams` failure falls back to 1.

## Validation Map Summary

- **30 task rows** across plans 02-01 through 02-11 (3 rows for 02-01, 2 for 02-02, 2 for 02-03, 3 each for 02-04 through 02-08, 2 for 02-09, 3 for 02-10, 3 for 02-11).
- **Test type breakdown:** 1 doc-grep, 5 build, 8 typecheck, 12 unit, 1 integration, 3 e2e.
- **Requirement coverage:**
  - SESS-01 → 7 plans, 3 named test files.
  - SESS-02 → 5 plans, 3 named test files.
  - SESS-04 → 5 plans, 2 named test files (skip-undo.spec.ts + reducer.test.ts).
  - REST-01 → 5 plans, 3 named test files.
  - REST-02 → 5 plans, 3 named test files.
- **No watch-mode flags:** `--watch` and `--ui` only appear in the existing sign-off prohibition line, never inside a row's automated command.
- **Sign-off:** all 7 checklist items ticked; Approval = `approved (planner)`.

## Deviations from Plan

None — plan executed exactly as written. Both tasks landed without invoking Rule 1/2/3.

## Files Modified

| Path | Change |
|------|--------|
| `src/utils/restMultiplier.ts` | NEW — 43 lines, single export pair, module-level cache. |
| `src/utils/restMultiplier.test.ts` | NEW — 59 lines, 6 vitest cases covering default/parsed/invalid/caching. |
| `.planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` | UPDATED — frontmatter flipped, 30-row table populated, Requirement Coverage table added, sign-off ticked, approval flipped. |

## D-22 Compliance

```
$ git diff package.json package-lock.json
(empty)
```

Zero new dependencies added. The multiplier uses only `URLSearchParams` (Web API) and `Number.isFinite` (built-in).

## Self-Check: PASSED

- [x] `src/utils/restMultiplier.ts` exists (43 lines, exports getRestMultiplier + resetRestMultiplierCache).
- [x] `src/utils/restMultiplier.test.ts` exists (59 lines, 6 cases).
- [x] `.planning/phases/02-guided-session-rest-timer/02-VALIDATION.md` frontmatter has `nyquist_compliant: true` and `wave_0_complete: true`.
- [x] Verification map row `02-01-T1` and `02-11-T3` both present.
- [x] Requirement Coverage Confirmation rows for SESS-01 (`02-04, 02-05, 02-07, ...`) and REST-02 (`02-01, 02-05, ...`) match acceptance criteria literals.
- [x] Approval line: `**Approval:** approved (planner)`.
- [x] Commits 8ccb884, aa59959, 8b807da exist on `main` (verified via `git log --oneline`).
- [x] `npm test -- --run` 13/13 green; no regressions.
