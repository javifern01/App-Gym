import { useState } from 'react'
import type { PreferencesV3 } from '../persist/schema'

interface Props {
  initialPreferences?: PreferencesV3
  onSubmit: (preferences: PreferencesV3) => void
}

export function WizardScreen({ initialPreferences, onSubmit }: Props) {
  const [goalFocus, setGoalFocus] = useState<PreferencesV3['goalFocus']>(
    initialPreferences?.goalFocus ?? 'strength'
  )
  const [equipmentNote, setEquipmentNote] = useState<string>(
    initialPreferences?.equipmentNote ?? ''
  )
  const [restAlertSound, setRestAlertSound] = useState<boolean>(
    initialPreferences?.restAlertSound ?? true
  )
  const [restAlertVibration, setRestAlertVibration] = useState<boolean>(
    initialPreferences?.restAlertVibration ?? true
  )
  const [effortMetric, setEffortMetric] = useState<PreferencesV3['effortMetric']>(
    initialPreferences?.effortMetric ?? 'rir'
  )

  return (
    <section aria-label="Asistente inicial">
      <h2 className="section-title">Antes de empezar</h2>
      <p className="section-subtitle">Un par de detalles para ajustar el entreno.</p>

      <div className="field" style={{ marginTop: 16 }}>
        <div className="label">Objetivo principal</div>
        <div className="radio-grid" role="radiogroup" aria-label="Objetivo principal">
          <label className="radio-card" data-checked={goalFocus === 'strength'}>
            <span>
              <strong>Fuerza</strong>
              <br />
              <small>Prioriza cargas y técnica.</small>
            </span>
            <input
              type="radio"
              name="goalFocus"
              value="strength"
              checked={goalFocus === 'strength'}
              onChange={() => setGoalFocus('strength')}
              aria-label="Fuerza"
            />
          </label>
          <label className="radio-card" data-checked={goalFocus === 'hypertrophy'}>
            <span>
              <strong>Hipertrofia</strong>
              <br />
              <small>Volumen y control.</small>
            </span>
            <input
              type="radio"
              name="goalFocus"
              value="hypertrophy"
              checked={goalFocus === 'hypertrophy'}
              onChange={() => setGoalFocus('hypertrophy')}
              aria-label="Hipertrofia"
            />
          </label>
          <label className="radio-card" data-checked={goalFocus === 'fat_loss'}>
            <span>
              <strong>Pérdida de grasa</strong>
              <br />
              <small>Consistencia y ritmo.</small>
            </span>
            <input
              type="radio"
              name="goalFocus"
              value="fat_loss"
              checked={goalFocus === 'fat_loss'}
              onChange={() => setGoalFocus('fat_loss')}
              aria-label="Pérdida de grasa"
            />
          </label>
        </div>
      </div>

      <label className="field">
        <span className="label">Equipamiento (nota)</span>
        <input
          className="input"
          data-testid="equipment-note"
          value={equipmentNote}
          onChange={(e) => setEquipmentNote(e.target.value)}
          placeholder="Ej: gym completo"
        />
      </label>

      <div className="field">
        <div className="label">Avisos de descanso</div>
        <label className="radio-card" style={{ marginBottom: 'var(--sp-sm)' }}>
          <span>
            <strong>Sonido al terminar el descanso</strong>
            <br />
            <small>Beep corto cuando llegue a 0.</small>
          </span>
          <input
            type="checkbox"
            data-testid="pref-rest-sound"
            checked={restAlertSound}
            onChange={(e) => setRestAlertSound(e.target.checked)}
            aria-label="Activar sonido en avisos de descanso"
          />
        </label>
        <label className="radio-card">
          <span>
            <strong>Vibración al terminar el descanso</strong>
            <br />
            <small>Solo en dispositivos compatibles.</small>
          </span>
          <input
            type="checkbox"
            data-testid="pref-rest-vibrate"
            checked={restAlertVibration}
            onChange={(e) => setRestAlertVibration(e.target.checked)}
            aria-label="Activar vibración en avisos de descanso"
          />
        </label>
      </div>

      <div className="field">
        <div className="label">Métrica de esfuerzo</div>
        <div className="radio-grid" role="radiogroup" aria-label="Métrica de esfuerzo">
          <label className="radio-card" data-checked={effortMetric === 'rir'}>
            <span>
              <strong>RIR</strong>
              <br />
              <small>Reps en reserva (0=fallo, 4=fácil).</small>
            </span>
            <input
              type="radio"
              name="effortMetric"
              value="rir"
              data-testid="pref-effort-rir"
              checked={effortMetric === 'rir'}
              onChange={() => setEffortMetric('rir')}
              aria-label="RIR"
            />
          </label>
          <label className="radio-card" data-checked={effortMetric === 'rpe'}>
            <span>
              <strong>RPE</strong>
              <br />
              <small>Esfuerzo percibido 6–10.</small>
            </span>
            <input
              type="radio"
              name="effortMetric"
              value="rpe"
              data-testid="pref-effort-rpe"
              checked={effortMetric === 'rpe'}
              onChange={() => setEffortMetric('rpe')}
              aria-label="RPE"
            />
          </label>
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          data-testid="wizard-submit"
          onClick={() =>
            onSubmit({
              goalFocus,
              equipmentNote,
              restAlertSound,
              restAlertVibration,
              effortMetric,
            })
          }
        >
          Continuar
        </button>
        <span className="pill">
          <strong>Tip</strong> puedes cambiarlo luego
        </span>
      </div>
    </section>
  )
}
