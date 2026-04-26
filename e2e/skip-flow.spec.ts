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
