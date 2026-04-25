# Architecture Patterns — Web-first Guided Workout Tracker (Static Hosting v1)
**Project:** Buscador Personal Trainer  
**Researched:** 2026-04-25  
**Focus:** Architecture (component boundaries, data flow, build order)  
**Overall confidence:** MEDIUM (patterns are standard; video/analytics vendor specifics are ecosystem-dependent)

## Executive Summary

For a **web-first guided workout tracker** that must ship as **static hosting (GitHub Pages) in v1**, the architecture should be **local-first**:

- Treat the workout “guided session” as a **deterministic state machine** driven by a **session event log** (append-only).  
- Persist everything locally (IndexedDB) so the app works **offline** and never blocks in-gym.  
- Model the domain around **Sets** (as you already decided), but separate **Plan** (prescription) from **Log** (what actually happened).  
- Keep **media** (exercise videos) and **analytics** as pluggable adapters so you can start with “static + external services” and later move to a backend without rewriting the core.

This yields a v1 that is shippable on static hosting, while creating clean seams for v2: auth, sync, shared programs, richer analytics, and content management.

## Recommended Architecture

### High-level diagram (static-hosting v1)

```
Browser (PWA)
 ├─ UI (Routes + Components)
 │   ├─ Guided Session Runner
 │   ├─ Program/Template Builder
 │   ├─ Exercise Library
 │   └─ History + Analytics (local)
 │
 ├─ Domain Layer (Pure TS)
 │   ├─ Session Engine (state machine)
 │   ├─ Progression Engine (1RM, double progression)
 │   ├─ Substitution Engine (equipment-based swaps)
 │   └─ Stats Engine (volume, PR detection)
 │
 ├─ Persistence Layer
 │   ├─ IndexedDB (primary)
 │   └─ Export/Import (JSON)
 │
 ├─ Media Adapter
 │   ├─ Video manifest resolver (HLS/MP4 URL)
 │   └─ Player wrapper (native/HLS.js)
 │
 └─ Telemetry Adapter (optional in v1)
     ├─ Privacy-friendly web analytics (page + key events)
     └─ Local metrics (session durations, adherence)
```

### Component boundaries (modules you should keep separate)

| Component | Responsibility | Input/Output | Notes (static hosting v1) |
|---|---|---|---|
| **UI Shell** | Routing, layout, installation prompts, offline banner | Reads from app services; displays state | “App shell” cached by service worker (PWA) |
| **Exercise Library** | Browse/search exercises, show cues + video | Reads `Exercise` entities; resolves media URLs | Keep media resolution out of UI |
| **Program/Template Builder** | Create/edit workout templates and substitution rules | Writes `WorkoutTemplate` | This is authoring; session runner consumes templates |
| **Guided Session Runner** | The main workflow: next action always clear | Consumes `SessionState`; dispatches commands | UI should be “thin”: render state, send user intents |
| **Session Engine (State Machine)** | Deterministic transitions: Start → Exercise → Set → Rest → Next → Complete | Commands in, next state + events out | The core “guided” behavior lives here |
| **Event Store (Session Log)** | Append-only log of user actions + timestamps | Stores `SessionEvent[]` | Enables recovery, analytics, and future sync |
| **Derived Views (Projections)** | Compute “current set”, timers, summaries | `events → projections` | Make these pure and testable |
| **Progression Engine** | 1RM estimate, overload suggestions, PR detection | Uses historical sets | Should not depend on UI/persistence |
| **Substitution Engine** | Map planned exercise to available equipment | Template + constraints in; substituted plan out | Static hosting friendly; later can be ML/remote |
| **Persistence Repos** | CRUD for exercises/templates/sessions | Domain DTOs in/out | IndexedDB (Dexie-like) recommended |
| **Media Adapter** | Convert `exercise.videoRef` → playback URL + poster | Returns HLS manifest or MP4 | Prefer external video hosting; don’t bloat repo |
| **Telemetry Adapter** | Pageviews + key events | Non-blocking | Must never affect workout flow; can be disabled |

## Domain Model (data model shaped for guided sessions)

### Core entities (stable, long-lived)

- **Exercise**
  - `id`, `name`, `equipment[]`, `muscles[]`, `cues[]`, `alternatives[]`
  - `media`: `videoRef` (provider + asset id) and optional `posterRef`
- **WorkoutTemplate** (aka program day / routine)
  - `id`, `name`, `goalTag`, `blocks[]`
  - Each block contains **planned exercises**, planned sets, target reps, rest prescription, intensity guidance (RPE/RIR), and substitution constraints.
- **UserPreferences** (v1 local)
  - Equipment available, default rest times, unit system, notification preferences

### Session model (separate “plan” from “actual”)

- **WorkoutSession**
  - `id`, `templateId?`, `startedAt`, `endedAt?`, `status` (in-progress/completed)
  - `planned` (snapshot at start): list of `PlannedExerciseInstance[]`
  - `eventLog`: append-only `SessionEvent[]`
- **SetEntry** (derived, not authored directly)
  - Derived from events, includes `actualReps`, `actualWeight`, `rir/rpe`, `completedAt`, `restActualSeconds`

### Why event log over “mutable session rows”

The guided flow needs **timestamps**, “prescribed vs actual”, **pause/resume**, and **never lose state** if the tab reloads. Modeling sessions as “current mutable row” causes hard bugs (partial updates, out-of-order timing). An event log makes:

- Recovery deterministic (replay events → restore state)
- Analytics easy (project events into summaries)
- Future sync feasible (events replicate; merge strategies exist)

### Minimal `SessionEvent` types (enough for v1)

- `SessionStarted(templateSnapshot)`
- `ExerciseStarted(exerciseInstanceId)`
- `SetPlanned(setSpec)` (optional if not in snapshot)
- `SetCompleted({ reps, weight, rir?, rpe?, timestamp })`
- `RestStarted({ prescribedSeconds, timestamp })`
- `RestEnded({ timestamp })`
- `ExerciseCompleted(exerciseInstanceId)`
- `SessionPaused/Resumed`
- `SessionCompleted`

**Rule:** UI never writes derived fields (like total volume). Only events + pure projections create derived data.

## Guided Session Flow (state machine)

### State machine approach

Implement a `SessionEngine` that exposes:

- `reduce(state, command) -> { state, events[] }`
- `project(events[]) -> SessionState` (or incremental projection)

**Commands** are user intents (tap “Complete set”, “Start rest”, “Skip exercise”, “Substitute”), and the engine emits canonical events.

### Typical guided loop

```
Load session → project(events) → render "Next action"
User action → command → engine.reduce → append events → re-project → render
```

### The “next action always clear” UX constraint

Enforce this at the state machine boundary:

- For any `SessionState`, compute a single `primaryAction` and 0–2 secondary actions.
- If multiple actions are equally valid, encode tie-break rules (e.g., “finish rest” beats “start next set”).

This keeps the UI consistent and prevents “blank page” states.

## Persistence & Static Hosting v1

### Storage strategy (local-first)

- **Primary DB:** IndexedDB (via a thin repository layer)
  - Tables/collections: `exercises`, `templates`, `sessions`, `sessionEvents`, `preferences`
  - Index on `sessionId`, `timestamp`, `exerciseId`
- **Backup:** Export/import as JSON
  - Export should include schema version + all entities + events
  - Import should validate and either merge or replace

### PWA/offline (recommended)

- Cache the app shell so it loads instantly in the gym.
- Treat network as optional; the app must be fully usable offline.

(This is aligned with common PWA workout trackers that prioritize offline + local storage patterns; see example PWA workout trackers using IndexedDB and feature-based architecture: `https://github.com/alexanderop/workouttracker`.)

## Media Handling (exercise videos) with static hosting

### Key principle

**Do not store/serve exercise videos from GitHub Pages** in v1. Large media will bloat builds, slow first load, and complicate caching.

Instead, store only **references** in the `Exercise` model and resolve to playback URLs at runtime via a **Media Adapter**.

### Recommended v1 options (pragmatic)

- **Option A (best “product” experience): external video hosting that outputs HLS**
  - Vendor examples commonly used: Cloudflare Stream / Bunny Stream / Mux (each supports direct upload + HLS).
  - Store: `provider`, `assetId`, and optional `playbackPolicy`/token config.
  - Frontend: use native HLS where available + `hls.js` fallback to play `.m3u8`.

- **Option B (fastest + free-ish): unlisted YouTube/Vimeo**
  - Lowest effort for v1 content; downside is branding/control and limited offline caching.
  - Still keep the same `videoRef` interface so you can swap later.

### Video delivery patterns to bake in

- **Transcoding/ready state:** `videoStatus = none | processing | ready` so the UI can show “Processing…” gracefully.
- **Security:** signed URLs or token auth where possible; avoid embedding raw origin URLs.
- **Performance:** lazy-load player and only resolve video URLs when the exercise card is visible.

## Analytics (static hosting v1)

### Split “product analytics” into two layers

1. **Local analytics (always on):** computed from session event logs
   - Volume per session, duration, adherence to rest prescription, PR detection, streaks
   - Stored locally; zero privacy risk; works offline

2. **Web analytics (optional, non-blocking):** pageviews + a few key events
   - Must be “fire-and-forget” and never impact the session runner.
   - Prefer privacy-friendly scripts appropriate for static hosting (e.g., Plausible-style simple analytics). Official vendor site: `https://plausible.io/`.
   - If you later need funnels/experiments/session replay, you can add heavier product analytics, but that’s usually v2.

### Recommended v1 event taxonomy (minimal)

- `session_start`, `session_complete`, `set_complete`, `rest_overrun`, `substitution_used`, `export_data`

Keep these as adapter calls that can be disabled.

## Data Flow (end-to-end)

### Start/Resume a session

```
User selects template
  → SessionService.start(templateId)
    → snapshot planned structure
    → append SessionStarted event
    → project events → SessionState
  → UI renders "Start first exercise"
```

### Completing a set + rest timer

```
User taps "Complete set"
  → command: CompleteSet(reps, weight, rir/rpe)
  → engine emits SetCompleted(timestamp)
  → append event
  → project → next state includes "Start rest"

User taps "Start rest"
  → engine emits RestStarted(prescribedSeconds, timestamp)
  → UI shows countdown (derived)
  → when user ends rest: RestEnded(timestamp)
```

### History + summaries

```
Sessions list
  → query sessions + events
  → projection builds SessionSummary:
      duration, total sets, tonnage, PR flags, rest adherence
  → charts derived from summaries (local)
```

## Build Order (phasing optimized for static hosting v1)

The roadmap should build “core loop” first, then expand.

1. **Domain + persistence foundation**
   - Session event model + projections
   - IndexedDB repositories + schema versioning
   - Import/export

2. **Guided Session Runner (thin UI)**
   - Session state machine + “next action always clear”
   - Rest timer + alerts (local notifications if available)
   - Prescribed vs actual logging at set granularity

3. **Exercise Library (content + media adapter)**
   - Exercise data model + search/filter
   - Video playback adapter (HLS/MP4/YouTube) + cues

4. **Templates + substitutions**
   - Template builder + equipment constraints
   - Substitution engine integrated into session start and mid-session swap

5. **Progression + PRs + summaries**
   - 1RM estimator + double progression suggestions
   - PR tracking with context
   - History dashboards (local analytics)

6. **Optional web analytics + polish**
   - Privacy-friendly web analytics adapter
   - Performance passes (lazy media, projection caching)

## Anti-patterns to avoid (especially in static v1)

### Anti-pattern: “Session = mutable row updated every tap”
**Why it hurts:** reloads can corrupt state; timing fields become inconsistent; hard to debug.  
**Instead:** append-only events + deterministic projections.

### Anti-pattern: “Media URLs sprinkled across UI”
**Why it hurts:** you can’t change providers without touching many components.  
**Instead:** `MediaAdapter.resolve(exercise.videoRef)`.

### Anti-pattern: “Analytics in the hot path”
**Why it hurts:** network delays during a workout create UX failures.  
**Instead:** enqueue + best-effort dispatch; disable by default in session runner.

## Scalability considerations (upgrade path)

| Concern | v1 (static, offline) | v2 (backend + sync) |
|---|---|---|
| Multi-device | Export/import | Auth + sync events |
| Data consistency | Local only | Event-based sync + conflict strategy |
| Content management | Seeded JSON | Admin CMS + video pipeline |
| Advanced analytics | Local projections | Server-side aggregation + cohorts |

## Sources (architecture-relevant)

- Example offline-first workout PWA using IndexedDB + feature-based architecture patterns: `https://github.com/alexanderop/workouttracker` (MEDIUM — reference implementation, not official guidance)
- Example local-first interval workout PWA patterns (service worker + resume): `https://github.com/antonmry/LocalFirstPacer` (MEDIUM)
- Video hosting ecosystem comparisons (vendor blog-level, verify when selecting): `https://www.pkgpulse.com/blog/mux-vs-cloudflare-stream-vs-bunny-stream-video-cdn-2026` (LOW→MEDIUM; use as starting point only)
- Plausible official site (static-friendly analytics): `https://plausible.io/` (MEDIUM)

