import { formatTime } from '../../utils/formatTime'

export interface RestPanelProps {
  remainingMs: number
  plannedSeconds: number
  onCollapse: () => void
  onSkipRest: () => void
  onExtendRest: () => void
}

/**
 * Expanded rest panel — full-screen overlay with a conic-gradient dial.
 *
 * The dial fill percentage is driven via inline `--progress` CSS variable so the
 * .rest-dial class (defined in src/index.css) renders correctly without JS-side
 * style logic.
 */
export function RestPanel({ remainingMs, plannedSeconds, onCollapse, onSkipRest, onExtendRest }: RestPanelProps) {
  const finished = remainingMs <= 0
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000)
  const totalMs = plannedSeconds * 1000
  const elapsedMs = Math.max(0, totalMs - Math.max(0, remainingMs))
  const progress = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0

  return (
    <div className="rest-panel" role="dialog" aria-label="Descanso">
      <div
        className="rest-dial"
        style={{ ['--progress' as string]: progress } as React.CSSProperties}
        aria-hidden="true"
      />
      <p className="rest-panel__count" aria-live="polite">
        {finished ? '0:00' : formatTime(seconds)}
      </p>
      <div className="rest-panel__controls">
        <button type="button" className="btn" onClick={onExtendRest} disabled={finished}>
          +15s
        </button>
        <button type="button" className="btn" onClick={onSkipRest}>
          {finished ? '✓ Hecho' : 'Saltar'}
        </button>
        <button type="button" className="btn" onClick={onCollapse} aria-label="Cerrar panel de descanso">
          {'Cerrar'}
        </button>
      </div>
    </div>
  )
}
