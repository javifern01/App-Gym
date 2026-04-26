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
