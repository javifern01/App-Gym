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
    // Allow up to 90s: 9 rests × ~5s each + interactions.
    test.setTimeout(90_000)

    // restMul=0.05: plannedRest * 0.05 → hypertrophy 90s → ~4.5s live rest.
    await page.goto('/?restMul=0.05')

    // Wizard — select hypertrophy to get the shortest rest (90s × 0.05 ≈ 5s).
    await page.getByRole('radio', { name: 'Hipertrofia' }).check()
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

    // Seed routine: 3 exercises × 4 sets.
    // FSM transitions after LOG_SET:
    //   - non-last set of exercise → rest state (RestStrip shows)
    //   - last set of exercise (set 4/4) → handoff state (no rest, HandoffOverlay shows)
    //   - last set of session → completed → summary
    const SETS_PER_EXERCISE = 4
    const EXERCISES = 3
    const TOTAL_SETS = SETS_PER_EXERCISE * EXERCISES

    // Track REST-01 verification: verify on the very first rest strip encountered.
    let rest01Verified = false

    for (let setNum = 1; setNum <= TOTAL_SETS; setNum++) {
      // SESS-01 invariant: focus card always present before logging.
      await expect(page.getByTestId('focus-card')).toBeVisible({ timeout: 8000 })

      // SESS-02: log a set with default prefill.
      await page.getByTestId('focus-log-set').click()

      if (setNum === TOTAL_SETS) {
        // Last set of session — summary should appear (FSM → completed).
        break
      }

      const isLastSetOfExercise = setNum % SETS_PER_EXERCISE === 0

      if (isLastSetOfExercise) {
        // After the last set of an exercise, FSM goes directly to handoff (no rest).
        // SESS-01: handoff overlay visible — never blank.
        await expect(page.getByTestId('handoff-overlay')).toBeVisible({ timeout: 4000 })
        await page.getByTestId('handoff-continue').click()
      } else {
        // REST-01: rest strip appears with "Descansando · " prefix.
        await expect(page.getByTestId('rest-strip')).toBeVisible({ timeout: 3000 })
        await expect(page.getByTestId('rest-strip')).toContainText('Descansando · ')

        if (!rest01Verified) {
          // REST-01 full verification: wait for rest to expire (≤ 8s with restMul=0.05),
          // confirm "Listo · pulsa para continuar" appears.
          await expect(page.getByTestId('rest-strip')).toContainText('Listo', { timeout: 10_000 })
          rest01Verified = true
        }

        // Click skip (says "Saltar" during rest, "✓ Hecho" after expiry — both clickable).
        await page.getByTestId('rest-strip-skip').click()
      }
    }

    // REST-01 confirmed: rest strip transition was observed.
    expect(rest01Verified).toBe(true)

    // Summary visible (SESS-01 final state — never blank).
    await expect(page.getByTestId('summary')).toBeVisible({ timeout: 5000 })

    // REST-02: deviation chip exists with "Δ descanso" label.
    const deviation = page.getByTestId('summary-rest-deviation')
    await expect(deviation).toBeVisible()
    await expect(deviation).toContainText('Δ descanso')

    // SESS-02 persistence: snapshot has 12 completed sets with weight + rir + timestamp.
    const persisted = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
    expect(persisted).toBeTruthy()
    const parsed = JSON.parse(persisted as string) as {
      schemaVersion: number
      session: {
        status: string
        exercises: Array<{
          sets: Array<{
            completed: { reps: number; weight: number; rir: number; at: string } | null
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
