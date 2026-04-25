# Project Research Summary

**Project:** Buscador Personal Trainer
**Domain:** Web-first guided gym workout tracker (local-first, offline-capable)
**Researched:** 2026-04-25
**Confidence:** MEDIUM

## Executive Summary

This project is a **guided strength-training workout tracker** whose primary promise is: in the gym, the user never wonders “what’s next” and can log sets **fast and reliably** (even with poor signal), while still capturing enough context (timestamps, rest, optional RIR/RPE, exercise variant) to support **progression and trustworthy PRs**.

Given the **GitHub Pages / static hosting** constraint, the recommended v1 approach is a **local-first PWA SPA**: a Vite/React/TypeScript app that persists durable data in **IndexedDB (via Dexie)** and treats the guided workout as a **deterministic state machine backed by an append-only session event log**. This architecture is both robust for offline use (reload-safe) and sets up clean seams for v2 (auth/sync, coach mode, richer analytics) without rewriting the core.

The main risks are product/UX and data fidelity, not “tech difficulty”: if logging is even slightly high-friction or sessions are not reload-proof, retention collapses; if exercises lack stable canonical IDs and substitutions aren’t first-class, PRs/progression become untrustworthy. Mitigate by prioritizing **one-screen set logging**, aggressive prefill, undo/edit, persistent timers, a canonical exercise catalog (stable IDs + variants), and conservative, explainable progression rules (double progression + hold/deload).

## Key Findings

### Recommended Stack

The stack should optimize for **static deployment + offline-first reliability + high-velocity UI iteration**. Persist durable domain data in IndexedDB, keep ephemeral UI state light, and treat service worker caching as performance-only (Dexie is the system of record).

**Core technologies:**
- **Vite**: build/dev tooling — fast iteration and clean static output for GitHub Pages.
- **React + TypeScript**: UI + correctness — ecosystem depth for forms/a11y and safe domain modeling.
- **TanStack Router**: routing — type-safe params and nested layouts for a guided, multi-screen flow.
- **Dexie (IndexedDB)**: persistence — ergonomic, battle-tested local database for offline-first logs.
- **Zustand**: state — minimal global UI/session flow state with explicit hydration from Dexie.
- **Zod**: validation — runtime schema safety for persisted entities + future import/export/sync.
- **React Hook Form (+ Zod resolvers)**: forms — low re-render cost for rapid set entry UI.
- **Tailwind + Radix UI**: UI system — fast dense gym UI with accessible primitives.
- **vite-plugin-pwa**: PWA — straightforward offline app shell precache + runtime caching.
- **Vitest + Playwright**: tests — cover projections/progression logic and guided-session smoke flows.

### Expected Features

The market expects the basics (fast set logging, templates, timers, history) and rewards apps that reduce cognitive load with **guided session flow** and **progress context**. For this product, the MVP should concentrate on the “in-gym loop” and only then expand into heavier automation and multi-actor features.

**Must have (table stakes):**
- Fast in-gym set logging (weight/reps/sets) with low friction
- Exercise library + custom exercises
- Routines/templates (start workout from template; edit mid-workout)
- Rest timer (per exercise + defaults) with alerts
- “Previous performance” surfaced during workout
- PR tracking (automatic) + estimated 1RM
- Progress visuals + exercise history
- Calendar/workout history timeline
- Notes per exercise + per workout
- Common set types / groupings (at least warm-up tags; ideally simple superset grouping)
- Offline-first logging
- Export/data portability (CSV/JSON)
- Units support (kg/lb) + equipment basics (bar/plate rounding defaults)

**Should have (competitive):**
- Guided “live workout mode” that always shows the next clear action
- Conservative progression nudges (rules-based) that are explainable and overrideable
- Exercise substitution engine (busy equipment) based on movement pattern/equipment constraints
- Technique guidance surface (short video + cues) via a pluggable media adapter

**Defer (v2+):**
- Adaptive programming / algorithmic plan generation (high risk without strong guardrails)
- Plateau detection + deload automation beyond simple triggers
- Coach mode (trainer/client multi-actor workflows)
- Social feed / sharing-first loops
- Wearable/watch companion

### Architecture Approach

The recommended architecture is **local-first and event-driven**: model the guided workout as a state machine where user intents produce canonical **session events**, and the UI renders pure projections (“next action always clear”). Persist the event log in IndexedDB so sessions can be resumed deterministically after refresh, and keep media/telemetry as adapters so they’re optional and swappable.

**Major components:**
1. **Guided Session Runner (UI)** — renders session state, captures user intents, keeps the primary action obvious.
2. **Session Engine (domain, pure TS)** — deterministic `reduce(command) -> events` + projections; enforces flow invariants.
3. **Event Store + Repositories (persistence)** — append-only session events and CRUD for exercises/templates/preferences in IndexedDB.
4. **Exercise Library (UI + domain models)** — canonical exercise entities (stable IDs, variants, equipment/muscles).
5. **Progression/Stats Engine (domain)** — PR detection, e1RM estimation, simple double-progression suggestions from history.
6. **Substitution Engine (domain)** — maps planned exercises to performed ones with constraints; records substitution explicitly.
7. **Media Adapter** — resolves `videoRef` to playback URLs; avoids hardwiring providers into UI.
8. **PWA + Caching** — precache app shell; runtime caching for thumbnails/videos with explicit budgets.

### Critical Pitfalls

1. **Logging friction** — kills retention. Avoid with one-screen flow, aggressive prefill, optional advanced fields, large tap targets, and offline-first behavior.
2. **Weak exercise data model (no stable IDs / variants)** — breaks PRs/progression/analytics. Avoid with a canonical exercise catalog, aliases for display only, and substitution as first-class data (`planned_exercise_id` vs `performed_exercise_id`).
3. **PRs/progression without execution context** — produces unsafe or nonsensical recommendations. Capture timestamps, rest prescribed vs actual, and optional RIR/RPE; show PR context and rationale.
4. **Progression too aggressive / unrealistic increments** — erodes trust and increases failure. Use conservative double progression, configurable increments, and explicit hold/deload/reset triggers.
5. **“Guided” UX that isn’t deterministic** — blank states, lost timers, reload bugs. Treat the session as a state machine + event log; make timer persistent; provide undo/edit last set.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Local-first guided session (core loop)
**Rationale:** Everything else depends on a trustworthy, low-friction in-gym flow; failures here collapse retention.
**Delivers:** Session engine + event log model; one-screen set logging; rest timer (persistent); undo/edit last set; resume after refresh; offline-first persistence in IndexedDB; basic templates “start workout”.
**Addresses:** Fast logging, timers, offline-first, templates, notes (minimal), “next action always clear”.
**Avoids:** Logging friction; “session = mutable row” bugs; losing timer/session state.

### Phase 2: Canonical exercise library + media adapter
**Rationale:** Stable exercise IDs and variants are required before PRs/progression are reliable; media should be pluggable and not bloat static hosting.
**Delivers:** Normalized `Exercise` catalog (IDs, equipment/muscles, alternatives, variants), search/filter UI, `videoRef` + media resolver, short video playback and cues.
**Uses:** Zod validation for seeded/imported exercise data; runtime caching budgets for media.
**Avoids:** Fragmented history from inconsistent naming; repo bloat from shipping many videos in GitHub Pages.

### Phase 3: History, summaries, and PRs with context
**Rationale:** Once data capture and exercise canonicalization are stable, users expect progress visibility and credible PRs.
**Delivers:** Session summaries (duration, volume/tonnage, rest adherence), calendar/timeline, exercise history charts, PR detection and display with variant/rest/RIR context.
**Implements:** Event projections → summaries; “previous performance” surfaced in the workout UI.
**Avoids:** PRs without context; progress metrics that incentivize “gaming” (add guardrails).

### Phase 4: Progression v1 (conservative + explainable)
**Rationale:** Progression recommendations are a differentiator but risky; build on trustworthy history + context first.
**Delivers:** e1RM estimation, double-progression nudges, configurable increments/rounding, hold/deload/reset triggers, explainable “why” UI and easy overrides.
**Addresses:** “Tell me what to lift next” in a safe, rules-based way (not “AI”).
**Avoids:** Over-aggressive progression and unrealistic jumps; overreliance on noisy RIR.

### Phase 5: Substitutions + template personalization depth
**Rationale:** Equipment availability is a key real-world failure mode; substitutions must be tracked explicitly for analytics/progression.
**Delivers:** Substitution rules by equipment/movement intent; in-session swap UX; tracking `planned` vs `performed`; implement-specific progression adjustments.
**Avoids:** Applying the same progression across non-equivalent movements/equipment; invisible stimulus changes.

### Phase 6 (v2+): Periodization/fatigue and multi-actor scale
**Rationale:** Deloads, adaptive programming, coach mode, social, and wearable integrations expand scope significantly and should be gated behind proven core loop + data quality.
**Delivers:** Simple periodization/deload support, plateau detection with guardrails, optional backend/auth + event sync, coach/client workflows.
**Avoids:** Building analytics/automation on dirty data; unpredictable “overfitted” adaptation.

### Phase Ordering Rationale

- The dependency chain is: **low-friction logging + offline + deterministic session** → **canonical exercises** → **history/PRs** → **progression** → **substitutions at scale** → **periodization/coach/sync**.
- Architecture dictates early investment in **event log + projections** to prevent reload-state bugs and enable analytics/sync later.
- Pitfalls strongly argue for gating: do not build advanced analytics/AI/coaching until capture quality and exercise IDs are stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Media/video hosting choice):** provider capabilities, cost, HLS vs MP4, offline caching constraints, legal/licensing for demos.
- **Phase 6 (Auth + sync + coach mode):** event sync/conflict resolution strategy, privacy/security model, multi-tenant roles.
- **Phase 4–6 (periodization/fatigue):** choose an explainable approach and validate with lifter users to avoid “over-smart” behavior.

Phases with standard patterns (skip research-phase):
- **Phase 1 (local-first PWA + event-log session):** well-understood patterns; implement and iterate quickly with user feedback.
- **Phase 3 (history/PR projections):** standard derivations once model is stable.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Choices are mainstream for static SPAs + local-first (Vite/React/TS/Dexie/PWA); official docs available. |
| Features | MEDIUM | Derived from multiple successful products, but priorities should be validated with target users (novice vs intermediate vs coach). |
| Architecture | MEDIUM | Event-log + state-machine is a strong fit; implementation details (projection strategy, performance) will need iteration. |
| Pitfalls | MEDIUM | Training/progression guidance is credible, but UX/product pitfalls still require real user testing in-gym. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Target user segment clarity (novice vs intermediate vs coach)**: influences how much guidance to surface, whether RIR/RPE is optional by default, and what “success metrics” matter.
- **Exercise library sourcing/licensing**: decide whether to seed from public datasets, manual curation, or user-generated entries; validate legality for videos/cues.
- **PWA notification constraints on iOS/Safari**: confirm timer/alerts behavior across devices and provide fallbacks (sound/vibration/in-app).
- **Data export format + versioning**: define schema versioning early to avoid breaking imports as the model evolves.

## Sources

### Primary (HIGH confidence)
- Vite PWA plugin docs — PWA/service worker setup: `https://vite-plugin-pwa.netlify.app/guide/`
- Dexie docs — IndexedDB wrapper patterns: `https://dexie.org/docs`
- TanStack Router docs — routing patterns: `https://tanstack.com/router/latest/docs/overview`
- Zustand docs — state patterns: `https://zustand.site/en/docs`

### Secondary (MEDIUM confidence)
- Feature sets from real products (triangulation): Strong/Hevy/Fitbod/Boostcamp listings and docs: `https://strongermobileapp.com/features`, `https://www.hevyapp.com/`, `https://fitbod.zendesk.com/`, `https://www.boostcamp.app/`
- RIR accuracy + progression pitfalls: Stronger By Science: `https://www.strongerbyscience.com/reps-in-reserve/`, `https://www.strongerbyscience.com/weekly-load-progression/`
- Plausible (static-friendly analytics option): `https://plausible.io/`

### Tertiary (LOW confidence)
- Video hosting comparison (starting point only): `https://www.pkgpulse.com/blog/mux-vs-cloudflare-stream-vs-bunny-stream-video-cdn-2026`
- Some UX/product blog sources referenced in PITFALLS.md (use as prompts, validate with users): `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/`, `https://www.forgelogbooks.com/blog/every-way-track-workouts-ranked`

---
*Research completed: 2026-04-25*
*Ready for roadmap: yes*

