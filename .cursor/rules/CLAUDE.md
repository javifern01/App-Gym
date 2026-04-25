<!-- gsd-project-start source:PROJECT.md -->
## Project

**Buscador Personal Trainer**

Una app web para registrar entrenamientos en el gimnasio con una experiencia guiada paso a paso: te indica el ejercicio, series/reps, peso sugerido y descanso, y te ayuda a ejecutar bien con vídeos cortos y cues. Está pensada para adultos que quieren progresar (fuerza/hipertrofia/pérdida de grasa) sin fricción ni “parálisis de decisión”.

**Core Value:** El usuario puede completar una sesión de gimnasio guiada sin pensar “qué toca ahora”, registrando cada set con contexto suficiente para progresar con seguridad.

### Constraints

- **Deployment**: La aplicación debe poder subirse a GitHub y ejecutarse desde el navegador al abrirla desde el repositorio (objetivo: hosting estático, sin backend obligatorio en v1).
- **UX**: En ningún momento el usuario “llega a un folio en blanco” durante la sesión; siempre hay una siguiente acción clara.
- **Data fidelity**: El registro por set debe soportar timestamps y valores reales (no solo “planificados”).
<!-- gsd-project-end -->

<!-- gsd-stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack (v1 on GitHub Pages)
### Core app framework
| Technology | Recommended | Purpose | Why this (for GitHub Pages + local-first) |
|---|---:|---|---|
| Vite | Latest | Build tool / dev server | Fast dev/build, simple static output to `dist/`, first-class SPA deploy to GitHub Pages. |
| React | Latest | UI framework | Huge ecosystem for forms, accessibility primitives, media, and state patterns. |
| TypeScript | Latest | Type safety | Critical for a “guided workout” flow + data model correctness. |
### Routing
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| TanStack Router (`@tanstack/react-router`) | Latest | Type-safe SPA routing | Strong TS inference, nested routes/layouts, typed search params, and loader patterns that fit “guided session” flows well. |
### Local-first persistence (no backend)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| IndexedDB | Built-in | Durable browser storage | Only realistic durable store for large-ish structured data + offline-first on the web. |
| Dexie (`dexie`) | Latest | IndexedDB wrapper + schema + queries | Battle-tested, ergonomic, TypeScript-friendly, supports transactions, live queries, and avoids common IndexedDB footguns. |
- **Durable domain state** (sessions, sets, exercise library metadata, PRs) → Dexie/IndexedDB.
- **Ephemeral UI state** (current set being edited, timer UI state, filters) → in-memory store (Zustand) with explicit hydration from Dexie.
### State management
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Zustand (`zustand`) | Latest | Small global state for UI/session flow | Lightweight, minimal boilerplate, easy selectors (helps keep re-renders under control during “guided workout”). |
### Validation + schema
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Zod (`zod`) | Latest | Runtime validation + TS inference | Keep persisted objects and imported exercise library data safe (especially if you later add import/export or sync). |
### PWA/offline + caching (static hosting)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Vite PWA plugin (`vite-plugin-pwa`) | Latest | Service worker + manifest | Straightforward PWA setup on Vite with Workbox under the hood; supports precache + runtime caching strategies. |
- Precache the app shell + critical UI routes.
- Use runtime caching for exercise thumbnails and short videos with an explicit cache budget (avoid unbounded storage).
- Treat Dexie as the system of record for workout logs; SW caches are “performance only”.
### UI + accessibility
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Tailwind CSS | Latest | Styling system | Fast iteration for dense gym UI (timers, controls, tables) without bespoke CSS sprawl. |
| Radix UI (`@radix-ui/react-*`) | Latest | Accessible primitives | High-quality a11y primitives (dialogs, tabs, dropdowns) without owning all edge cases. |
### Forms (workout entry UX)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| React Hook Form (`react-hook-form`) | Latest | High-performance forms | Minimizes re-renders; great for “enter reps/weight quickly” flows. |
| `@hookform/resolvers` + Zod | Latest | Schema-driven validation | Keep input validation consistent with persisted schema. |
### Date/time + timers
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| date-fns | Latest | Date utilities | Small, straightforward; sufficient for session timestamps, weekly blocks, PR context. |
### Media (short technique videos)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Native `<video>` + MP4/WebM assets | N/A | Exercise demo playback | Lowest dependency approach; works well on static hosting. Keep videos short, compressed, and consider multiple renditions. |
- If your exercise library includes many videos, **avoid bloating the GitHub Pages repo**. Prefer a separate static asset host (S3/R2/Cloudflare) and reference URLs in your exercise library JSON.
- If you keep videos in-repo for v1, cap scope (top 20–50 exercises) and use aggressive compression.
### Testing (minimal but effective)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| Vitest | Latest | Unit/integration tests | Matches Vite ecosystem, fast feedback for data model + progression logic. |
| Playwright | Latest | E2E smoke tests | Validate the critical guided-workout flow across browsers. |
### Quality + tooling
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| ESLint | Latest | Linting | Catch footguns early, especially in hooks/state. |
| Prettier | Latest | Formatting | Keep diffs clean and consistent. |
### Deployment (GitHub Pages)
| Technology | Recommended | Purpose | Why |
|---|---:|---|---|
| GitHub Actions + Pages | N/A | CI build + deploy | Standard, repeatable deploy of `dist/` from Vite. |
## What NOT to Use (for v1 constraints)
### Don’t use SSR/full-stack frameworks for v1 (unless you truly need server features)
- **Avoid**: Next.js / Remix / “full-stack” runtimes **for a GitHub Pages-only v1**.
- **Why**: GitHub Pages is static hosting; SSR/server functions add complexity you can’t run there. You’d end up fighting deployment or overbuilding.
- **Instead**: Vite SPA + PWA + local-first storage.
### Don’t start with “sync engines” that require infrastructure
- **Avoid**: Anything that assumes a server component or persistent backend to be useful (many “local-first sync” systems do).
- **Why**: v1 explicitly has **no backend required**; focus on offline-first UX + correct local data model first.
- **Instead**: Dexie now; optionally add sync later (e.g., a dedicated phase with backend).
### Don’t use `localStorage` as your primary database
- **Avoid**: `localStorage`/`sessionStorage` for workout logs.
- **Why**: Size limits, blocking API, poor query support, easy corruption patterns.
- **Instead**: IndexedDB via Dexie.
### Don’t prematurely adopt heavy state stacks
- **Avoid**: Redux Toolkit (unless the team already standardizes on it).
- **Why**: More boilerplate than needed for a single-user, local-first v1; Dexie already carries your durable state.
- **Instead**: Zustand for UI/session flow + Dexie for persistence.
## Alternatives Considered (and why not)
| Category | Recommended | Alternative | Why Not (given v1 constraints) |
|---|---|---|---|
| UI framework | React | Svelte/Solid/Vue | All viable; React chosen for ecosystem breadth (forms + a11y primitives + testing) and team familiarity assumptions. |
| Router | TanStack Router | React Router | React Router is fine, but TanStack’s type-safe search params + loader/caching ergonomics pair nicely with “guided flow” screens. |
| Persistence | Dexie | “Raw IndexedDB” | Raw IndexedDB is verbose/error-prone; Dexie is the pragmatic default. |
| Persistence | Dexie | SQLite-in-the-browser (WASM) | Heavier footprint and complexity; IndexedDB is the web standard and enough for v1. |
## Installation (packages to start with)
# Core
# Routing
# Local-first persistence
# State + validation
# Forms
# Styling + UI primitives
# PWA/offline
# Testing
## Sources
- Vite PWA plugin docs: `https://vite-plugin-pwa.netlify.app/guide/` and repo `https://github.com/vite-pwa/vite-plugin-pwa/`
- Dexie docs: `https://dexie.org/docs` and repo `https://github.com/dexie/Dexie.js/`
- TanStack Router docs: `https://tanstack.com/router/latest/docs/overview`
- Zustand docs + npm (shows current releases): `https://zustand.site/en/docs` and `https://www.npmjs.com/package/zustand`
<!-- gsd-stack-end -->

<!-- gsd-conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- gsd-conventions-end -->

<!-- gsd-architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- gsd-architecture-end -->

<!-- gsd-workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- gsd-workflow-end -->



<!-- gsd-profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- gsd-profile-end -->
