import type { SnapshotV2 } from '../persist/schema'

type Props = {
  snapshot: SnapshotV2
  onCompleteNextSet: () => void
}

export function SessionScreen({ snapshot, onCompleteNextSet }: Props) {
  const sets = snapshot.session.sets
  const completedCount = sets.filter((s) => s.completed != null).length
  const plannedCount = sets.length

  const statusText =
    snapshot.session.status === 'in_progress'
      ? 'En progreso'
      : snapshot.session.status === 'completed'
        ? 'Completada'
        : 'Lista'

  const firstSet = sets[0]

  return (
    <section style={{ maxWidth: 620 }}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Sesión</h2>
        <div data-testid="session-status">
          Estado: {statusText} · {completedCount}/{plannedCount} sets
        </div>
      </header>

      <h3 style={{ marginTop: 0 }}>{snapshot.session.exerciseName}</h3>

      <ol style={{ paddingLeft: 18 }}>
        {sets.map((set, idx) => {
          const done = set.completed != null
          return (
            <li
              key={set.setId}
              data-testid={idx === 0 ? 'set-row-0' : undefined}
              style={{
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.10)',
                background: done ? 'rgba(0, 200, 120, 0.12)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>Set {idx + 1}</strong> · Plan: {set.planned.reps} reps
                </div>
                <div>{done ? `Hecho (${set.completed!.reps})` : 'Pendiente'}</div>
              </div>
            </li>
          )
        })}
      </ol>

      <button
        type="button"
        data-testid="complete-set"
        disabled={snapshot.session.status !== 'in_progress'}
        onClick={onCompleteNextSet}
        style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background:
            snapshot.session.status === 'in_progress'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.03)',
          color: 'inherit',
          cursor: snapshot.session.status === 'in_progress' ? 'pointer' : 'not-allowed',
        }}
      >
        Completar siguiente set
      </button>

      {firstSet?.completed != null ? (
        <p style={{ marginTop: 10, opacity: 0.85 }}>
          Progreso guardado: el primer set está marcado como hecho.
        </p>
      ) : null}
    </section>
  )
}

