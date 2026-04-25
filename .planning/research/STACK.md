# Technology Stack (Static, Local‑First)
**Project:** Buscador Personal Trainer (workout tracker)
**Researched:** 2026-04-25
**Constraint summary:** GitHub Pages static hosting (no server runtime), web-first, offline-capable, local-first data.

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

**Data model guidance (v1):**
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

**Offline strategy (v1):**
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

**Hosting guidance for videos (v1):**
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

```bash
# Core
npm i react react-dom

# Routing
npm i @tanstack/react-router

# Local-first persistence
npm i dexie

# State + validation
npm i zustand zod

# Forms
npm i react-hook-form @hookform/resolvers

# Styling + UI primitives
npm i -D tailwindcss postcss autoprefixer
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs

# PWA/offline
npm i -D vite-plugin-pwa

# Testing
npm i -D vitest @testing-library/react @testing-library/jest-dom
npm i -D playwright
```

## Sources
- Vite PWA plugin docs: `https://vite-plugin-pwa.netlify.app/guide/` and repo `https://github.com/vite-pwa/vite-plugin-pwa/`
- Dexie docs: `https://dexie.org/docs` and repo `https://github.com/dexie/Dexie.js/`
- TanStack Router docs: `https://tanstack.com/router/latest/docs/overview`
- Zustand docs + npm (shows current releases): `https://zustand.site/en/docs` and `https://www.npmjs.com/package/zustand`

