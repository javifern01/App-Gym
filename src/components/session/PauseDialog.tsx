export interface PauseDialogProps {
  /** Total elapsed since session start, in seconds. Display-only. */
  elapsedSeconds: number
  setsCompleted: number
  onResume: () => void
  onDiscard: () => void
}

/**
 * Pause modal. Locked copy per UI-SPEC §Copywriting.
 *
 * D-12: Pause does NOT release Wake Lock here — App handles that via
 * useWakeLock(state.session.status === 'in_progress'). This component just
 * exposes the two human-actionable choices.
 */
export function PauseDialog({ elapsedSeconds, setsCompleted, onResume, onDiscard }: PauseDialogProps) {
  return (
    <div className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-dialog-title" data-testid="pause-dialog">
      <div className="pause-dialog__card">
        <h2 id="pause-dialog-title" className="pause-dialog__title">Sesión en pausa</h2>
        <p className="hint">
          Llevas {Math.floor(elapsedSeconds / 60)} min · {setsCompleted} sets registrados.
        </p>
        <div className="pause-dialog__actions">
          <button type="button" className="btn btn-primary" data-testid="pause-resume" onClick={onResume}>
            Reanudar
          </button>
          <button type="button" className="btn btn-danger-outline" data-testid="pause-discard" onClick={onDiscard}>
            Descartar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
