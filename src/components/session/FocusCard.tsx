import { useState } from 'react'

export interface FocusCardProps {
  exerciseName: string
  setIndex: number
  setsTotal: number
  initialReps: number
  initialWeight: number
  initialRir: number
  onLogSet: (reps: number, weight: number, rir: number) => void
  onPause: () => void
}

const RIR_LABELS: Array<{ value: number; subLabel: string }> = [
  { value: 0, subLabel: 'fallo' },
  { value: 1, subLabel: '' },
  { value: 2, subLabel: '' },
  { value: 3, subLabel: '' },
  { value: 4, subLabel: 'fácil' },
]

/**
 * UI-SPEC FocusCard.
 * Pure-presentation: stepper + chips + CTA. Props hand it the planned target;
 * local state holds the user's current edits until ✓ Hecho.
 */
export function FocusCard({
  exerciseName,
  setIndex,
  setsTotal,
  initialReps,
  initialWeight,
  initialRir,
  onLogSet,
  onPause,
}: FocusCardProps) {
  const [reps, setReps] = useState<number>(initialReps)
  const [weight, setWeight] = useState<number>(initialWeight)
  const [rir, setRir] = useState<number>(initialRir)

  const decReps = () => setReps((r) => Math.max(0, r - 1))
  const incReps = () => setReps((r) => Math.min(99, r + 1))
  const decWeight = () => setWeight((w) => Math.max(0, +(w - 2.5).toFixed(2)))
  const incWeight = () => setWeight((w) => Math.min(999, +(w + 2.5).toFixed(2)))

  return (
    <section className="focus-card" aria-labelledby="focus-card-title" data-testid="focus-card">
      <header className="ex-strip__header">
        <h2 id="focus-card-title" className="ex-strip__name" style={{ margin: 0 }}>
          {exerciseName}
        </h2>
        <span className="session-indicator" aria-live="polite">
          Set {setIndex + 1}/{setsTotal}
        </span>
      </header>

      <div className="focus-card__display" aria-hidden="true">
        {reps}
        <small>×</small>
        {weight}
        <small>kg</small>
      </div>

      <div className="focus-card__row">
        <div className="field">
          <span className="label-strong" id="reps-label">Reps</span>
          <div className="stepper" role="group" aria-labelledby="reps-label">
            <button type="button" className="stepper__btn" onClick={decReps} aria-label="Restar 1 rep">−</button>
            <input
              className="stepper__value"
              type="number"
              inputMode="numeric"
              value={reps}
              min={0}
              max={99}
              onChange={(e) => setReps(Math.max(0, Math.min(99, Number(e.target.value) || 0)))}
              aria-label="Reps"
            />
            <button type="button" className="stepper__btn" onClick={incReps} aria-label="Sumar 1 rep">+</button>
          </div>
        </div>

        <div className="field">
          <span className="label-strong" id="weight-label">Peso (kg)</span>
          <div className="stepper" role="group" aria-labelledby="weight-label">
            <button type="button" className="stepper__btn" onClick={decWeight} aria-label="Restar 2,5 kg">−</button>
            <input
              className="stepper__value"
              type="number"
              inputMode="decimal"
              step={2.5}
              value={weight}
              min={0}
              max={999}
              onChange={(e) => setWeight(Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
              aria-label="Peso en kilogramos"
            />
            <button type="button" className="stepper__btn" onClick={incWeight} aria-label="Sumar 2,5 kg">+</button>
          </div>
        </div>
      </div>

      <div className="field">
        <span className="label-strong" id="rir-label">RIR</span>
        <div className="rir-group" role="radiogroup" aria-labelledby="rir-label">
          {RIR_LABELS.map(({ value, subLabel }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rir === value}
              className="rir-chip"
              onClick={() => setRir(value)}
            >
              {value}
              {subLabel ? <small>{subLabel}</small> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-success"
          data-testid="focus-log-set"
          onClick={() => onLogSet(reps, weight, rir)}
        >
          ✓ Hecho
        </button>
        <button type="button" className="btn" data-testid="focus-pause" onClick={onPause}>
          Pausar
        </button>
      </div>
    </section>
  )
}
