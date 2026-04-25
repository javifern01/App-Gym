# Phase 1: Foundation + Deploy - Research

**Researched:** 2026-04-25  
**Domain:** Static SPA on GitHub Pages (or equivalent), browser `localStorage` session snapshot  
**Confidence:** MEDIUM-HIGH (tooling is standard; GitHub billing/plan limits need confirmation on the target account)

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deploy (GitHub → navegador)**

- **D-01:** Debe poder **abrirse también “directamente”** (p. ej., `index.html` local) además de publicarse en GitHub.
- **D-02:** En v1, la app será **single-page sin rutas** (evitar problemas de routing/404 en hosting estático).
- **D-03:** El repo será **privado**.
- **D-04:** Si se usa GitHub Pages, se asume despliegue bajo `/<repo>/` (no root-domain).

**Persistencia local (SESS-03)**

- **D-05:** Persistencia durable en v1: **localStorage**.
- **D-06:** Reanudación de sesión tras refresh: **snapshot** del estado actual (no event-log).
- **D-07:** Persistir **en cada acción relevante** (auto-save continuo).
- **D-08:** En Phase 1 se define un **esqueleto de modelo** (estructura base) aunque la librería de ejercicios llegue en Phase 3.

**PWA / Offline**

- **D-09:** En v1: **sin PWA** (web normal).
- **D-10:** Alertas del timer: **solo in-app** (visual/sonido), sin notificaciones del sistema.
- **D-11:** Sin límite explícito de cache/storage en v1 (por defecto del navegador).

**UI mínima**

- **D-12:** Primera pantalla: **wizard/onboarding mínimo** (enfoque objetivo/equipo) antes de iniciar.
- **D-13:** Navegación: **una sola pantalla** (sin rutas; coherente con single-page).
- **D-14:** Empty state sin sesiones: **CTA claro** para iniciar primera sesión.
- **D-15:** Si hay sesión en curso y se recarga: **auto-resume** sin preguntar.

### Claude's Discretion

- Definir el detalle exacto del wizard (preguntas mínimas) siempre que no cree scope nuevo fuera de Phase 1.
- Definir la micro-UX de auto-guardado (indicadores “guardado” discretos vs silencioso).

### Deferred Ideas (OUT OF SCOPE)

- Posible mejora futura (si localStorage se queda corto): mover persistencia a **IndexedDB/Dexie**.
- Posible mejora futura: **PWA instalable** para offline y mejor UX en el gym.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **DEPL-01** | La aplicación se puede publicar en GitHub y ejecutarse en el navegador abriéndola desde el repositorio (objetivo: GitHub Pages u hosting estático equivalente). | Vite static `dist/` + `base` for project Pages; CI optional; private-repo plan limits; alternatives (Cloudflare Pages, Netlify). |
| **DEPL-02** | El build/deploy queda documentado (pasos reproducibles) y funciona desde un repo limpio. | `package.json` scripts, lockfile, documented `npm ci` → `npm run build`, env vars (if any), GitHub Actions or manual Pages source. |
| **SESS-03** | La sesión guarda series “completadas” vs “planificadas” y permite continuar tras recargar el navegador. | `localStorage` JSON snapshot + `schemaVersion`; Zod parse on load; persist after each relevant action; completed vs planned fields in skeleton model. |

</phase_requirements>

## Project Constraints (from `.cursor/rules/`)

- **GSD workflow:** Prefer GSD entry points (`/gsd-quick`, `/gsd-debug`, `/gsd-execute-phase`) before ad-hoc edits; keep planning artifacts in sync.
- **Product (from embedded PROJECT.md):** Deploy from GitHub / static hosting; UX must not leave users on a “blank page” during a session; per-set data fidelity later — Phase 1 establishes persistence shell.
- **Canonical research (`STACK.md` / `CLAUDE.md`):** Long-term stack recommends Dexie/IndexedDB + optional PWA — **Phase 1 explicitly overrides** with **localStorage + snapshot** per CONTEXT. Do not implement Dexie/PWA in Phase 1; plan migration only as deferred.

## Summary

Phase 1 is **greenfield**: deliver a **minimal TypeScript SPA** (Vite + React) with **no client-side router** (single view / conditional UI), deployable as static files to **GitHub Pages project site** at `https://<owner>.github.io/<repo>/` (locked: D-04). Vite’s `base` option should be set for **embedded deployment**: official docs allow **`./`** for relative asset URLs, which aligns with both **project Pages** (subpath) and **opening `dist/index.html` locally** without rewriting absolute `/`-root paths.

**Private repository (D-03) + GitHub Pages:** GitHub’s own product/feature matrix states that **GitHub Pages for private repositories** is not the same as for public ones on all free tiers; **private repo → Pages** often requires a **paid GitHub plan** (e.g. Pro) or an **organization** with appropriate features — **verify against [GitHub’s plans documentation](https://docs.github.com/en/get-started/learning-about-github/githubs-products)** for the target account. If Pages is unavailable, **DEPL-01** still allows an **equivalent static host** (e.g. Cloudflare Pages, Netlify) connected to the same private GitHub repo — document that fork in DEPL-02.

**SESS-03** uses **localStorage** (D-05) with a **versioned JSON snapshot** (D-06–D-08), not an append-only event log. The canonical `ARCHITECTURE.md` prefers event-sourcing for later analytics/sync; for Phase 1, a **single persisted object** (or small set of keys) with **Zod** validation on read avoids hand-rolling unsafe JSON parsing. Persist **after each relevant user action** (D-07). Include **`schemaVersion`** from day one so Phase 3+ can migrate storage without silent corruption.

**Primary recommendation:** **Vite + React + TypeScript**, `base: './'`, **Zod** for persisted shape, **optional Zustand** for in-memory UI state, **no router**, **no service worker/PWA**; document **reproducible build** and one **CI or manual** deploy path; treat **GitHub account tier** as an environment gate for “Pages from private repo.”

## Standard Stack

### Core

| Library | Version (verified 2026-04-25) | Purpose | Why Standard |
|---------|-------------------------------|---------|----------------|
| **Vite** | 8.0.10 | Dev server + static build | Official static output; `base: './'` for [embedded deployment](https://vite.dev/config/shared-options.html#base). |
| **React** | 19.2.5 | UI | Ecosystem, matches long-term plan in `STACK.md`. |
| **TypeScript** | 6.0.3 | Safety | Domain shape for session snapshot. |
| **Zod** | 4.3.6 | Runtime validation of persisted JSON | Aligns with research stack; guards `localStorage` corruption. |

### Supporting (Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|-----------|-------------|
| **Zustand** | 5.0.12 | Lightweight global state | If prop-drilling the session becomes noisy; optional for Phase 1. |
| **Vitest** | 4.1.5 | Unit/component tests | Snapshot persist/restore, Zod schemas. |
| **Playwright** (`@playwright/test`) | 1.59.1 | E2E smoke | Reload persistence (SESS-03) against `vite preview`. |

### Explicitly out of Phase 1 (per CONTEXT)

| Item | Reason |
|------|--------|
| **TanStack Router / any router** | D-02 single-page sin rutas. |
| **vite-plugin-pwa / service worker** | D-09 sin PWA. |
| **Dexie / IndexedDB** | D-05 localStorage; deferred in CONTEXT. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Pages | Cloudflare Pages, Netlify, GitLab Pages | Often **free private repo** connect + static deploy; add vendor-specific docs in DEPL-02. |
| Zod | Type-only TS | **No runtime safety** on `localStorage` — avoid. |
| Snapshot | Event log (see `ARCHITECTURE.md`) | Better for v2 sync/analytics; **out of scope** for Phase 1 (D-06). |

**Installation (illustrative — verify during implementation):**

```bash
npm create vite@latest . -- --template react-ts
npm install zod
npm install -D vitest @playwright/test @vitejs/plugin-react
# optional: npm install zustand
```

**Version verification:** `npm view <package> version` (executed 2026-04-25 for versions in tables).

## Architecture Patterns

### Recommended layout

```
src/
├── main.tsx              # mount
├── App.tsx               # single shell: wizard / empty / session (conditional)
├── domain/               # pure TS: session state shape, reducers (optional)
│   └── sessionModel.ts
├── persist/
│   ├── storageKey.ts     # e.g. `gym_app_v1`
│   ├── snapshot.ts       # read/write + schemaVersion
│   └── schema.ts         # Zod schemas
└── components/           # minimal UI for Phase 1
```

### Pattern 1: Versioned `localStorage` snapshot

**What:** One primary key (or a small fixed set) holds `JSON.stringify({ schemaVersion, session, preferences })`.  
**When to use:** Phase 1 only; migrate to Dexie later if needed (deferred).  
**Example:**

```typescript
// Pattern: Zod + version gate (planner/impl should cite Zod 4 API as installed)
import { z } from "zod";

const SessionSnapshotV1 = z.object({
  schemaVersion: z.literal(1),
  startedAt: z.string().optional(),
  // planned vs completed at set granularity — skeleton for later phases
  sets: z.array(
    z.object({
      setIndex: z.number(),
      planned: z.object({ reps: z.number() }),
      completed: z
        .object({ reps: z.number(), at: z.string() })
        .optional(),
    })
  ),
});

type SessionSnapshotV1 = z.infer<typeof SessionSnapshotV1>;
```

### Pattern 2: Vite `base` for `/<repo>/` and local `file:` / preview

**What:** Use **`base: './'`** so asset URLs in built `index.html` are relative (Vite: empty string or `./` for embedded deployment).  
**When to use:** Project GitHub Pages + “open built `index.html`” (D-01, D-04).  
**Note:** If a maintainer needs absolute-path deployment only, switch to `base: '/<repo>/'` — but that breaks naive `file://` unless combined with a second build. Prefer **one** build with **relative** base for Phase 1 simplicity.

### Pattern 3: Auto-save on relevant actions

**What:** After each user action that mutates session progress (start session, complete set, mark planned → completed), re-serialize and `setItem`.  
**When to use:** D-07; avoid debouncing past “next paint” for critical actions if the user closes the tab immediately (still optional micro-debounce for typing fields).

### Anti-patterns to avoid

- **Router with browser history** for Phase 1 — conflicts with D-02 and static hosting 404 footguns.
- **Storing the whole app state including volatile UI** — bloats storage and complicates schema evolution; persist **session + prefs** only.
- **Relying on `localStorage` for large media** — not applicable yet; keep payload small.
- **Ignoring `QuotaExceededError`** — catch and surface a minimal in-app error (MEDIUM priority in Phase 1).

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundling / HMR | Custom Webpack | **Vite** | Maintained, documented, static `dist/`. |
| Ad-hoc JSON parsing | `JSON.parse` without validation | **Zod** | Corrupt/older schema breaks silently. |
| Path rewriting for Pages | String replace in HTML | **Vite `base`** | [Official public base path](https://vite.dev/guide/build#public-base-path). |
| “Deploy pipeline” in prose only | — | **GitHub Actions `workflow` + `actions/upload-pages-artifact` OR** documented branch/folder | DEPL-02 reproducibility. |

**Key insight:** The “hard” parts of Phase 1 are **correct asset paths** and **durable, valid snapshots** — both have library/framework solutions.

## Runtime State Inventory

> **Omitted for greenfield** — no existing databases, OS registrations, or external live configs. First implementation creates new browser-local keys only. When the app ships, document the **`localStorage` key name** in DEPL-02 so testers can reset state.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | N/A (greenfield) | Define initial key + schema in code |
| Live service config | N/A | — |
| OS-registered state | N/A | — |
| Secrets/env vars | None expected for static-only Phase 1 | If adding tokenized hosts later, document in requirements |
| Build artifacts | `dist/` after build | Regenerate with documented commands |

## Common Pitfalls

### Pitfall 1: GitHub Free vs private repo Pages

**What goes wrong:** CI/docs assume Pages from a private repo, but the account cannot enable it.  
**Why it happens:** [GitHub product tiers](https://docs.github.com/en/get-started/learning-about-github/githubs-products) differ on **Pages in private repositories**.  
**How to avoid:** Document **prerequisite** in README; offer **static host B** (Cloudflare/Netlify) for the same build artifacts.  
**Warning signs:** “Pages build disabled” in repo settings; greyed-out options.

### Pitfall 2: `file://` and ES modules

**What goes wrong:** Opening `dist/index.html` via `file://` fails in some browsers for module scripts.  
**Why it happens:** Browser security rules for module scripts vs `file` origin.  
**How to avoid:** Treat **`npm run preview`** (or `npx serve dist`) as the supported “local open” for testing; for D-01, `base: './'` + relative assets works when the browser allows; **verify** on target browser.  
**Warning signs:** Blank page + console CORS/file errors.

### Pitfall 3: Snapshot schema drift

**What goes wrong:** After a code change, old `localStorage` breaks load or shows wrong data.  
**Why it happens:** No `schemaVersion` or migration.  
**How to avoid:** **Always** include `schemaVersion`; on mismatch, **reset** or run a **small migration** function (planner: explicit task).  
**Warning signs:** `Zod` parse errors in console after deploy.

### Pitfall 4: Contradiction with `STACK.md` (Dexie vs localStorage)

**What goes wrong:** Implementer uses IndexedDB “because research said so.”  
**Why it happens:** `STACK.md` + `SUMMARY.md` favor Dexie.  
**How to avoid:** **CONTEXT is authoritative for Phase 1** (D-05, D-06).  
**Warning signs:** Unnecessary `dexie` in `package.json` in Phase 1.

## Code Examples

### Vite `base` (embedded / relative)

```ts
// vite.config.ts — Source: https://vite.dev/config/shared-options.html#base
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
});
```

### Save snapshot (after mutation)

```typescript
import { z } from "zod";
import { SessionSnapshotV1 } from "./schema";

const KEY = "buscador_pt_snapshot_v1";

export function saveSnapshot(data: z.infer<typeof SessionSnapshotV1>) {
  const parsed = SessionSnapshotV1.parse(data);
  localStorage.setItem(KEY, JSON.stringify(parsed));
}
```

### Load on startup (auto-resume D-15)

```typescript
export function loadSnapshot() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const json = JSON.parse(raw);
  return SessionSnapshotV1.safeParse(json);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|-------------|--------|
| Global mutable “session object” only | **Versioned Zod + snapshot** | Phase 1 | Safer evolution |
| `base: /` only | **`./` embedded deployment** | Vite supported for years | One build for subpath + local |
| Full PWA in v0 | **Deferred** (CONTEXT D-09) | Project decision | Simpler Phase 1 |

**Deprecated/outdated for Phase 1:**

- Adding **service worker** or **TanStack Router** — contradicts locked decisions.

## Open Questions

1. **Exact GitHub plan for the maintainer?**
   - **What we know:** Private repo + Pages may need paid tier (verify on [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-products)).
   - **What’s unclear:** Whether the user will use **Pro** or an alternative host.
   - **Recommendation:** In PLAN, add a **prerequisite check** and **host B** in DEPL-02.

2. **Is “open `index.html` double-click” a hard acceptance test on Safari iOS?**
   - **What we know:** `file://` module limitations vary.
   - **What’s unclear:** Target browsers for D-01.
   - **Recommendation:** Define ** minimum browsers** in verification (e.g. latest Chromium + Safari).

3. **Wizard fields (Claude’s discretion)?**
   - **What we know:** Minimal objective/team focus (D-12).
   - **What’s unclear:** Exact questions.
   - **Recommendation:** 2–4 fields max; store in same snapshot under `preferences` or `onboarding`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, npm | ✓ | v22.22.0 (local probe) | Use nvm/volta to pin LTS in docs |
| npm | install/build | ✓ | 10.9.4 | pnpm/yarn with lockfile policy — pick one in Phase 1 |
| git | clone/push | ✓ | 2.50.1 | — |
| GitHub account with Pages (private) | DEPL-01 | ? | — | Cloudflare/Netlify static deploy |
| Modern browser with `localStorage` | SESS-03 | ✓ (assumed) | — | Manual UAT if unavailable |

**Missing dependencies with no fallback:**

- If **no** static hosting + **no** way to push `dist/`: **DEPL-01/02** blocked — resolve before implementation.

**Missing dependencies with fallback:**

- **GitHub Pages unavailable** on current plan → use **Cloudflare Pages / Netlify** (still satisfies “static + from GitHub” if doc’d).

**Step 2.6 note:** Probed on the workspace machine only; **CI** should fix Node version in `package.json` / `.nvmrc` for reproducible DEPL-02.

## Validation Architecture

> Nyquist-style: enabled per `.planning/config.json` (`workflow.nyquist_validation: true`).

### Test framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + (optional) Playwright 1.59.x |
| Config file | `vitest.config.ts` at repo root (Wave 0) |
| Quick run | `npx vitest run` |
| Full suite | `npx vitest run` + `npx playwright test` |

### Phase requirements → test map

| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|-------------|
| **DEPL-01** | `npm run build` produces `dist/index.html` + assets; loadable via static server | script/smoke | `npm ci && npm run build` + `npx serve dist` manual or Playwright | ❌ Wave 0 |
| **DEPL-02** | Clean clone + install + build succeeds (documented) | CI / script | Same as above in fresh worktree; optional `npm ci` in GitHub Actions | ❌ Wave 0 |
| **SESS-03** | After reload, session state matches (planned vs completed progress) | unit + e2e | Vitest: persist → parse → restore; Playwright: `page.reload()` | ❌ Wave 0 |

### Sampling rate

- **Per task commit:** `npx vitest run` (fast).
- **Per wave merge:** Vitest + Playwright (SESS-03).
- **Phase gate:** Full suite green before `/gsd-verify-work` UAT (open app from host URL + manual reload check).

### Wave 0 gaps

- [ ] `vitest.config.ts` + `src/persist/snapshot` unit tests — covers **SESS-03** parse/roundtrip.
- [ ] `playwright.config.ts` with `webServer: npm run preview` — e2e reload.
- [ ] `package-lock.json` (or pnpm lock) committed — supports **DEPL-02** reproducibility.
- [ ] `README.md` (or `docs/DEPLOY.md`) — **DEPL-02** steps (no separate doc file unless project convention requires — prefer minimal `README` section in Phase 1).

*(If no gaps: not applicable — all missing until Wave 0.)*

## Sources

### Primary (HIGH confidence)

- [Vite `base` / embedded deployment](https://vite.dev/config/shared-options.html#base) — `base: './'`.
- [Vite public base path guide](https://vite.dev/guide/build#public-base-path) — path behavior for assets.
- [About GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages) — project site URL shape `/<repositoryname>`.
- [GitHub’s products / features](https://docs.github.com/en/get-started/learning-about-github/githubs-products) — **Pages and private repos** (verify tier).

### Secondary (MEDIUM)

- Project canonical: `.planning/research/STACK.md`, `SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md` — long-term; **localStorage + snapshot overrides for Phase 1** per `01-CONTEXT.md`.
- [Changing visibility of GitHub Pages (Enterprise)](https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site) — for org-private sites (if ever needed).

### Tertiary (LOW — validate at implementation)

- Community comparisons of “Pages + private repo” (blogs/Reddit) — use only to prompt verification, not as sole source.

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH — Vite/React/Zod are mainstream; versions pinned via npm registry 2026-04-25.
- **Architecture:** MEDIUM-HIGH — `base: './'` is official; `file://` edge cases need one manual verification pass.
- **Pitfalls:** MEDIUM — GitHub billing rules change; re-check docs when implementing DEPL-01.
- **Private repo + Pages:** MEDIUM — must confirm on [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-products).

**Research date:** 2026-04-25  
**Valid until:** ~30 days (tooling) / **7 days** if GitHub changes Pages pricing (re-verify).

## RESEARCH COMPLETE

This document is ready for `gsd-planner` to produce `PLAN.md` tasks: scaffold Vite React TS, `base: './'`, Zod snapshot + `schemaVersion`, minimal wizard + empty + session UI, `localStorage` auto-save, documented reproducible build and deploy (GitHub Pages with account caveat or static host B), and Vitest/Playwright coverage for **DEPL-01, DEPL-02, SESS-03**.
