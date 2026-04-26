import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'buscador_pt_snapshot_v1'

test('mid-session reload restores V3 state at the same set (SESS-01, SESS-02)', async ({ page }) => {
  // addInitScript runs on EVERY navigation including page.reload().
  // Use sessionStorage as a one-shot guard so localStorage is only cleared on the
  // initial load, not when we explicitly reload to test persistence.
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('__pw_cleared') !== '1') {
        localStorage.clear()
        sessionStorage.setItem('__pw_cleared', '1')
      }
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

  // Wait for rest-strip to appear — confirms useEffect has persisted the LOG_SET state
  // (saveSnapshot runs inside the React effect that fires after each state update).
  await expect(page.getByTestId('rest-strip')).toBeVisible({ timeout: 3000 })

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
  // After reload: session.rest != null → RestStrip renders (either counting down or "Listo").
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
