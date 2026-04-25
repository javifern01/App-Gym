---
phase: 01-foundation-deploy
plan: "02"
type: execute
wave: 2
depends_on:
  - "01"
  - "04"
files_modified:
  - src/App.tsx
  - src/persist/snapshot.ts
  - src/components/WizardScreen.tsx
  - src/components/EmptyStateScreen.tsx
  - src/components/SessionScreen.tsx
  - e2e/session-reload.spec.ts
autonomous: true
requirements:
  - SESS-03
user_setup: []
must_haves:
  truths:
    - "First visit: user completes minimal wizard (D-12) before starting; preferences stored in snapshot"
    - "No in-progress session: empty state shows clear CTA to start (D-14)"
    - "Single-screen app: no routes; conditional views only (D-13)"
    - "In-progress session: reload auto-resumes same progress without prompt (D-15)"
    - "Completing a set updates completed vs planned; auto-save after each relevant action (D-07)"
  artifacts:
    - path: src/App.tsx
      provides: "Shell: load snapshot, wizard | empty | session"
      contains: "STORAGE_KEY|loadSnapshot"
    - path: src/components/SessionScreen.tsx
      provides: "Shows session progress; actions mutate snapshot"
      contains: "complete|set"
    - path: e2e/session-reload.spec.ts
      provides: "Reload preserves session"
      contains: "reload"
  key_links:
    - from: src/App.tsx
      to: src/persist/snapshot.ts
      via: "load on mount; save after mutations"
      pattern: "saveSnapshot|loadSnapshot"
    - from: SessionScreen
      to: localStorage
      via: "saveSnapshot after complete set"
      pattern: "saveSnapshot"
---

<objective>
Implement the **minimal Phase 1 UI**: single-screen conditional flow (D-13) — **wizard** (D-12) → **empty state** with CTA (D-14) → **session** view with stub exercises/sets — wired to **localStorage snapshot** with **auto-save on every relevant action** (D-07) and **auto-resume after reload** (D-15). Extend E2E to prove **SESS-03** across `page.reload()`.

Purpose: Satisfy user-visible success criteria for session persistence and UX decisions D-12–D-15.

Output: Manual `npm run dev` shows full flow; Playwright reload test green.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation-deploy/01-CONTEXT.md
@.planning/phases/01-foundation-deploy/01-RESEARCH.md

**Wizard fields (Claude discretion, D-12):** Two steps max in one screen or sequential panels inside same view: (1) `goalFocus` radio: strength / hypertrophy / fat_loss, (2) `equipmentNote` short text (e.g. “gym completo”). On submit → write `preferences` to snapshot and set `session.status` to `idle` with **empty sets** OR transition to empty state.

**Session stub (D-08 skeleton):** Hardcode `session.sets` length 3 for a single fake exercise “Ejemplo — Press banca” with `planned.reps` 8 each; `currentExerciseIndex` 0. **Start session** button from empty state initializes `session.id` (e.g. `crypto.randomUUID()`), `status: 'in_progress'`, `startedAt: ISO string`, and planned sets. **Complete set** button marks `sets[n].completed = { reps: planned.reps, at: new Date().toISOString() }`, advances to next incomplete set or sets status `completed` when all done.

**Auto-resume (D-15):** On app load, if `loadSnapshot()` valid and `session.status === 'in_progress'`, render `SessionScreen` immediately **without** wizard or empty state.

**QuotaExceededError:** Catch on save; `console.error` and show one-line inline error in UI (01-RESEARCH pitfall).

**Do not** add router, PWA, or Dexie.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Components + App shell wiring to snapshot</name>
  <read_first>
    - src/persist/schema.ts, src/persist/snapshot.ts, src/persist/storageKey.ts
    - src/App.tsx from plan 01; src/persist from plan 04
    - 01-CONTEXT.md D-12–D-15, D-07
  </read_first>
  <files>src/App.tsx, src/components/WizardScreen.tsx, src/components/EmptyStateScreen.tsx, src/components/SessionScreen.tsx, src/persist/snapshot.ts</files>
  <action>
    Implement `WizardScreen`, `EmptyStateScreen`, `SessionScreen` as functional components. `App.tsx` logic: `const loaded = loadSnapshot()`; if null or invalid → show wizard for first-time (simple flag: `preferences` missing OR `session.status === 'idle'` with no `id` — use explicit `onboardingComplete: boolean` in schema if cleaner, but **bump schemaVersion to 2** if you add fields; **prefer** using existing `preferences` presence as wizard-complete flag to stay on schemaVersion 1). If wizard needed, show `WizardScreen`. Else if `session.status === 'in_progress'`, show `SessionScreen`. Else if no active session to resume and `session.status !== 'in_progress'`, show `EmptyStateScreen` with primary CTA “Iniciar sesión”. Each transition calls `saveSnapshot`. Export helper `createInitialSnapshot()` if useful. Ensure **every** mutation (wizard submit, start session, complete set) calls `saveSnapshot` synchronously after state update (D-07).
  </action>
  <acceptance_criteria>
    - `grep -q "WizardScreen\\|EmptyStateScreen\\|SessionScreen" src/App.tsx`
    - `grep -q "saveSnapshot" src/App.tsx src/components/SessionScreen.tsx`
    - `grep -q "in_progress" src/components/SessionScreen.tsx src/App.tsx`
    - No `react-router` import in `src/`.
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx vitest run && npm run build</automated>
  </verify>
  <done>Single-screen flow works in dev; auto-save on actions; auto-resume branch exists in App.tsx.</done>
</task>

<task type="auto">
  <name>Task 2: Playwright E2E — complete set + reload preserves SESS-03</name>
  <read_first>
    - e2e/smoke.spec.ts
    - src/components test IDs: add `data-testid` attributes as needed for stable selectors
  </read_first>
  <files>e2e/session-reload.spec.ts, src/components/WizardScreen.tsx, src/components/EmptyStateScreen.tsx, src/components/SessionScreen.tsx</files>
  <action>
    Add `data-testid` hooks: e.g. `wizard-submit`, `start-session`, `complete-set`, `session-status`, `set-row-0`. Implement `e2e/session-reload.spec.ts`: (1) Use `page.goto` to base URL. (2) If wizard visible, fill goal + equipment note, submit. (3) From empty state, click start session. (4) Complete first set via button. (5) `page.reload()`. (6) Assert first set shows completed state (e.g. text “Hecho” or completed reps visible) OR assert `session-status` still `in_progress` and completed count is 1 via DOM. (7) Optional: use `page.evaluate` to read `localStorage.getItem('buscador_pt_snapshot_v1')` and parse JSON to assert `sets[0].completed` exists. Must pass in CI and locally.
  </action>
  <acceptance_criteria>
    - `test -f e2e/session-reload.spec.ts`
    - `grep -q "reload" e2e/session-reload.spec.ts`
    - `grep -q "buscador_pt_snapshot_v1" e2e/session-reload.spec.ts` OR test relies purely on DOM that implies persistence
    - `npx playwright test e2e/session-reload.spec.ts` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd "/Users/javierfernandezmoran/Documents/App Gym" && npx playwright test e2e/session-reload.spec.ts</automated>
  </verify>
  <done>E2E proves reload continues same session with completed set retained (SESS-03).</done>
</task>

</tasks>

<verification>
- `npx vitest run && npx playwright test` green.
- Manual: complete wizard → start session → complete one set → browser refresh → still in session with progress (spot-check).
</verification>

<success_criteria>
SESS-03 observable: planned vs completed sets persist across reload; D-12–D-15 behaviors implemented without router.
</success_criteria>

<output>
After completion, create plan SUMMARY for plan 02 per execute-plan convention.
</output>
