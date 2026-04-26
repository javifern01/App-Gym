import { useAudioCue } from '../hooks/useAudioCue'

interface Props {
  onStartSession: () => void
}

const SEED_ROUTINE = [
  { name: 'Sentadilla', sets: 4, reps: 8 },
  { name: 'Press banca', sets: 4, reps: 8 },
  { name: 'Remo con barra', sets: 4, reps: 8 },
]

export function EmptyStateScreen({ onStartSession }: Props) {
  const audioCue = useAudioCue()

  /**
   * RESEARCH §Pattern 3 + §Pitfall 1: AudioContext.resume() MUST run inside a
   * real user gesture handler. We prime here, before onStartSession dispatches
   * START_SESSION. We deliberately fire-and-forget; audio failures must NEVER
   * block session start.
   */
  const handleStart = () => {
    void audioCue.prime()
    onStartSession()
  }

  return (
    <section aria-label="Estado vacío">
      <h2 className="section-title">Listo para entrenar</h2>
      <p className="section-subtitle">
        Hoy te toca una mini-rutina de 3 ejercicios × 4 series × 8 reps. La app te guiará paso a paso y medirá los descansos.
      </p>

      <ul className="list" aria-label="Rutina de hoy" style={{ marginTop: 'var(--sp-md)' }}>
        {SEED_ROUTINE.map((ex) => (
          <li key={ex.name} className="set-row">
            <span className="set-row__index" aria-hidden="true">●</span>
            <span>
              <strong>{ex.name}</strong> · {ex.sets} series × {ex.reps} reps
            </span>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button
          type="button"
          className="btn btn-success"
          data-testid="start-session"
          onClick={handleStart}
        >
          Iniciar sesión
        </button>
        <span className="pill">
          <strong>Local</strong> se guarda en este navegador
        </span>
      </div>
    </section>
  )
}
