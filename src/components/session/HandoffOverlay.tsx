export interface HandoffOverlayProps {
  nextExerciseName: string
  msRemaining: number
  onContinue: () => void
}

/**
 * 3-second transition between exercises (D-08).
 * App.tsx handles the auto-dismiss timer + the ADVANCE_TO_NEXT_EXERCISE dispatch
 * when msRemaining hits 0; this component is purely presentational.
 *
 * "Empezar ya" lets the user shortcut the 3s wait.
 */
export function HandoffOverlay({ nextExerciseName, msRemaining, onContinue }: HandoffOverlayProps) {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000))
  return (
    <div className="handoff-overlay" role="dialog" aria-label="Siguiente ejercicio">
      <h2 className="handoff-overlay__title">Siguiente: {nextExerciseName}</h2>
      <p className="handoff-overlay__count" aria-live="polite">{seconds}</p>
      <button type="button" className="btn btn-primary" onClick={onContinue}>
        Empezar ya
      </button>
    </div>
  )
}
