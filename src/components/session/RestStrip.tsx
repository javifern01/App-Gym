import { formatTime } from '../../utils/formatTime'

export interface RestStripProps {
  /** ms remaining; 0 means rest just ended (alert state). */
  remainingMs: number
  /** Whether the strip should be in expanded "active" mode (taller). */
  isExpanded?: boolean
  onExpand: () => void
  onSkipRest: () => void
  onExtendRest: () => void
}

/**
 * Collapsed rest strip pinned to the bottom (z-index 4 via .rest-strip in CSS).
 *
 * Three visual states:
 *   - rest active        → `.rest-strip` + `.rest-strip--active` (taller),
 *                           label "Descansando · M:SS", tap → expand
 *   - rest finished (0)  → `.rest-strip` + `.rest-strip--alert` (flash),
 *                           label "Listo · pulsa para continuar"
 *   - rest hidden        → component renders null at the call site (App responsibility)
 */
export function RestStrip({ remainingMs, isExpanded, onExpand, onSkipRest, onExtendRest }: RestStripProps) {
  const finished = remainingMs <= 0
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000)

  const className = [
    'rest-strip',
    finished ? 'rest-strip--alert' : 'rest-strip--active',
    isExpanded ? 'rest-strip--expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="status" aria-live="polite" data-testid="rest-strip">
      <button
        type="button"
        className="rest-strip__label"
        onClick={onExpand}
        style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', flex: 1, textAlign: 'left', padding: 0 }}
      >
        {finished ? 'Listo · pulsa para continuar' : <>Descansando · {formatTime(seconds)}</>}
      </button>
      <div className="actions" style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
        <button type="button" className="btn" data-testid="rest-strip-extend" onClick={onExtendRest} disabled={finished} aria-label="Añadir 15 segundos">
          +15s
        </button>
        <button type="button" className="btn" data-testid="rest-strip-skip" onClick={onSkipRest}>
          {finished ? '✓ Hecho' : 'Saltar'}
        </button>
      </div>
    </div>
  )
}
