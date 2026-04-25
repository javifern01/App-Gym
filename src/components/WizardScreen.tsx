import { useState } from 'react'
import type { SnapshotV2 } from '../persist/schema'

type Props = {
  initialPreferences?: SnapshotV2['preferences']
  onSubmit: (preferences: NonNullable<SnapshotV2['preferences']>) => void
}

export function WizardScreen({ initialPreferences, onSubmit }: Props) {
  const [goalFocus, setGoalFocus] = useState<
    NonNullable<SnapshotV2['preferences']>['goalFocus']
  >(initialPreferences?.goalFocus ?? 'strength')
  const [equipmentNote, setEquipmentNote] = useState<string>(
    initialPreferences?.equipmentNote ?? ''
  )

  return (
    <section style={{ maxWidth: 520 }}>
      <h2>Antes de empezar</h2>
      <p>Un par de detalles para ajustar el entreno.</p>

      <fieldset style={{ border: 0, padding: 0, margin: '16px 0' }}>
        <legend style={{ fontWeight: 600 }}>Objetivo principal</legend>
        <label style={{ display: 'block', marginTop: 8 }}>
          <input
            type="radio"
            name="goalFocus"
            value="strength"
            checked={goalFocus === 'strength'}
            onChange={() => setGoalFocus('strength')}
          />{' '}
          Fuerza
        </label>
        <label style={{ display: 'block', marginTop: 8 }}>
          <input
            type="radio"
            name="goalFocus"
            value="hypertrophy"
            checked={goalFocus === 'hypertrophy'}
            onChange={() => setGoalFocus('hypertrophy')}
          />{' '}
          Hipertrofia
        </label>
        <label style={{ display: 'block', marginTop: 8 }}>
          <input
            type="radio"
            name="goalFocus"
            value="fat_loss"
            checked={goalFocus === 'fat_loss'}
            onChange={() => setGoalFocus('fat_loss')}
          />{' '}
          Pérdida de grasa
        </label>
      </fieldset>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span style={{ display: 'block', fontWeight: 600 }}>Equipamiento (nota)</span>
        <input
          data-testid="equipment-note"
          value={equipmentNote}
          onChange={(e) => setEquipmentNote(e.target.value)}
          placeholder="Ej: gym completo"
          style={{
            width: '100%',
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.25)',
            color: 'inherit',
          }}
        />
      </label>

      <button
        type="button"
        data-testid="wizard-submit"
        onClick={() => onSubmit({ goalFocus, equipmentNote })}
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
        Continuar
      </button>
    </section>
  )
}

