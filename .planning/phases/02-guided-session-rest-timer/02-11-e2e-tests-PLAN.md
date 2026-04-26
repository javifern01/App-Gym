---
phase: 2
plan: 11
type: execute
wave: 5
depends_on: ["02-09", "02-10"]
files_modified:
  - e2e/guided-session.spec.ts
  - e2e/skip-flow.spec.ts
  - e2e/pause-resume.spec.ts
  - e2e/migration.spec.ts
  - e2e/session-reload.spec.ts
autonomous: true
requirements: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]
must_haves:
  truths:
    - "Playwright runs `?restMul=0.05` so a 90s rest finishes in ~4.5s — total happy-path runtime < 60s"
    - "guided-session.spec.ts asserts SESS-01 (no blank screen between focus card → rest → next focus card → handoff → summary)"
    - "guided-session.spec.ts asserts SESS-02 (each LOG_SET writes reps + weight + RIR + timestamp into localStorage V3 snapshot)"
    - "guided-session.spec.ts asserts REST-01 (RestStrip shows 'Descansando · ' during, 'Listo · pulsa para continuar' after expiry)"
    - "guided-session.spec.ts asserts REST-02 (Summary 'Δ descanso' chip is rendered with a numeric value)"
    - "skip-flow.spec.ts asserts SESS-04 + D-13/D-17 (toast 'Ejercicio saltado' + 'Deshacer' restores the exercise within 5s)"
    - "pause-resume.spec.ts asserts SESS-01 resume continuity (PauseDialog → Reanudar → focus card identical to pre-pause state)"
    - "migration.spec.ts asserts D-25 (V2 snapshot seeded into localStorage migrates to V3 idle, preferences preserved)"
    - "session-reload.spec.ts UPGRADED to V3 — uses skip-exercise/log-set selectors instead of legacy complete-set"
  artifacts:
    - path: "e2e/guided-session.spec.ts"
      provides: "Happy-path E2E: SESS-01, SESS-02, REST-01, REST-02"
      contains: "restMul=0.05"
    - path: "e2e/skip-flow.spec.ts"
      provides: "Skip + undo E2E: SESS-04"
      contains: "Ejercicio saltado"
    - path: "e2e/pause-resume.spec.ts"
      provides: "Pause/resume continuity E2E: SESS-01"
      contains: "PauseDialog"
    - path: "e2e/migration.spec.ts"
      provides: "V2 → V3 migration E2E: SESS-02 data fidelity"
      contains: "schemaVersion: 2"
    - path: "e2e/session-reload.spec.ts"
      provides: "V3 mid-session reload E2E"
      contains: "schemaVersion"
  key_links:
    - from: "Playwright addInitScript"
      to: "src/utils/restMultiplier.ts (getRestMultiplier reads URLSearchParams)"
      via: "page.goto('/?restMul=0.05')"
      pattern: "restMul=0\\.05"
    - from: "migration.spec.ts seeded localStorage"
      to: "src/persist/snapshot.ts loadSnapshot → migrateV2toV3"
      via: "localStorage seeded BEFORE goto, snapshot key = 'buscador_pt_snapshot_v1'"
      pattern: "buscador_pt_snapshot_v1"
---

<objective>
Lock in Phase 2's guarantees with five end-to-end tests that exercise the running app from the user's perspective. The fast-rest knob (`?restMul=0.05`) is what makes these tests fast enough to run on every commit (90s rest → 4.5s).

Purpose: Phase 2's value is operational ("user can complete a guided session"). Unit tests prove correctness of pieces; E2E tests prove the whole. Without this plan, the Nyquist coverage map in 02-VALIDATION.md remains theoretical.

Output: 4 new E2E specs + 1 updated spec. Zero source-code changes (test-only plan).
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-VALIDATION.md
@playwright.config.ts
@e2e/session-reload.spec.ts
@e2e/smoke.spec.ts
@src/persist/storageKey.ts

<interfaces>
**Storage key (from src/persist/storageKey.ts):** `buscador_pt_snapshot_v1` (the literal — kept stable across schema versions; the `_v1` is historical).

**Test selectors guaranteed by Phase 2 components:**
- `data-testid="start-session"` — EmptyStateScreen primary CTA
- `data-testid="wizard-submit"` — WizardScreen submit
- `data-testid="equipment-note"` — WizardScreen equipment input
- `data-testid="pref-rest-sound"` / `pref-rest-vibrate"` / `pref-effort-rir"` / `pref-effort-rpe"` — WizardScreen toggles
- `data-testid="session-status"` — SessionScreen sticky status pill
- `data-testid="skip-exercise"` — SessionScreen skip CTA
- `data-testid="focus-card"` — FocusCard root (plan 02-07)
- `data-testid="focus-log-set"` — FocusCard "✓ Hecho" CTA (plan 02-07)
- `data-testid="focus-pause"` — FocusCard "Pausar" CTA (plan 02-07)
- `data-testid="rest-strip"` / `rest-strip-skip"` / `rest-strip-extend"` — RestStrip (plan 02-07)
- `data-testid="handoff-overlay"` / `handoff-continue"` — HandoffOverlay (plan 02-08)
- `data-testid="toast"` / `toast-action"` / `toast-dismiss"` — Toast (plan 02-08)
- `data-testid="pause-dialog"` / `pause-resume"` / `pause-discard"` — PauseDialog (plan 02-08)
- `data-testid="summary"` / `summary-rest-deviation"` / `summary-start-new"` — SummaryScreen (plan 02-08)

If any selector above is missing in a downstream component, the executor MUST add it (under-spec is a bug, not a degree of freedom). Document additions in the SUMMARY.

**Seed routine (D-15, plan 02-04):** 3 exercises × 4 sets × 8 reps. A full happy-path = 12 LOG_SET + 11 rests + 2 handoffs + 1 summary.

**`getRestMultiplier()` (plan 02-03):** reads `URLSearchParams.get('restMul')` once at first call, cached. Default 1; ?restMul=0.05 multiplies plannedRestSeconds by 0.05 in App.handleLogSet (plan 02-10).
</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. Use Playwright's built-in `@playwright/test` (already in package.json from Phase 1).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create e2e/guided-session.spec.ts — happy path (SESS-01, SESS-02, REST-01, REST-02)</name>
  <read_first>
    - e2e/session-reload.spec.ts (existing Phase 1 pattern: addInitScript, getByTestId)
    - e2e/smoke.spec.ts (baseline)
    - playwright.config.ts (baseURL: localhost:4173)
    - .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md §"Per-Task Verification Map"
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-15 (3 ex × 4 sets × 8 reps)
    - src/utils/restMultiplier.ts (URL param contract)
    - src/persist/storageKey.ts (STORAGE_KEY = 'buscador_pt_snapshot_v1')
  </read_first>
  <action>
Create `e2e/guided-session.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test.describe('Guided session happy path (SESS-01, SESS-02, REST-01, REST-02)', () => {
  test.beforeEach(async ({ page }) => {
    // Always start from a clean slate so seed routine + wizard appear.
    await page.addInitScript(() => {
      try {
        localStorage.clear()
      } catch {
        // ignore
      }
    })
  })

  test('user logs all 12 sets, rests fast, sees summary with rest deviation', async ({ page }) => {
    // restMul=0.05 → 90s plannedRest → 4.5s live rest. Full path stays under 60s.
    await page.goto('/?restMul=0.05')

    // Wizard.
    await page.getByTestId('equipment-note').fill('gym completo')
    await page.getByTestId('wizard-submit').click()

    // Empty state shows seed routine preview.
    await expect(page.getByText('Sentadilla')).toBeVisible()
    await expect(page.getByText('Press banca')).toBeVisible()
    await expect(page.getByText('Remo con barra')).toBeVisible()

    // Tap Iniciar (gesture-primes audio).
    await page.getByTestId('start-session').click()

    // SESS-01: focus card always visible — no blank screen.
    await expect(page.getByTestId('focus-card')).toBeVisible()

    const TOTAL_SETS = 3 * 4

    for (let i = 0; i < TOTAL_SETS; i++) {
      // SESS-01 invariant: focus card OR rest strip OR handoff overlay always present.
      await expect(page.getByTestId('focus-card')).toBeVisible({ timeout: 6000 })

      // SESS-02: log a set with default prefill (steppers already seeded).
      await page.getByTestId('focus-log-set').click()

      // After last set of session, summary appears — short-circuit.
      if (i === TOTAL_SETS - 1) break

      // REST-01: rest strip appears with "Descansando · " prefix during countdown.
      await expect(page.getByTestId('rest-strip')).toBeVisible({ timeout: 3000 })
      await expect(page.getByTestId('rest-strip')).toContainText('Descansando · ')

      // Wait for rest to expire (≤ 6s with restMul=0.05) and tap "✓ Hecho" to continue.
      await expect(page.getByTestId('rest-strip')).toContainText('Listo', { timeout: 8000 })
      await page.getByTestId('rest-strip-skip').click()

      // Handoff overlay appears between exercises (every 4th set in this seed).
      const isExerciseBoundary = (i + 1) % 4 === 0
      if (isExerciseBoundary && i < TOTAL_SETS - 1) {
        await expect(page.getByTestId('handoff-overlay')).toBeVisible({ timeout: 3000 })
        await page.getByTestId('handoff-continue').click()
      }
    }

    // Summary visible (SESS-01 final state — never blank).
    await expect(page.getByTestId('summary')).toBeVisible({ timeout: 5000 })

    // REST-02: deviation chip exists with numeric content.
    const deviation = page.getByTestId('summary-rest-deviation')
    await expect(deviation).toBeVisible()
    await expect(deviation).toContainText('Δ descanso')

    // SESS-02 persistence: snapshot has 12 completed sets with weight + rir.
    const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    expect(persisted).toBeTruthy()
    const parsed = JSON.parse(persisted as string) as {
      schemaVersion: number
      session: {
        status: string
        exercises: Array<{
          sets: Array<{
            completed: { reps: number; weight: number; rir: number; at: string; rest_planned_s?: number; rest_actual_s?: number } | null
          }>
        }>
      }
    }
    expect(parsed.schemaVersion).toBe(3)
    expect(parsed.session.status).toBe('completed')
    const completedSets = parsed.session.exercises.flatMap((ex) =>
      ex.sets.filter((s) => s.completed != null)
    )
    expect(completedSets.length).toBe(TOTAL_SETS)
    for (const s of completedSets) {
      expect(typeof s.completed!.reps).toBe('number')
      expect(typeof s.completed!.weight).toBe('number')
      expect(typeof s.completed!.rir).toBe('number')
      expect(typeof s.completed!.at).toBe('string')
      expect(new Date(s.completed!.at).toString()).not.toBe('Invalid Date')
    }
  })
})
```
  </action>
  <verify>
    <automated>npx playwright test e2e/guided-session.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `e2e/guided-session.spec.ts`
    - `rg "restMul=0\\.05" e2e/guided-session.spec.ts` matches (test knob applied)
    - `rg "schemaVersion" e2e/guided-session.spec.ts` matches (V3 assertion)
    - `rg "data-testid=\"focus-card\"|getByTestId\\('focus-card'\\)" e2e/guided-session.spec.ts` matches
    - `rg "Descansando · " e2e/guided-session.spec.ts` matches (REST-01 copy)
    - `rg "Δ descanso" e2e/guided-session.spec.ts` matches (REST-02 chip)
    - `rg "session\\.status\\)\\.toBe\\('completed'\\)|status\\)\\.toBe\\('completed'\\)" e2e/guided-session.spec.ts` matches
    - `npx playwright test e2e/guided-session.spec.ts` exits 0
  </acceptance_criteria>
  <done>Happy path E2E covers SESS-01, SESS-02, REST-01, REST-02 in under 60s wall-clock.</done>
</task>

<task type="auto">
  <name>Task 2: Create e2e/skip-flow.spec.ts + e2e/pause-resume.spec.ts (SESS-04 + SESS-01 resume)</name>
  <read_first>
    - e2e/guided-session.spec.ts (just-created pattern reference)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-04, D-13, D-17, D-18
    - .planning/phases/02-guided-session-rest-timer/02-VALIDATION.md
  </read_first>
  <action>
**File 1: `e2e/skip-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test.describe('Skip exercise + undo (SESS-04, D-13, D-17)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear()
      } catch {
        // ignore
      }
    })
  })

  test('user skips an exercise; toast offers Undo for 5s; Undo restores it', async ({ page }) => {
    await page.goto('/?restMul=0.05')

    await page.getByTestId('equipment-note').fill('gym completo')
    await page.getByTestId('wizard-submit').click()
    await page.getByTestId('start-session').click()
    await expect(page.getByTestId('focus-card')).toBeVisible()

    // Tap Saltar ejercicio.
    await page.getByTestId('skip-exercise').click()

    // D-17: toast appears with "Ejercicio saltado" + Deshacer.
    const toast = page.getByTestId('toast')
    await expect(toast).toBeVisible({ timeout: 2000 })
    await expect(toast).toContainText('Ejercicio saltado')
    await expect(page.getByTestId('toast-action')).toContainText('Deshacer')

    // SESS-04: snapshot reflects skipped exercise.
    const afterSkip = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const skipParsed = JSON.parse(afterSkip as string) as {
      session: { exercises: Array<{ status: 'pending' | 'active' | 'done' | 'skipped' }> }
    }
    expect(skipParsed.session.exercises.some((ex) => ex.status === 'skipped')).toBe(true)

    // D-13: Undo within 5s restores the exercise.
    await page.getByTestId('toast-action').click()

    const afterUndo = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const undoParsed = JSON.parse(afterUndo as string) as {
      session: { exercises: Array<{ status: 'pending' | 'active' | 'done' | 'skipped' }> }
    }
    expect(undoParsed.session.exercises.some((ex) => ex.status === 'skipped')).toBe(false)

    // Focus card returns.
    await expect(page.getByTestId('focus-card')).toBeVisible({ timeout: 2000 })
  })

  test('skipped exercise persists if Undo is not pressed within 5s', async ({ page }) => {
    await page.goto('/?restMul=0.05')

    await page.getByTestId('equipment-note').fill('gym completo')
    await page.getByTestId('wizard-submit').click()
    await page.getByTestId('start-session').click()
    await expect(page.getByTestId('focus-card')).toBeVisible()

    await page.getByTestId('skip-exercise').click()
    await expect(page.getByTestId('toast')).toBeVisible()

    // Wait > 5s for the toast to auto-dismiss (D-13 window).
    await page.waitForTimeout(5500)
    await expect(page.getByTestId('toast')).toHaveCount(0)

    // SESS-04: snapshot still shows the skip.
    const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const parsed = JSON.parse(persisted as string) as {
      session: { exercises: Array<{ status: 'pending' | 'active' | 'done' | 'skipped' }> }
    }
    expect(parsed.session.exercises.some((ex) => ex.status === 'skipped')).toBe(true)
  })
})
```

**File 2: `e2e/pause-resume.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test.describe('Pause / resume / discard (SESS-01 resume continuity, D-04)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.clear()
      } catch {
        // ignore
      }
    })
  })

  test('user pauses, sees PauseDialog, resumes back to the same set', async ({ page }) => {
    await page.goto('/?restMul=0.05')

    await page.getByTestId('equipment-note').fill('gym completo')
    await page.getByTestId('wizard-submit').click()
    await page.getByTestId('start-session').click()
    await expect(page.getByTestId('focus-card')).toBeVisible()

    // Log one set so we have a non-trivial state to preserve.
    await page.getByTestId('focus-log-set').click()
    await expect(page.getByTestId('rest-strip')).toBeVisible()
    await page.getByTestId('rest-strip-skip').click()
    await expect(page.getByTestId('focus-card')).toBeVisible()

    // Pause from the focus card.
    await page.getByTestId('focus-pause').click()

    // PauseDialog renders (SESS-01: never blank, even paused).
    await expect(page.getByTestId('pause-dialog')).toBeVisible({ timeout: 2000 })

    // Snapshot reflects status: paused.
    const pausedSnap = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const pausedParsed = JSON.parse(pausedSnap as string) as { session: { status: string } }
    expect(pausedParsed.session.status).toBe('paused')

    // Reanudar.
    await page.getByTestId('pause-resume').click()

    // Focus card returns to the same exercise.
    await expect(page.getByTestId('focus-card')).toBeVisible({ timeout: 2000 })

    const resumedSnap = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const resumedParsed = JSON.parse(resumedSnap as string) as { session: { status: string } }
    expect(resumedParsed.session.status).toBe('in_progress')
  })

  test('user discards a paused session; returns to empty state', async ({ page }) => {
    await page.goto('/?restMul=0.05')

    await page.getByTestId('equipment-note').fill('gym completo')
    await page.getByTestId('wizard-submit').click()
    await page.getByTestId('start-session').click()
    await page.getByTestId('focus-pause').click()
    await expect(page.getByTestId('pause-dialog')).toBeVisible()

    await page.getByTestId('pause-discard').click()

    // EmptyStateScreen returns.
    await expect(page.getByTestId('start-session')).toBeVisible({ timeout: 2000 })

    const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    const parsed = JSON.parse(persisted as string) as { session: { status: string } }
    expect(parsed.session.status).toBe('idle')
  })
})
```
  </action>
  <verify>
    <automated>npx playwright test e2e/skip-flow.spec.ts e2e/pause-resume.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `e2e/skip-flow.spec.ts`
    - File exists at `e2e/pause-resume.spec.ts`
    - `rg "Ejercicio saltado" e2e/skip-flow.spec.ts` matches (D-17 copy)
    - `rg "Deshacer" e2e/skip-flow.spec.ts` matches (D-13 undo)
    - `rg "waitForTimeout\\(5500\\)" e2e/skip-flow.spec.ts` matches (5s window enforcement)
    - `rg "skipped" e2e/skip-flow.spec.ts` returns ≥ 2 matches (snapshot assertions)
    - `rg "data-testid=\"pause-dialog\"|getByTestId\\('pause-dialog'\\)" e2e/pause-resume.spec.ts` matches
    - `rg "'paused'" e2e/pause-resume.spec.ts` matches (status assertion)
    - `rg "'idle'" e2e/pause-resume.spec.ts` matches (discard → idle)
    - `npx playwright test e2e/skip-flow.spec.ts e2e/pause-resume.spec.ts` exits 0
  </acceptance_criteria>
  <done>Skip + undo and pause/resume/discard E2E specs cover SESS-04 and SESS-01 resume continuity. Both run in well under 30s combined.</done>
</task>

<task type="auto">
  <name>Task 3: Create e2e/migration.spec.ts + upgrade e2e/session-reload.spec.ts to V3 (SESS-02 data fidelity)</name>
  <read_first>
    - e2e/session-reload.spec.ts (current V2 test — uses legacy `complete-set` and `set-row-0` testids that no longer exist after plan 02-10)
    - src/persist/snapshot.ts (loadSnapshot cascade V3 → V2 → V1; migrateV2toV3 — D-25)
    - src/persist/storageKey.ts (STORAGE_KEY = 'buscador_pt_snapshot_v1')
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-25 (migration semantics)
  </read_first>
  <action>
**File 1: `e2e/migration.spec.ts` (NEW)**

```typescript
import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test.describe('Schema migration V2 → V3 (D-25, SESS-02 data fidelity)', () => {
  test('legacy V2 snapshot migrates to V3 idle, preferences preserved', async ({ page }) => {
    // Seed a V2 snapshot BEFORE the app boots.
    const v2Snapshot = {
      schemaVersion: 2,
      preferences: {
        goalFocus: 'hypertrophy',
        equipmentNote: 'gym completo',
      },
      session: {
        status: 'in_progress',
        id: 'legacy-session',
        startedAt: '2026-04-20T10:00:00.000Z',
        currentExerciseIndex: 0,
        exerciseName: 'Press banca',
        sets: [
          { setId: 'set-1', planned: { reps: 8 }, completed: { reps: 8, at: '2026-04-20T10:01:00.000Z' } },
          { setId: 'set-2', planned: { reps: 8 } },
          { setId: 'set-3', planned: { reps: 8 } },
        ],
      },
    }

    await page.addInitScript((args) => {
      try {
        localStorage.clear()
        localStorage.setItem(args.key, JSON.stringify(args.snapshot))
      } catch {
        // ignore
      }
    }, { key: STORAGE_KEY, snapshot: v2Snapshot })

    await page.goto('/')

    // App should boot to EmptyState (D-25: session reset to idle, preferences preserved → wizard skipped).
    await expect(page.getByTestId('start-session')).toBeVisible({ timeout: 5000 })

    // localStorage now holds a V3 snapshot.
    const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    expect(persisted).toBeTruthy()
    const parsed = JSON.parse(persisted as string) as {
      schemaVersion: number
      preferences: {
        goalFocus: string
        equipmentNote: string
        restAlertSound: boolean
        restAlertVibration: boolean
        effortMetric: 'rir' | 'rpe'
      }
      session: { status: string }
    }

    expect(parsed.schemaVersion).toBe(3)
    expect(parsed.session.status).toBe('idle')
    expect(parsed.preferences.goalFocus).toBe('hypertrophy')
    expect(parsed.preferences.equipmentNote).toBe('gym completo')
    // D-25 default values for new prefs.
    expect(parsed.preferences.restAlertSound).toBe(true)
    expect(parsed.preferences.restAlertVibration).toBe(true)
    expect(parsed.preferences.effortMetric).toBe('rir')
  })

  test('malformed JSON in localStorage falls back to fresh snapshot, app still boots', async ({ page }) => {
    await page.addInitScript((key) => {
      try {
        localStorage.clear()
        localStorage.setItem(key, '{not-json')
      } catch {
        // ignore
      }
    }, STORAGE_KEY)

    await page.goto('/')

    // App boots to wizard (no preferences in fallback snapshot).
    await expect(page.getByTestId('wizard-submit')).toBeVisible({ timeout: 5000 })
  })
})
```

**File 2: REPLACE `e2e/session-reload.spec.ts` with V3-aware version:**

```typescript
import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test('mid-session reload restores V3 state at the same set (SESS-01, SESS-02)', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
  })

  await page.goto('/?restMul=0.05')

  await page.getByTestId('equipment-note').fill('gym completo')
  await page.getByTestId('wizard-submit').click()

  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('focus-card')).toBeVisible()

  // Log first set, skip rest, log second set.
  await page.getByTestId('focus-log-set').click()
  await expect(page.getByTestId('rest-strip')).toBeVisible()
  await page.getByTestId('rest-strip-skip').click()
  await expect(page.getByTestId('focus-card')).toBeVisible()
  await page.getByTestId('focus-log-set').click()

  // Snapshot persisted on each LOG_SET.
  const beforeReload = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  const before = JSON.parse(beforeReload as string) as {
    schemaVersion: number
    session: {
      status: string
      currentExerciseIndex: number
      exercises: Array<{ sets: Array<{ completed: unknown }> }>
    }
  }
  expect(before.schemaVersion).toBe(3)
  const completedBefore = before.session.exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.completed != null)
  ).length
  expect(completedBefore).toBe(2)

  await page.reload()

  // SESS-01 resume: focus card OR rest strip visible immediately, never blank.
  const focus = page.getByTestId('focus-card')
  const rest = page.getByTestId('rest-strip')
  await expect(focus.or(rest)).toBeVisible({ timeout: 5000 })

  // Snapshot still has 2 completed sets.
  const afterReload = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  const after = JSON.parse(afterReload as string) as {
    session: { exercises: Array<{ sets: Array<{ completed: unknown }> }> }
  }
  const completedAfter = after.session.exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.completed != null)
  ).length
  expect(completedAfter).toBe(2)
})
```
  </action>
  <verify>
    <automated>npx playwright test e2e/migration.spec.ts e2e/session-reload.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `e2e/migration.spec.ts`
    - File `e2e/session-reload.spec.ts` is rewritten — `rg "complete-set" e2e/session-reload.spec.ts` returns 0 matches (legacy testid removed)
    - `rg "schemaVersion: 2" e2e/migration.spec.ts` matches (V2 seed)
    - `rg "schemaVersion\\)\\.toBe\\(3\\)" e2e/migration.spec.ts` matches (V3 assertion)
    - `rg "restAlertSound\\)\\.toBe\\(true\\)" e2e/migration.spec.ts` matches (D-25 default preserved)
    - `rg "effortMetric\\)\\.toBe\\('rir'\\)" e2e/migration.spec.ts` matches (D-25 default preserved)
    - `rg "'\\{not-json'" e2e/migration.spec.ts` matches (malformed JSON fallback test)
    - `rg "schemaVersion\\)\\.toBe\\(3\\)" e2e/session-reload.spec.ts` matches (V3 assertion)
    - `rg "data-testid=\"focus-card\"|getByTestId\\('focus-card'\\)" e2e/session-reload.spec.ts` matches
    - `npx playwright test e2e/migration.spec.ts e2e/session-reload.spec.ts` exits 0
  </acceptance_criteria>
  <done>V2 → V3 migration plus malformed-JSON fallback are covered E2E. Phase 1's session-reload spec is upgraded to V3 selectors and assertions; legacy `complete-set` testid is purged.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- Combined run: `npx playwright test` exits 0 (5 spec files: smoke, guided-session, skip-flow, pause-resume, migration, session-reload).
- Total E2E wall-clock with `?restMul=0.05` is under 90 seconds.
- 02-VALIDATION.md `Per-Task Verification Map` rows for plan 02-11 are now backed by green tests (status flips ⬜ → ✅).
- Phase 1 invariant: `npm run test -- --run && npm run test:e2e` exits 0.
</verification>

<success_criteria>
- Every Phase 2 requirement (SESS-01, SESS-02, SESS-04, REST-01, REST-02) is asserted by at least one E2E spec.
- D-22 honored: zero new npm deps. `git diff package.json` is empty.
- Phase 2 ship-readiness: full `npm run test:e2e` is green and gates the merge.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-11-SUMMARY.md` documenting:
- 5 E2E specs (status, run time)
- Confirmation that each requirement has at least one assertion
- D-22 confirmation: package.json untouched
- Update 02-VALIDATION.md `Per-Task Verification Map` status column for plan 02-11 rows
</output>
