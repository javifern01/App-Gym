import type { Exercise } from '../../persist/schema'

export interface ExerciseStripProps {
  exercises: Exercise[]
  currentExerciseIndex: number
  onSelectExercise?: (index: number) => void
}

/**
 * Sticky-top chip strip showing all exercises in this session.
 * Driven entirely by props; tapping non-current chips delegates to props.onSelectExercise
 * (App decides whether to allow the jump — typically only to 'pending' or 'skipped').
 */
export function ExerciseStrip({ exercises, currentExerciseIndex, onSelectExercise }: ExerciseStripProps) {
  return (
    <nav className="ex-strip" aria-label="Ejercicios de la sesión">
      <div className="ex-strip__header">
        <h2 className="ex-strip__name">{exercises[currentExerciseIndex]?.name ?? 'Sesión'}</h2>
      </div>
      <div className="ex-strip__chips">
        {exercises.map((ex, i) => (
          <button
            key={ex.exerciseId}
            type="button"
            className="ex-chip"
            data-state={ex.status}
            aria-label={`${i + 1}: ${ex.name} (${ex.status})`}
            aria-current={i === currentExerciseIndex ? 'step' : undefined}
            onClick={onSelectExercise ? () => onSelectExercise(i) : undefined}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </nav>
  )
}
