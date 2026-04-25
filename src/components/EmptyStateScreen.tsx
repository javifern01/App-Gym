type Props = {
  onStartSession: () => void
}

export function EmptyStateScreen({ onStartSession }: Props) {
  return (
    <section style={{ maxWidth: 520 }}>
      <h2>Listo para entrenar</h2>
      <p>No tienes ninguna sesión en curso.</p>

      <button
        type="button"
        data-testid="start-session"
        onClick={onStartSession}
        style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.08)',
          color: 'inherit',
          cursor: 'pointer',
        }}
      >
        Iniciar sesión
      </button>
    </section>
  )
}

