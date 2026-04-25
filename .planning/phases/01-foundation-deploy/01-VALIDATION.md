---
phase: 1
slug: foundation-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x + (optional) Playwright 1.59.x |
| **Config file** | `vitest.config.ts` at repo root (Wave 0) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` + `npx playwright test` |
| **Estimated runtime** | ~30–90 seconds (depends on Playwright) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Vitest + Playwright (SESS-03 reload)
- **Before `/gsd-verify-work`:** Full suite must be green; manual UAT: open app from host URL + reload check
- **Max feedback latency:** 120 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 01+ | 1+ | DEPL-01 | script/smoke | `npm ci && npm run build` + static preview | ❌ Wave 0 | ⬜ pending |
| TBD | 01+ | 1+ | DEPL-02 | CI / script | Clean worktree + `npm ci` + `npm run build` | ❌ Wave 0 | ⬜ pending |
| TBD | 01+ | 1+ | SESS-03 | unit + e2e | Vitest persist/roundtrip; Playwright `page.reload()` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` + `src` persist/snapshot unit tests — SESS-03 parse/roundtrip
- [ ] `playwright.config.ts` with `webServer: npm run preview` — e2e reload
- [ ] `package-lock.json` (or pnpm lock) committed — DEPL-02 reproducibility
- [ ] `README.md` (or `docs/DEPLOY.md`) — DEPL-02 deploy steps

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App loads from GitHub Pages URL (or static host) | DEPL-01 | Plan/tier, account-specific | Open published URL; confirm shell UI |
| Private repo + Pages availability | DEPL-01/02 | GitHub product rules | Compare account plan to docs; document host B if needed |
| `file://` or local `index.html` open (D-01) | DEPL-01 | Browser-dependent ES module behavior | Test target browsers; prefer `vite preview` as doc’d alternative |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency under 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
