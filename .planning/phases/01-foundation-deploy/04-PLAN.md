---
phase: 01-foundation-deploy
plan: "04"
type: execute
wave: 1
depends_on:
  - "01"
files_modified:
  - package.json
  - package-lock.json
  - vitest.config.ts
  - src/persist/schema.ts
  - src/persist/storageKey.ts
  - src/persist/snapshot.ts
  - src/persist/snapshot.test.ts
  - playwright.config.ts
  - e2e/smoke.spec.ts
autonomous: true
requirements:
  - DEPL-01
  - DEPL-02
  - SESS-03
user_setup: []
must_haves:
  truths:
    - "Vitest proves Zod-validated snapshot round-trips planned vs completed set state (SESS-03 core)"
    - "Playwright is configured to run against vite preview; smoke test loads the app (DEPL-01/02 verification path)"
  artifacts:
    - path: src/persist/storageKey.ts
      provides: "Stable localStorage key"
      contains: "buscador_pt_snapshot_v1"
    - path: src/persist/schema.ts
      provides: "schemaVersion + sets planned/completed"
      contains: "schemaVersion"
    - path: vitest.config.ts
      provides: "Unit test runner with jsdom for storage"
      contains: "vitest"
    - path: playwright.config.ts
      provides: "E2E against preview server"
      contains: "webServer"
  key_links:
    - from: src/persist/snapshot.ts
      to: src/persist/schema.ts
      via: "parse/serialize with Zod"
      pattern: "safeParse|parse"
    - from: playwright.config.ts
      to: package.json
      via: "preview script for webServer"
      pattern: "preview"
---

<objective>
Add the **Zod + localStorage snapshot** module (D-05–D-08), **Vitest** roundtrips for **SESS-03**, and **Playwright** smoke (preview + `e2e/smoke.spec.ts`) on top of plan **01** scaffold. Depends on `npm run build` from plan 01.

This plan split from former 01-PLAN to keep **files/plan** under the checker threshold.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-deploy/01-CONTEXT.md
@.planning/phases/01-foundation-deploy/01-RESEARCH.md
@.planning/phases/01-foundation-deploy/01-VALIDATION.md

**Locked decisions:** D-05–D-08, no Dexie; **Storage key** `STORAGE_KEY = 'buscador_pt_snapshot_v1'`. **Schema** same as 01-PLAN (see 01-CONTEXT + prior 01-PLAN context block in git history or 01-RESEARCH).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Persist module (Zod + snapshot) + Vitest roundtrip</name>
  <read_first>
    - src/App.tsx, vitest.config.ts (after plan 01)
    - 01-CONTEXT.md D-05–D-08
  </read_first>
  <files>src/persist/schema.ts, src/persist/storageKey.ts, src/persist/snapshot.ts, src/persist/snapshot.test.ts, vitest.config.ts</files>
  <behavior>
    - Invalid JSON or wrong schemaVersion fails `loadSnapshot` gracefully.
    - Saving after mutating `completed` on a set round-trips through localStorage mock and validates with Zod.
  </behavior>
  <action>
    Add `src/persist/storageKey.ts` exporting `STORAGE_KEY = 'buscador_pt_snapshot_v1'`. Implement `schema.ts` and `snapshot.ts` per 01-CONTEXT. Configure `vitest.config.ts` with `environment: 'jsdom'`. In `snapshot.test.ts`, test: (1) save + load success, (2) completed set survives roundtrip, (3) corrupt JSON returns safe failure. Only minimal `App.tsx` edits if build requires; full UI in 02-PLAN.
  </action>
  <acceptance_criteria>
    - `grep -q "buscador_pt_snapshot_v1" src/persist/storageKey.ts`
    - `grep -q "schemaVersion" src/persist/schema.ts`
    - `npx vitest run` exits 0 from repo root
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx vitest run</automated>
  </verify>
  <done>Snapshot module exists; Vitest proves SESS-03 data shape; STORAGE_KEY canonical.</done>
</task>

<task type="auto">
  <name>Task 2: Playwright + smoke E2E on vite preview</name>
  <read_first>
    - 01-VALIDATION.md
    - package.json (add @playwright/test if missing)
  </read_first>
  <files>playwright.config.ts, e2e/smoke.spec.ts, package.json, package-lock.json</files>
  <action>
    Ensure devDependency `@playwright/test` and scripts `"test:e2e": "playwright test"`. Add `playwright.config.ts` with `webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }`. Add `e2e/smoke.spec.ts` that opens base URL and asserts `#root` is present. **Do not** assert reload persistence here (02-PLAN).
  </action>
  <acceptance_criteria>
    - `grep -q "webServer" playwright.config.ts`
    - `grep -q "localhost:4173" playwright.config.ts`
    - `npx playwright test` exits 0 from repo root
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx playwright test</automated>
  </verify>
  <done>Playwright runs against preview; smoke passes.</done>
</task>

</tasks>

<verification>
- `npm ci && npm run build && npx vitest run && npx playwright test` all succeed
</verification>

<success_criteria>
SESS-03 persistence + automated tests; DEPL-01/02 verification commands runnable (build + e2e smoke)
</success_criteria>
