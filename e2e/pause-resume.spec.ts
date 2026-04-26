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
