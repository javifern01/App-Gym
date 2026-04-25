---
phase: 01-foundation-deploy
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - vite.config.ts
  - vitest.config.ts
  - playwright.config.ts
  - tsconfig.json
  - tsconfig.node.json
  - index.html
  - src/main.tsx
  - src/App.tsx
  - src/vite-env.d.ts
  - src/persist/schema.ts
  - src/persist/storageKey.ts
  - src/persist/snapshot.ts
  - src/persist/snapshot.test.ts
  - e2e/smoke.spec.ts
  - .gitignore
  - README.md
autonomous: true
requirements:
  - DEPL-01
  - DEPL-02
  - SESS-03
user_setup: []
must_haves:
  truths:
    - "npm ci && npm run build produces dist/index.html with relative asset refs suitable for GitHub Pages project site (D-04) and local preview"
    - "package-lock.json exists so clean clone install is reproducible (DEPL-02)"
    - "Vitest proves Zod-validated snapshot round-trips planned vs completed set state (SESS-03 core)"
    - "Playwright is configured to run against vite preview; smoke test loads the app"
  artifacts:
    - path: vite.config.ts
      provides: "Vite build with base relative path"
      contains: "base: \"./\""
    - path: src/persist/storageKey.ts
      provides: "Stable localStorage key"
      contains: "buscador_pt_snapshot_v1"
    - path: src/persist/schema.ts
      provides: "schemaVersion + sets planned/completed"
      contains: "schemaVersion"
    - path: vitest.config.ts
      provides: "Unit test runner"
      contains: "vitest"
    - path: playwright.config.ts
      provides: "E2E against preview server"
      contains: "webServer"
  key_links:
    - from: src/persist/snapshot.ts
      to: src/persist/schema.ts
      via: "parse/serialize with Zod"
      pattern: "safeParse|parse"
    - from: vite.config.ts
      to: dist/index.html
      via: "npm run build"
      pattern: "base: \"./\""
---

<objective>
Scaffold a greenfield **Vite + React + TypeScript** SPA with **`base: './'`** (D-01, D-04, per 01-RESEARCH), **no client router** (D-02), runtime deps **`zod`**, and dev deps **Vitest + Playwright**. Add a **versioned localStorage snapshot** module (D-05–D-08) with **unit tests** that prove parse + roundtrip for **planned vs completed** sets (SESS-03). Commit **package-lock.json**. Add minimal **README** “Development” (install/build/preview/test) for DEPL-02 starter; full deploy/host-B narrative comes in plan 03.

Purpose: Wave 0 foundation so later plans implement UI and deploy docs against a verified build and persistence contract.

Output: Runnable `npm run dev` / `build` / `preview`, `npx vitest run` green, `npx playwright test` green (smoke only).
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-foundation-deploy/01-CONTEXT.md
@.planning/phases/01-foundation-deploy/01-RESEARCH.md
@.planning/phases/01-foundation-deploy/01-VALIDATION.md

**Locked decisions to honor in this plan:** D-01, D-02, D-04, D-05, D-06, D-08 (localStorage + Zod snapshot with schemaVersion; no router; relative base). **Do not** add Dexie, PWA, or TanStack Router (01-CONTEXT / 01-RESEARCH).

**Storage key:** Export `STORAGE_KEY = 'buscador_pt_snapshot_v1'` from `src/persist/storageKey.ts` (matches 01-RESEARCH example; single source of truth for grep/docs).

**Skeleton schema (implement in `schema.ts`):** `z.object({ schemaVersion: z.literal(1), session: z.object({ id: z.string(), status: z.enum(['idle','in_progress','completed']), currentExerciseIndex: z.number().int().nonnegative(), sets: z.array(z.object({ setIndex: z.number().int().nonnegative(), planned: z.object({ reps: z.number().int().positive() }), completed: z.object({ reps: z.number().int().positive(), at: z.string() }).optional() })) }), preferences: z.object({ goalFocus: z.enum(['strength','hypertrophy','fat_loss']), equipmentNote: z.string() }).optional() })` — adjust only if Zod 4 API requires; keep `schemaVersion: 1` literal.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Scaffold Vite React TS + relative base + npm scripts</name>
  <read_first>
    - .planning/phases/01-foundation-deploy/01-CONTEXT.md (D-01, D-02, D-04)
    - .planning/phases/01-foundation-deploy/01-RESEARCH.md (Vite base, layout)
    - If repo root is empty aside from `.planning/`, run `npm create vite@latest` into project root with `--template react-ts` or equivalent; preserve `.planning/`.
  </read_first>
  <files>package.json, package-lock.json, vite.config.ts, tsconfig.json, tsconfig.node.json, index.html, src/main.tsx, src/App.tsx, src/vite-env.d.ts, .gitignore, README.md</files>
  <behavior>
    - `vite.config.ts` uses `defineConfig`, `@vitejs/plugin-react`, and `base: './'`.
    - `npm run build` exits 0 and writes `dist/index.html`.
  </behavior>
  <action>
    Create the Vite+React+TS app at repo root. Set **`base: './'`** in `vite.config.ts` (D-01, D-04). **Do not** add `react-router-dom` or `@tanstack/react-router`. Add scripts: `"dev"`, `"build"`, `"preview"`, `"test": "vitest run"`, `"test:e2e": "playwright test"`. Add dependencies: `zod`. Add devDependencies: `vitest`, `@vitejs/plugin-react` (if not already), `@playwright/test`, `jsdom` (for Vitest DOM if needed). Run `npm install` and ensure **package-lock.json** is created and tracked (DEPL-02). README.md: add sections **Prerequisites** (Node 20+ or pin `.nvmrc` to `22`), **Setup** `npm ci`, **Dev** `npm run dev`, **Build** `npm run build`, **Preview** `npm run preview`, **Test** `npx vitest run` — keep deploy/hosting for plan 03.
  </action>
  <acceptance_criteria>
    - `grep -E "base:\\s*['\"]\\.\\/['\"]" vite.config.ts` matches (relative base present).
    - `grep -q "\"test\":\\s*\"vitest run\"" package.json` OR scripts include vitest run.
    - `test -f package-lock.json` is true.
    - `npm run build` completes with exit code 0 and `test -f dist/index.html`.
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npm ci && npm run build && test -f dist/index.html</automated>
  </verify>
  <done>Greenfield app builds; lockfile exists; base is `./`; no router dependency in package.json.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Persist module (Zod + snapshot) + Vitest roundtrip</name>
  <read_first>
    - src/persist/ (after Task 1)
    - 01-CONTEXT.md D-05–D-08, D-06 snapshot not event-log
  </read_first>
  <files>src/persist/schema.ts, src/persist/storageKey.ts, src/persist/snapshot.ts, src/persist/snapshot.test.ts, vitest.config.ts</files>
  <behavior>
    - Invalid JSON or wrong schemaVersion fails `loadSnapshot` gracefully (returns null or `{ ok: false }` — pick one pattern and document in code).
    - Saving after mutating `completed` on a set round-trips through `localStorage` mock and validates with Zod.
  </behavior>
  <action>
    Add `src/persist/storageKey.ts` exporting `STORAGE_KEY = 'buscador_pt_snapshot_v1'`. Implement `schema.ts` per context block (schemaVersion 1, session.sets with planned vs optional completed). Implement `snapshot.ts`: `saveSnapshot(data)`, `loadSnapshot()` using `localStorage` and Zod `safeParse`. **Do not** persist volatile UI. Configure `vitest.config.ts` with `environment: 'jsdom'` if using localStorage. In `snapshot.test.ts`, use a fresh `Storage` mock per test; test: (1) save + load success, (2) completed set survives roundtrip, (3) corrupt JSON returns safe failure. Wire minimal `App.tsx` if needed only for build — full UI in plan 02.
  </action>
  <acceptance_criteria>
    - `grep -q "buscador_pt_snapshot_v1" src/persist/storageKey.ts`
    - `grep -q "schemaVersion" src/persist/schema.ts`
    - `npx vitest run` exits 0 from repo root.
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx vitest run</automated>
  </verify>
  <done>Snapshot module exists; Vitest proves SESS-03 data shape and roundtrip; STORAGE_KEY canonical.</done>
</task>

<task type="auto">
  <name>Task 3: Playwright config + smoke E2E on vite preview</name>
  <read_first>
    - .planning/phases/01-foundation-deploy/01-VALIDATION.md (webServer preview)
    - playwright docs pattern for vite preview
  </read_first>
  <files>playwright.config.ts, e2e/smoke.spec.ts</files>
  <action>
    Add `playwright.config.ts` at repo root with `webServer: { command: 'npm run preview', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI }` (or equivalent per Playwright 1.59). Add `e2e/smoke.spec.ts` that opens base URL and asserts `document` has root element (e.g. `#root` non-empty) or visible app title text. **Do not** assert reload persistence here — plan 02 adds that test.
  </action>
  <acceptance_criteria>
    - `grep -q "webServer" playwright.config.ts`
    - `grep -q "localhost:4173" playwright.config.ts`
    - `npx playwright test` exits 0 from repo root.
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx playwright test</automated>
  </verify>
  <done>Playwright runs against preview; smoke passes.</done>
</task>

</tasks>

<verification>
- `npm ci && npm run build && npx vitest run && npx playwright test` all succeed.
- No `react-router`, `@tanstack/router`, `dexie`, or `vite-plugin-pwa` in package.json dependencies.
</verification>

<success_criteria>
Reproducible install/build (DEPL-02 partial), static build artifact (DEPL-01 technical prerequisite), persisted session schema + tests (SESS-03 foundation) are in place.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-deploy/01-foundation-deploy-01-SUMMARY.md` (or phase naming convention used by execute-plan).
</output>
