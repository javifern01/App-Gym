---
phase: 2
slug: guided-session-rest-timer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing) + Playwright (existing) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (verify Wave 0) |
| **Quick run command** | `npm run test -- --run` (vitest, no watch) |
| **Full suite command** | `npm run test -- --run && npm run test:e2e` |
| **Estimated runtime** | ~5s unit + ~25s E2E happy path |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run` (unit only — fast)
- **After every plan wave:** Run `npm run test -- --run && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds for unit; 30 seconds full

---

## Per-Task Verification Map

> Populated by `gsd-planner` from RESEARCH.md `## Validation Architecture` section (FSM invariants, timer accuracy, Phase Requirements → Test Map). One row per task across all PLAN.md files. Every requirement (SESS-01, SESS-02, SESS-04, REST-01, REST-02) must have at least one automated row.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
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

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement Coverage Confirmation

| Requirement | Plans | Automated Tests |
|-------------|-------|-----------------|
| SESS-01 | 02-04, 02-05, 02-07, 02-08, 02-09, 02-10, 02-11 | reducer.test.ts (no folio en blanco), selectors.test.ts (nextAction exhaustive), guided-session.spec.ts |
| SESS-02 | 02-01, 02-04, 02-07, 02-10, 02-11 | snapshot.test.ts (V3 schema), reducer.test.ts (LOG_SET), guided-session.spec.ts (set persists) |
| SESS-04 | 02-04, 02-08, 02-09, 02-10, 02-11 | reducer.test.ts (SKIP_EXERCISE + UNDO_SKIP), skip-undo.spec.ts |
| REST-01 | 02-04, 02-06, 02-07, 02-10, 02-11 | useRestTimer.test.ts (drift + catchup), reducer.test.ts (rest invariant), rest-timer.spec.ts |
| REST-02 | 02-01, 02-05, 02-08, 02-10, 02-11 | snapshot.test.ts (rest_planned_s/rest_actual_s round-trip), restDeviation.test.ts, guided-session.spec.ts (deviation chip) |

**All 5 phase requirements have ≥1 automated test in the Per-Task Verification Map.** Sign-off met.

---

## Wave 0 Requirements

- [ ] Confirm `vitest` available (already in package.json from Phase 1) — if not, install
- [ ] Confirm `@playwright/test` available — if not, install + `npx playwright install --with-deps chromium`
- [ ] `tests/unit/session-fsm.test.ts` — stubs for SESS-01, SESS-02, SESS-04 (FSM invariants from RESEARCH §10)
- [ ] `tests/unit/rest-timer.test.ts` — stubs for REST-01 (drift-free `endAt` math, fake `Date.now()`)
- [ ] `tests/unit/rest-deviation.test.ts` — stubs for REST-02 (mean deviation, edge cases)
- [ ] `tests/unit/persistence.test.ts` — stubs for V2→V3 migration + per-set commit invariants
- [ ] `tests/e2e/guided-session.spec.ts` — happy-path scenario stub (start session → log set → rest fires → next set → finish)
- [ ] `tests/e2e/skip-flow.spec.ts` — skip-path scenario stub

*If existing tests already cover above, mark as ✅ and skip stub creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Audio cue plays after rest ends on real iOS Safari | REST-01 | iOS gesture-priming behavior cannot be reliably faked headless | On iPhone Safari: start session → tap "Start" (primes AudioContext) → complete a set with 5s rest → confirm beep audible at 0s |
| Wake Lock prevents screen sleep during active session | REST-01 (UX) | OS-level lock; no Web API to assert remaining sleep timer | On phone: start session, leave it idle 60s, confirm screen stays on; navigate away, confirm lock releases |
| Vibration fires on rest-end (Android) / silently no-ops (iOS) | REST-01 | `navigator.vibrate` not testable in CI | Android: feel vibration at 0s. iOS: no error in console; visual cue still fires |
| Rest timer resumes accurately after backgrounding tab > 30s | REST-01 | Browser tab throttling not reliably reproducible in headless | Start a 60s rest → switch to another app for 30s → return → confirm remaining time matches `endAt - Date.now()` (±1s) |
| Mid-session reload resumes at exact set + rest position | SESS-01, SESS-02 | Reload semantics differ across browsers | Start session, complete 1 set, reload tab during rest, confirm UI shows same exercise/set with timer restored |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (`--watch`, `--ui`) in commands
- [x] Feedback latency < 5s (unit) / 30s (E2E)
- [x] All 5 phase requirements (SESS-01, SESS-02, SESS-04, REST-01, REST-02) have ≥1 automated row in Per-Task Verification Map
- [x] `nyquist_compliant: true` set in frontmatter once table is populated and signed off

**Approval:** approved (planner)
