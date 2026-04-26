import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Action, SessionState } from './session/types'
import {
  sessionReducer,
  actions,
  getSeedExercises,
  selectIsRestExpired,
  selectRestRemainingMs,
} from './session'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './persist/snapshot'
import type { PreferencesV3 } from './persist/schema'
import { getRestMultiplier } from './utils/restMultiplier'
import { useRestTimer } from './hooks/useRestTimer'
import { useAudioCue } from './hooks/useAudioCue'
import { useVibration } from './hooks/useVibration'
import { useWakeLock } from './hooks/useWakeLock'
import { useUndoableToast } from './hooks/useUndoableToast'
import { EmptyStateScreen } from './components/EmptyStateScreen'
import { SessionScreen } from './components/SessionScreen'
import { WizardScreen } from './components/WizardScreen'

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const SEED_EXERCISE_IDS = ['ex-squat', 'ex-bench', 'ex-row']

export default function App() {
  const initialState: SessionState = useMemo(() => {
    const loaded = loadSnapshot()
    return loaded.ok ? loaded.snapshot : createInitialSnapshot()
  }, [])

  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastActionRef = useRef<Action['type'] | null>(null)
  const restMul = useMemo(() => getRestMultiplier(), [])

  const audioCue = useAudioCue()
  const vibration = useVibration()
  const toast = useUndoableToast()

  // D-23 + RESEARCH §Pitfall 8: Wake Lock active iff status === 'in_progress'.
  useWakeLock(state.session.status === 'in_progress')

  /**
   * dispatchTimed — RESEARCH §Pitfall 4.
   * The reducer is pure: it never calls Date.now / new Date / crypto.randomUUID.
   * This wrapper injects time + id payload and records the last action type so
   * the persistence effect can skip TICK (we don't dispatch TICK here, but the
   * guard still serves as documentation + future-proofing).
   */
  const dispatchTimed = (build: (now: { ms: number; iso: string; id: string }) => Action) => {
    const ms = Date.now()
    const iso = new Date(ms).toISOString()
    const id = generateId()
    const action = build({ ms, iso, id })
    lastActionRef.current = action.type
    dispatch(action)
  }

  /**
   * Persistence — RESEARCH §Pitfall 6.
   * Save only when state changes AND last action was not TICK (we don't dispatch
   * TICK in this app — useRestTimer derives the countdown from Date.now() — but
   * the guard is explicit so future contributors can't silently break it).
   */
  useEffect(() => {
    if (lastActionRef.current === 'TICK') return
    const result = saveSnapshot(state)
    if (!result.ok) {
      console.error('Failed to save snapshot:', result.reason)
      setSaveError('No se pudo guardar (storage lleno).')
    } else {
      setSaveError(null)
    }
  }, [state])

  /**
   * Live countdown driver. useRestTimer does NOT dispatch TICK; it returns
   * remainingMs derived from Date.now(). We re-render with its value.
   */
  const restEndAt = state.session.rest?.endAt ?? null
  const restActive = state.session.status === 'in_progress' && restEndAt != null
  useRestTimer({
    endAt: restEndAt,
    isActive: restActive,
    onComplete: () => {
      // Fired exactly once per rest by useRestTimer's internal idempotence guard.
      if (state.preferences?.restAlertSound ?? true) {
        audioCue.beep(880, 200)
      }
      if (state.preferences?.restAlertVibration ?? true) {
        vibration.vibrate(200)
      }
    },
  })

  // Re-render bumper for visibilitychange/pageshow. useRestTimer also self-syncs,
  // but bumping nowTick ensures other selectors (selectNextAction) re-evaluate.
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNowTick((t) => t + 1)
    }
    const onPageShow = () => setNowTick((t) => t + 1)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  // Drive nowMs re-renders during active rest at ~5 Hz so SessionScreen's
  // selectNextAction sees the up-to-date countdown without dispatching TICK.
  useEffect(() => {
    if (!restActive) return
    const id = window.setInterval(() => setNowTick((t) => t + 1), 200)
    return () => window.clearInterval(id)
  }, [restActive])

  // Drive nowMs during handoff (3s overlay) and auto-advance when timer expires.
  const handoffVisibleUntil = state.session.handoff?.visibleUntil ?? null
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  useEffect(() => {
    if (handoffVisibleUntil == null) return
    // Poll interval to keep countdown live.
    const pollId = window.setInterval(() => setNowTick((t) => t + 1), 200)
    // Auto-advance when handoff timer expires (HandoffOverlay shows "0").
    const remaining = Math.max(0, handoffVisibleUntil - Date.now())
    const autoId = window.setTimeout(() => {
      const nowMs = Date.now()
      lastActionRef.current = 'ADVANCE_TO_NEXT_EXERCISE'
      dispatchRef.current(actions.advanceToNextExercise(nowMs))
    }, remaining)
    return () => {
      window.clearInterval(pollId)
      window.clearTimeout(autoId)
    }
  }, [handoffVisibleUntil])

  void nowTick
  const nowMs = Date.now()

  // Sync isRestExpired into the FSM if the user backgrounded the tab and missed
  // the rAF callback. REST_DONE is UI-driven ("✓ Hecho"), not auto-advanced here —
  // the guard is informational only.
  useEffect(() => {
    if (!restActive) return
    if (selectIsRestExpired(state, nowMs) && selectRestRemainingMs(state, nowMs) <= 0) {
      // onComplete already fired side-effects; nothing to dispatch.
    }
  }, [restActive, state, nowMs])

  const showWizard = state.preferences == null
  const showSession =
    state.session.status === 'in_progress' ||
    state.session.status === 'completed' ||
    state.session.status === 'paused'

  const handleStartSession = () => {
    dispatchTimed(({ ms, iso, id }) => actions.startSession(id, iso, ms, SEED_EXERCISE_IDS))
  }

  const handleLogSet = (p: { reps: number; weight: number; rir: number; plannedRestSeconds: number }) => {
    /**
     * Test fast-rest knob (RESEARCH §Open Q 3 + CONTEXT.md "Test fast-rest knob"):
     * In production restMul === 1 → no-op. In Playwright, ?restMul=0.05 shrinks
     * the live countdown so a 90s rest finishes in ~4.5s. The reducer stores the
     * resulting plannedRestSeconds in rest_planned_s; tests assert math, not
     * preservation of the un-multiplied prescribed value (documented in 02-VALIDATION.md).
     */
    const plannedRestSeconds = Math.max(1, Math.round(p.plannedRestSeconds * restMul))
    dispatchTimed(({ ms, iso }) =>
      actions.logSet({
        nowIso: iso,
        nowMs: ms,
        reps: p.reps,
        weight: p.weight,
        rir: p.rir,
        plannedRestSeconds,
      })
    )
  }

  const handleSkipExercise = () => {
    const exerciseIndex = state.session.currentExerciseIndex
    dispatchTimed(({ ms }) => actions.skipExercise(exerciseIndex, ms))
    // D-13 + D-17: 5s undo toast.
    toast.show('Ejercicio saltado', {
      durationMs: 5000,
      actionLabel: 'Deshacer',
      onAction: () => {
        dispatchTimed(({ ms }) => actions.undoSkip(ms))
        toast.dismiss()
      },
    })
  }

  const handleSkipRest = () =>
    dispatchTimed(({ ms, iso }) => actions.skipRest(ms, iso))

  const handleExtendRest = (extraSeconds: number) => {
    lastActionRef.current = 'EXTEND_REST'
    dispatch(actions.extendRest(extraSeconds))
  }

  const handleAdvanceToNext = () => {
    void audioCue.prime() // re-prime (idempotent) — handoff "Empezar ya" is a user gesture.
    dispatchTimed(({ ms }) => actions.advanceToNextExercise(ms))
  }

  const handlePause = () => {
    lastActionRef.current = 'PAUSE'
    dispatch(actions.pause())
  }

  const handleResume = () => {
    void audioCue.prime() // re-prime (idempotent) — Reanudar is a user gesture.
    lastActionRef.current = 'RESUME'
    dispatch(actions.resume())
  }

  const handleDiscard = () => {
    lastActionRef.current = 'DISCARD'
    dispatch(actions.discard())
  }

  const handleSelectExercise = (_index: number) => {
    // Phase 2 v1: chip taps re-focus the same exercise visually; reducer-level
    // current-index reassignment is deferred (D-09 "Editar set ya completado"
    // is partial — we expose the affordance via UI; no action wired in v1).
  }

  const handleStartNewSession = () => {
    void audioCue.prime()
    dispatchTimed(({ ms, iso, id }) => actions.startSession(id, iso, ms, SEED_EXERCISE_IDS))
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="topbar">
          <div className="brand">
            <h1 className="brand-title">Buscador Personal Trainer</h1>
            <p className="brand-subtitle">Local-first · Sesión guiada · Persistente</p>
          </div>
          {showWizard ? null : (
            <div className="pill" aria-label="Estado de la sesión">
              <strong>{state.session.status === 'in_progress' ? 'Sesión' : 'Listo'}</strong>
              <span>
                {state.session.status === 'in_progress'
                  ? 'en progreso'
                  : state.session.status === 'completed'
                    ? 'completada'
                    : state.session.status === 'paused'
                      ? 'en pausa'
                      : 'sin sesión'}
              </span>
            </div>
          )}
        </header>

        {saveError ? <div className="alert">{saveError}</div> : null}

        <div className="card">
          <div className="card-inner">
            {showWizard ? (
              <WizardScreen
                initialPreferences={state.preferences as PreferencesV3 | undefined}
                onSubmit={(preferences) => {
                  lastActionRef.current = 'SET_PREFERENCES'
                  dispatch(actions.setPreferences(preferences))
                  void getSeedExercises
                }}
              />
            ) : showSession ? (
              <SessionScreen
                state={state}
                nowMs={nowMs}
                toastEntry={toast.current}
                onLogSet={handleLogSet}
                onPause={handlePause}
                onResume={handleResume}
                onDiscard={handleDiscard}
                onSkipExercise={handleSkipExercise}
                onUndoSkip={() => dispatchTimed(({ ms }) => actions.undoSkip(ms))}
                onSelectExercise={handleSelectExercise}
                onExtendRest={handleExtendRest}
                onSkipRest={handleSkipRest}
                onAdvanceToNextExercise={handleAdvanceToNext}
                onDismissToast={toast.dismiss}
                onStartNewSession={handleStartNewSession}
              />
            ) : (
              <EmptyStateScreen onStartSession={handleStartSession} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
