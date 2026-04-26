import { useMemo, useState } from 'react'
import { EmptyStateScreen } from './components/EmptyStateScreen'
import { SessionScreen } from './components/SessionScreen'
import { WizardScreen } from './components/WizardScreen'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './persist/snapshot'
import type { PreferencesV3, SnapshotV3 } from './persist/schema'

function generateId(): string {
  // crypto.randomUUID is supported in modern browsers; fallback keeps dev/test stable.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function App() {
  const initial = useMemo(() => {
    const loaded = loadSnapshot()
    if (loaded.ok) return loaded.snapshot
    return createInitialSnapshot()
  }, [])

  const [snapshot, setSnapshot] = useState<SnapshotV3>(initial)
  const [saveError, setSaveError] = useState<string | null>(null)

  const persist = (next: SnapshotV3) => {
    const result = saveSnapshot(next)
    if (!result.ok) {
      console.error('Failed to save snapshot:', result.reason)
      setSaveError('No se pudo guardar (storage lleno).')
    } else {
      setSaveError(null)
    }
  }

  const updateSnapshot = (updater: (prev: SnapshotV3) => SnapshotV3) => {
    setSnapshot((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }

  const showWizard = snapshot.preferences == null
  const showSession = snapshot.session.status === 'in_progress'

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Buscador Personal Trainer</h1>
      {saveError ? (
        <p style={{ marginTop: 8, color: '#ffb4b4' }}>{saveError}</p>
      ) : null}

      {showWizard ? (
        <WizardScreen
          initialPreferences={snapshot.preferences as PreferencesV3 | undefined}
          onSubmit={(preferences) => {
            updateSnapshot((prev) => ({
              ...prev,
              preferences,
            }))
          }}
        />
      ) : showSession ? (
        // SessionScreen is a Phase-1 placeholder; replaced entirely in plan 02-07.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <SessionScreen snapshot={snapshot as any} onCompleteNextSet={() => undefined} />
      ) : (
        <EmptyStateScreen
          onStartSession={() => {
            updateSnapshot((prev) => ({
              ...prev,
              session: {
                ...prev.session,
                status: 'in_progress',
                id: generateId(),
                startedAt: new Date().toISOString(),
                startedAtMs: Date.now(),
                currentExerciseIndex: 0,
              },
            }))
          }}
        />
      )}
    </main>
  )
}
