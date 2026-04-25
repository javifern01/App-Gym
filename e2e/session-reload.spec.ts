import { test, expect } from '@playwright/test'

test('session persists after reload (SESS-03)', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__pw_inited') !== '1') {
      localStorage.clear()
      sessionStorage.setItem('__pw_inited', '1')
    }
  })

  await page.goto('/')

  await page.getByTestId('equipment-note').fill('gym completo')
  await page.getByTestId('wizard-submit').click()

  await page.getByTestId('start-session').click()
  await expect(page.getByTestId('session-status')).toContainText('0/3')

  await page.getByTestId('complete-set').click()
  await expect(page.getByTestId('session-status')).toContainText('1/3')

  await page.reload()

  await expect(page.getByTestId('session-status')).toContainText('1/3')
  await expect(page.getByTestId('set-row-0')).toContainText('Hecho')

  const persisted = await page.evaluate(() => localStorage.getItem('buscador_pt_snapshot_v1'))
  expect(persisted).toBeTruthy()
  const parsed = JSON.parse(persisted as string) as { session?: { sets?: Array<{ completed?: unknown }> } }
  expect(parsed.session?.sets?.[0]?.completed).toBeTruthy()
})
