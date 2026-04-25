---
phase: 01-foundation-deploy
plan: "03"
type: execute
wave: 2
depends_on:
  - "01"
  - "04"
  - "02"
files_modified:
  - README.md
  - .github/workflows/deploy-pages.yml
autonomous: true
requirements:
  - DEPL-01
  - DEPL-02
user_setup:
  - service: github_pages
    why: "Static hosting from repo (DEPL-01); private repo may require paid GitHub tier per 01-RESEARCH"
    env_vars: []
    dashboard_config:
      - task: "Enable GitHub Pages on gh-pages branch or GitHub Actions artifact; set source to match workflow"
        location: "Repository Settings → Pages"
  - service: static_host_b
    why: "Fallback if private repo cannot use GitHub Pages on current plan"
    dashboard_config:
      - task: "Connect repo to Cloudflare Pages or Netlify; set build command npm run build, output dist"
        location: "Vendor dashboard"
must_haves:
  truths:
    - "README documents clean clone → npm ci → npm run build → preview; lists localStorage key for reset"
    - "README documents GitHub Pages project-site URL shape and base './' (D-04); notes private-repo / plan prerequisite and static host B"
    - "CI workflow builds and uploads Pages artifact (or documents manual upload) so deploy is repeatable from git"
  artifacts:
    - path: README.md
      provides: "Reproducible build + deploy"
      contains: "npm ci"
    - path: .github/workflows/deploy-pages.yml
      provides: "Automated static deploy"
      contains: "upload-pages-artifact|pages"
  key_links:
    - from: README.md
      to: package.json
      via: "documented scripts must match"
      pattern: "npm run build"
    - from: .github/workflows/deploy-pages.yml
      to: dist/
      via: "npm run build then upload"
      pattern: "npm run build"
---

<objective>
Document **reproducible build and deploy** (DEPL-02) and operational **GitHub Pages / static hosting** path (DEPL-01): README prerequisites, exact commands, `localStorage` key name for testers, **private repo + Pages** caveat, **host B** alternative; add **GitHub Actions** workflow that runs `npm ci`, `npm run build`, and deploys to GitHub Pages via official Pages actions.

Purpose: Anyone cloning the repo can build; maintainers have an automated deploy path matching `base: './'` project sites.

Output: README deploy section + working `deploy-pages.yml` (or explicit manual-only path if workflow blocked — prefer workflow).
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-deploy/01-RESEARCH.md (GitHub Pages, private repo note)
@.planning/phases/01-foundation-deploy/01-CONTEXT.md (D-03 private repo, D-04 subpath)

**Workflow expectations:** Use `actions/checkout@v4`, setup Node with `actions/setup-node@v4` and `cache: 'npm'`, run `npm ci`, `npm run build`, then `actions/upload-pages-artifact` + `actions/deploy-pages@v4` (or current documented pair). Grant `GITHUB_TOKEN` permissions: `pages: write`, `id-token: write`. Document required **Settings → Pages** configuration (branch vs Actions). If org policy forbids workflows, state manual fallback in README **and** still document `npm run build` + uploading `dist/`.

**README must include:** Node version (match `.nvmrc` if present), `npm ci`, `npm run build`, `npm run preview`, test commands, **Storage**: `localStorage` key `buscador_pt_snapshot_v1` to clear state, **Deploy**: GitHub Pages URL `https://<owner>.github.io/<repo>/`, note D-03/D-04 and link to GitHub docs for private Pages availability; **Alternative**: Cloudflare/Netlify one-paragraph.
</context>

<tasks>

<task type="auto">
  <name>Task 1: README — reproducible build, tests, storage key, deploy hosts</name>
  <read_first>
    - package.json scripts from plan 01
    - src/persist/storageKey.ts for exact STORAGE_KEY string
    - 01-RESEARCH.md pitfall private repo Pages
  </read_first>
  <files>README.md</files>
  <action>
    Expand README with sections: **Requirements**, **Install** (`npm ci`), **Develop** (`npm run dev`), **Build** (`npm run build`), **Preview** (`npm run preview`), **Test** (`npx vitest run`, `npx playwright test`), **Troubleshooting state** (clear `localStorage` key `buscador_pt_snapshot_v1`), **Deploy** — GitHub Pages steps (enable Pages, rely on GitHub Actions from plan 03), expected URL shape for project site, **Private repository note** (verify plan allows private Pages; else use Cloudflare Pages/Netlify with same `dist`). Keep language Spanish or bilingual per project preference — match tone of ROADMAP/PROJECT (Spanish is fine).
  </action>
  <acceptance_criteria>
    - `grep -q "npm ci" README.md`
    - `grep -q "npm run build" README.md`
    - `grep -q "buscador_pt_snapshot_v1" README.md`
    - `grep -qi "github.io" README.md`
    - `grep -qi "Cloudflare\\|Netlify" README.md`
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && test -f README.md && grep -q "npm ci" README.md && grep -q "buscador_pt_snapshot_v1" README.md</automated>
  </verify>
  <done>README satisfies DEPL-02 documentation expectations and DEPL-01 user-facing deploy overview.</done>
</task>

<task type="auto">
  <name>Task 2: GitHub Actions workflow — build dist and deploy Pages</name>
  <read_first>
    - Current GitHub Actions docs for `deploy-pages` + `upload-pages-artifact`
    - 01-RESEARCH.md “Don’t Hand-Roll” CI suggestion
  </read_first>
  <files>.github/workflows/deploy-pages.yml</files>
  <action>
    Create `.github/workflows/deploy-pages.yml` triggered on `push` to `main` (or `master` — detect default branch name from repo if exists; if no git remote, use `main` and document). Job: checkout, setup Node 22 (or match `.nvmrc`), `npm ci`, `npm run build`, upload `dist` as Pages artifact, deploy to GitHub Pages environment `github-pages`. Set minimal concurrency group `pages` to avoid parallel deploys. Add comment in YAML reminding maintainer to enable Pages “GitHub Actions” source.
  </action>
  <acceptance_criteria>
    - `test -f .github/workflows/deploy-pages.yml`
    - `grep -q "npm ci" .github/workflows/deploy-pages.yml`
    - `grep -q "npm run build" .github/workflows/deploy-pages.yml`
    - `grep -qi "upload-pages-artifact\\|deploy-pages" .github/workflows/deploy-pages.yml`
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && test -f .github/workflows/deploy-pages.yml && grep -q "npm run build" .github/workflows/deploy-pages.yml</automated>
  </verify>
  <done>Workflow file exists and matches build output `dist/`; ready for maintainer to enable Pages (user_setup).</done>
</task>

</tasks>

<verification>
- `npm ci && npm run build` still succeeds after README/workflow added.
- README + workflow cross-reference same build commands.
</verification>

<success_criteria>
DEPL-01/DEPL-02: documented reproducible path + automated Pages deploy scaffold; private-repo caveat and host B documented.
</success_criteria>

<output>
After completion, create plan SUMMARY for plan 03 per execute-plan convention.
</output>
