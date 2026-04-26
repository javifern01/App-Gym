---
phase: 2
slug: guided-session-rest-timer
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| {to fill during planning} | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`--watch`, `--ui`) in commands
- [ ] Feedback latency < 5s (unit) / 30s (E2E)
- [ ] All 5 phase requirements (SESS-01, SESS-02, SESS-04, REST-01, REST-02) have ≥1 automated row in Per-Task Verification Map
- [ ] `nyquist_compliant: true` set in frontmatter once table is populated and signed off

**Approval:** pending
