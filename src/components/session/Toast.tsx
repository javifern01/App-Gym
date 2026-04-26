import type { ToastEntry } from '../../hooks/useUndoableToast'

export interface ToastProps {
  entry: ToastEntry | null
  onDismiss: () => void
}

/**
 * Single-slot toast renderer. App owns the ToastEntry; this component renders or null.
 * Used primarily for the skip-exercise undo (D-13: 5s).
 */
export function Toast({ entry, onDismiss }: ToastProps) {
  if (!entry) return null
  return (
    <div className="toast" role="status" aria-live="polite" data-testid="toast">
      <span>{entry.message}</span>
      {entry.actionLabel && entry.onAction ? (
        <button
          type="button"
          className="btn"
          data-testid="toast-action"
          onClick={() => {
            entry.onAction?.()
          }}
        >
          {entry.actionLabel}
        </button>
      ) : null}
      <button type="button" className="btn" data-testid="toast-dismiss" onClick={onDismiss} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  )
}
