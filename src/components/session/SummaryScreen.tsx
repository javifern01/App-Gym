import type { SnapshotV3 } from '../../persist/schema'
import { computeRestDeviation } from '../../utils/restDeviation'
import { formatTime } from '../../utils/formatTime'

export interface SummaryScreenProps {
  snapshot: SnapshotV3
  /** Epoch ms used to compute total elapsed time when status === 'completed'. */
  endedAtMs: number
  onStartNewSession: () => void
}

function classifyDeviation(samples: number, deltaSeconds: number): 'ok' | 'warn' | 'bad' | 'none' {
  if (samples === 0) return 'none'
  const abs = Math.abs(deltaSeconds)
  if (abs <= 10) return 'ok'
  if (abs <= 30) return 'warn'
  return 'bad'
}

/**
 * SummaryScreen — terminal state of the session.
 *
 * Renders D-19 metrics:
 *   - Tiempo total (computed from snapshot.session.startedAtMs → endedAtMs)
 *   - Sets registrados (count of completed sets across all exercises)
 *   - Δ descanso  (REST-02 — pulled from computeRestDeviation)
 * Plus per-exercise rows with status icons (✓ done / ↷ skipped — SESS-04).
 */
export function SummaryScreen({ snapshot, endedAtMs, onStartNewSession }: SummaryScreenProps) {
  const startedAtMs = snapshot.session.startedAtMs ?? endedAtMs
  const totalSeconds = Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))

  let setsCompleted = 0
  for (const ex of snapshot.session.exercises) {
    for (const set of ex.sets) {
      if (set.completed != null) setsCompleted += 1
    }
  }

  const dev = computeRestDeviation(snapshot)
  const devClass = classifyDeviation(dev.samples, dev.meanDeltaSeconds)
  const devLabel =
    dev.samples === 0
      ? 'Δ descanso: —'
      : `Δ descanso: ${dev.meanDeltaSeconds > 0 ? '+' : ''}${dev.meanDeltaSeconds} s`

  return (
    <section className="summary-card" aria-labelledby="summary-title">
      <h2 id="summary-title" className="summary-card__title">¡Sesión completada!</h2>

      <div className="summary-card__chips">
        <span className="summary-chip">Tiempo total: {formatTime(totalSeconds)}</span>
        <span className="summary-chip">Sets registrados: {setsCompleted}</span>
        <span
          className={
            'summary-chip ' +
            (devClass === 'ok' ? 'summary-chip--ok' : devClass === 'warn' ? 'summary-chip--warn' : devClass === 'bad' ? 'summary-chip--bad' : '')
          }
        >
          {devLabel}
        </span>
      </div>

      <ul className="list">
        {snapshot.session.exercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed != null).length
          const icon = ex.status === 'skipped' ? '↷' : ex.status === 'done' ? '✓' : '·'
          return (
            <li key={ex.exerciseId} className="set-row">
              <span className="set-row__index" aria-hidden="true">{icon}</span>
              <span>
                <strong>{ex.name}</strong> · {completedSets}/{ex.sets.length} sets
                {ex.status === 'skipped' ? ' · saltado' : ''}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onStartNewSession}>
          Empezar otra sesión
        </button>
      </div>
    </section>
  )
}
