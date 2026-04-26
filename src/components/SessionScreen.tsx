import { useState, useEffect } from 'react'
import type { SnapshotV3 } from '../persist/schema'
import {
  selectNextAction,
  selectActiveExercise,
  selectActiveSet,
  selectProgress,
  selectRestRemainingMs,
  selectCompletedSetCount,
  plannedRestForGoal,
} from '../session'
import type { ToastEntry } from '../hooks/useUndoableToast'
import { FocusCard } from './session/FocusCard'
import { ExerciseStrip } from './session/ExerciseStrip'
import { RestStrip } from './session/RestStrip'
import { RestPanel } from './session/RestPanel'
import { HandoffOverlay } from './session/HandoffOverlay'
import { Toast } from './session/Toast'
import { PauseDialog } from './session/PauseDialog'
import { SummaryScreen } from './session/SummaryScreen'

interface LogSetPayload {
  reps: number
  weight: number
  rir: number
  plannedRestSeconds: number
}

interface Props {
  state: SnapshotV3
  nowMs: number
  toastEntry: ToastEntry | null
  onLogSet: (p: LogSetPayload) => void
  onPause: () => void
  onResume: () => void
  onDiscard: () => void
  onSkipExercise: () => void
  onUndoSkip: () => void
  onSelectExercise: (index: number) => void
  onExtendRest: (extraSeconds: number) => void
  onSkipRest: () => void
  onAdvanceToNextExercise: () => void
  onDismissToast: () => void
  onStartNewSession: () => void
}

export function SessionScreen(props: Props) {
  const {
    state,
    nowMs,
    toastEntry,
    onLogSet,
    onPause,
    onResume,
    onDiscard,
    onSkipExercise,
    onUndoSkip: _onUndoSkip,
    onSelectExercise,
    onExtendRest,
    onSkipRest,
    onAdvanceToNextExercise,
    onDismissToast,
    onStartNewSession,
  } = props

  const next = selectNextAction(state, nowMs)
  const progress = selectProgress(state)
  const activeExercise = selectActiveExercise(state)
  const activeSet = selectActiveSet(state)

  // D-10: rest panel expansion is local UI state, NOT persisted.
  const [restExpanded, setRestExpanded] = useState(false)
  useEffect(() => {
    if (next.kind !== 'rest') setRestExpanded(false)
  }, [next.kind])

  // SESS-01 GUARANTEE: selectNextAction never returns null/undefined for active session states.
  // Each branch below renders a concrete UI — never a blank screen.

  if (state.session.status === 'completed') {
    return (
      <SummaryScreen
        snapshot={state}
        endedAtMs={nowMs}
        onStartNewSession={onStartNewSession}
      />
    )
  }

  if (state.session.status === 'paused') {
    const startedAtMs = state.session.startedAtMs ?? nowMs
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
    return (
      <PauseDialog
        elapsedSeconds={elapsedSeconds}
        setsCompleted={selectCompletedSetCount(state)}
        onResume={onResume}
        onDiscard={onDiscard}
      />
    )
  }

  // Common chrome (exercise strip + toast) for in_progress states.
  const exercises = state.session.exercises ?? []
  const goalFocus = state.preferences?.goalFocus ?? 'hypertrophy'
  const plannedRestSeconds = plannedRestForGoal(goalFocus)
  const remainingMs = selectRestRemainingMs(state, nowMs)

  // Pre-fill (D-06): copy reps/weight/RIR from the previous completed set in the SAME exercise.
  // For the first set: planned reps from seed; weight defaults to 0; RIR defaults to 2.
  const prefill = (() => {
    if (!activeExercise || !activeSet) return null
    const completed = activeExercise.sets.filter((s) => s.completed != null)
    const last = completed[completed.length - 1]?.completed
    if (last) {
      return { reps: last.reps, weight: last.weight, rir: last.rir }
    }
    return { reps: activeSet.planned.reps, weight: 0, rir: 2 }
  })()

  const setIndex = activeExercise?.currentSetIndex ?? 0

  return (
    <section aria-label="Sesión en curso" className="session-shell" data-testid="session-status">
      {exercises.length > 0 ? (
        <ExerciseStrip
          exercises={exercises}
          currentExerciseIndex={state.session.currentExerciseIndex ?? 0}
          onSelectExercise={onSelectExercise}
        />
      ) : null}

      {next.kind === 'log_set' && activeExercise && activeSet && prefill ? (
        <FocusCard
          exerciseName={activeExercise.name}
          setIndex={setIndex}
          setsTotal={activeExercise.sets.length}
          initialReps={prefill.reps}
          initialWeight={prefill.weight}
          initialRir={prefill.rir}
          onLogSet={(reps, weight, rir) =>
            onLogSet({ reps, weight, rir, plannedRestSeconds })
          }
          onPause={onPause}
        />
      ) : null}

      {next.kind === 'rest' ? (
        <>
          <RestStrip
            remainingMs={remainingMs}
            isExpanded={restExpanded}
            onExpand={() => setRestExpanded(true)}
            onSkipRest={onSkipRest}
            onExtendRest={() => onExtendRest(15)}
          />
          {restExpanded ? (
            <RestPanel
              remainingMs={remainingMs}
              plannedSeconds={state.session.rest?.plannedSeconds ?? plannedRestSeconds}
              onCollapse={() => setRestExpanded(false)}
              onSkipRest={onSkipRest}
              onExtendRest={() => onExtendRest(15)}
            />
          ) : null}
        </>
      ) : null}

      {next.kind === 'handoff' ? (
        <HandoffOverlay
          nextExerciseName={next.nextExerciseName}
          msRemaining={next.msRemaining}
          onContinue={onAdvanceToNextExercise}
        />
      ) : null}

      <Toast entry={toastEntry} onDismiss={onDismissToast} />

      {/* SESS-04: skip control for E2E + accessibility. */}
      {activeExercise ? (
        <div className="actions" style={{ marginTop: 'var(--sp-md)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="skip-exercise"
            onClick={onSkipExercise}
          >
            Saltar ejercicio
          </button>
          <span className="pill" aria-label="Progreso de la sesión">
            <strong>
              Ejercicio {(state.session.currentExerciseIndex ?? 0) + 1} de {exercises.length}
            </strong>
            <span>
              {progress.setsCompleted}/{progress.setsTotal} sets
            </span>
          </span>
        </div>
      ) : null}
    </section>
  )
}
