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
  - tsconfig.json
  - tsconfig.node.json
  - index.html
  - src/main.tsx
  - src/App.tsx
  - src/vite-env.d.ts
  - .gitignore
  - README.md
autonomous: true
requirements:
  - DEPL-01
  - DEPL-02
user_setup: []
must_haves:
  truths:
    - "npm ci && npm run build produces dist/index.html with relative asset refs suitable for GitHub Pages project site (D-04) and local preview"
    - "package-lock.json exists so clean clone install is reproducible (DEPL-02)"
  artifacts:
    - path: vite.config.ts
      provides: "Vite build with base relative path"
      contains: "base: \"./\""
    - path: vitest.config.ts
      provides: "Vitest entry (no tests until plan 04)"
      contains: "vitest"
  key_links:
    - from: vite.config.ts
      to: dist/index.html
      via: "npm run build"
      pattern: "base: \"./\""
---

<objective>
Scaffold a greenfield **Vite + React + TypeScript** SPA with **`base: './'`** (D-01, D-04, per 01-RESEARCH), **no client router** (D-02). Add **package-lock.json**, minimal **vitest** config (`passWithNoTests: true` until 04-PLAN adds tests), and **README** “Prerequisites / Setup / Dev / Build / Preview” (DEPL-02 partial — full deploy narrative in 03-PLAN).

**Persistence, Vitest snapshot tests, and Playwright** are in **04-PLAN.md** to satisfy plan-checker file-count limits.
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

**Locked decisions:** D-01, D-02, D-04. **Do not** add Dexie, PWA, or TanStack Router. **Do not** add `src/persist/` in this plan (04-PLAN).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Scaffold Vite React TS + relative base + npm scripts + minimal Vitest</name>
  <read_first>
    - .planning/phases/01-foundation-deploy/01-CONTEXT.md (D-01, D-02, D-04)
    - .planning/phases/01-foundation-deploy/01-RESEARCH.md
    - If repo root is empty aside from `.planning/`, run `npm create vite@latest` into project root with `--template react-ts`; preserve `.planning/`.
  </read_first>
  <files>package.json, package-lock.json, vite.config.ts, vitest.config.ts, tsconfig.json, tsconfig.node.json, index.html, src/main.tsx, src/App.tsx, src/vite-env.d.ts, .gitignore, README.md</files>
  <behavior>
    - `vite.config.ts` uses `defineConfig`, `@vitejs/plugin-react`, and `base: './'`.
    - `npm run build` exits 0 and writes `dist/index.html`.
  </behavior>
  <action>
    Create the Vite+React+TS app at repo root. Set **`base: './'`** in `vite.config.ts`. **Do not** add `react-router-dom` or `@tanstack/react-router`. Add scripts: `"dev"`, `"build"`, `"preview"`, `"test": "vitest run"`. Add devDependencies: `vitest`, `@vitejs/plugin-react` (if not already), `jsdom`. **Do not** add `@playwright/test` here (04-PLAN). Add `vitest.config.ts` with `test: { passWithNoTests: true, environment: 'jsdom' }` (or equivalent) so `npm test` is valid before snapshot tests exist. Add dependencies: `zod` (for 04-PLAN persist). Run `npm install` and ensure **package-lock.json** is created and tracked. README.md: **Prerequisites** (Node 20+ or `.nvmrc` 22), **Setup** `npm ci`, **Dev** `npm run dev`, **Build** `npm run build`, **Preview** `npm run preview`, **Test** `npx vitest run` — defer GitHub Pages / CI to 03-PLAN.
  </action>
  <acceptance_criteria>
    - `grep -E "base:\\s*['\"]\\.\\/['\"]" vite.config.ts` matches
    - `test -f package-lock.json` is true
    - `npm run build` completes with exit code 0 and `test -f dist/index.html`
    - `! grep -q '@playwright/test' package.json` (no Playwright until 04-PLAN)
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npm ci && npm run build && test -f dist/index.html</automated>
  </verify>
  <done>Greenfield app builds; lockfile exists; base is `./`; no router; no Playwright dep yet.</done>
</task>

</tasks>

<verification>
- `npm ci && npm run build` succeeds
- No `react-router`, `@tanstack/router`, `dexie`, or `vite-plugin-pwa` in package.json dependencies
- Next: run **04-PLAN** before **02-PLAN** (02 depends on 01 + 04)
</verification>

<success_criteria>
Reproducible install/build (DEPL-02 partial) and static build artifact (DEPL-01 technical prerequisite) without exceeding single-plan file limits.
</success_criteria>
