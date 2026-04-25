import { useMemo, useState } from 'react'
import { EmptyStateScreen } from './components/EmptyStateScreen'
import { SessionScreen } from './components/SessionScreen'
import { WizardScreen } from './components/WizardScreen'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './persist/snapshot'
import type { SnapshotV2 } from './persist/schema'

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

  const [snapshot, setSnapshot] = useState<SnapshotV2>(initial)
  const [saveError, setSaveError] = useState<string | null>(null)

  const persist = (next: SnapshotV2) => {
    const result = saveSnapshot(next)
    if (!result.ok) {
      console.error('Failed to save snapshot:', result.reason)
      setSaveError('No se pudo guardar (storage lleno).')
    } else {
      setSaveError(null)
    }
  }

  const updateSnapshot = (updater: (prev: SnapshotV2) => SnapshotV2) => {
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
          initialPreferences={snapshot.preferences}
          onSubmit={(preferences) => {
            updateSnapshot((prev) => ({
              ...prev,
              preferences,
              session: { ...prev.session, status: prev.session.status ?? 'idle' },
            }))
          }}
        />
      ) : showSession ? (
        <SessionScreen
          snapshot={snapshot}
          onCompleteNextSet={() => {
            updateSnapshot((prev) => {
              const sets = prev.session.sets
              const nextIncompleteIdx = sets.findIndex((s) => s.completed == null)
              if (nextIncompleteIdx === -1) return prev

              const updatedSets = sets.map((s, idx) =>
                idx !== nextIncompleteIdx
                  ? s
                  : {
                      ...s,
                      completed: { reps: s.planned.reps, at: new Date().toISOString() },
                    }
              )

              const allDone = updatedSets.every((s) => s.completed != null)
              return {
                ...prev,
                session: {
                  ...prev.session,
                  sets: updatedSets,
                  status: allDone ? 'completed' : 'in_progress',
                },
              }
            })
          }}
        />
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
                currentExerciseIndex: 0,
                exerciseName: prev.session.exerciseName || 'Ejemplo — Press banca',
                sets: [
                  { setId: 'set-1', planned: { reps: 8 } },
                  { setId: 'set-2', planned: { reps: 8 } },
                  { setId: 'set-3', planned: { reps: 8 } },
                ],
              },
            }))
          }}
        />
      )}
    </main>
  )
}
