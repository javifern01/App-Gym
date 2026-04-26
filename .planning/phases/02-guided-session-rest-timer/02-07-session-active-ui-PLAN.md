---
phase: 2
plan: 07
type: execute
wave: 3
depends_on: ["02-01", "02-02", "02-04", "02-05", "02-06"]
files_modified:
  - src/components/session/FocusCard.tsx
  - src/components/session/ExerciseStrip.tsx
  - src/components/session/RestStrip.tsx
  - src/components/session/RestPanel.tsx
autonomous: true
requirements: [SESS-01, SESS-02, REST-01, REST-02]
must_haves:
  truths:
    - "FocusCard renders the active exercise name, set X/total, and the trio of inputs (reps stepper, weight stepper, RIR chips 0–4)"
    - "FocusCard's primary CTA literally renders the string '✓ Hecho' (UI-SPEC §Copywriting — locked)"
    - "FocusCard CTA onClick calls onLogSet(reps, weight, rir) with the current local values"
    - "ExerciseStrip is sticky-top, renders one chip per exercise with data-state ∈ {pending, active, done, skipped}; tapping a non-active chip emits onSelectExercise(index)"
    - "RestStrip (collapsed) is fixed-bottom; while rest is active, displays prefix 'Descansando · ' followed by formatTime(secondsRemaining) — UI-SPEC strings"
    - "RestStrip onClick toggles into the expanded RestPanel (or directly emits onExpand)"
    - "RestPanel renders the conic-gradient dial (.rest-dial), the formatTime display, and exposes 'Saltar', '+15s', and (when rest finished) '✓ Hecho' buttons"
    - "RestStrip becomes .rest-strip--alert when remainingMs is 0 (visual flash)"
    - "All four components are pure-presentation: NO useReducer, NO localStorage, NO Date.now (the App owns those — RESEARCH §Pattern 1)"
  artifacts:
    - path: "src/components/session/FocusCard.tsx"
      provides: "FocusCard exercise+set inputs + ✓ Hecho CTA"
      contains: "✓ Hecho"
    - path: "src/components/session/ExerciseStrip.tsx"
      provides: "Top sticky chip strip"
      contains: "data-state"
    - path: "src/components/session/RestStrip.tsx"
      provides: "Bottom collapsed rest indicator + tap-to-expand"
      contains: "Descansando · "
    - path: "src/components/session/RestPanel.tsx"
      provides: "Expanded rest dial + extend/skip controls"
      contains: "rest-dial"
  key_links:
    - from: "FocusCard primary CTA"
      to: "App.tsx LOG_SET dispatcher"
      via: "props.onLogSet(reps, weight, rir)"
      pattern: "onLogSet"
    - from: "RestStrip + RestPanel"
      to: "useRestTimer (plan 02-06)"
      via: "App passes secondsRemaining derived from useRestTimer"
      pattern: "secondsRemaining"
---

<objective>
Build the four "in-session" UI components — the visible surface during an active workout. Each component is purely presentational; state and dispatch live in App.tsx (plan 02-10).

Purpose: SESS-01 (no folio en blanco) is delivered visually by FocusCard always rendering an active set; SESS-02 (set logging) by FocusCard's three inputs + ✓ Hecho; REST-01 by RestStrip + RestPanel.
Output: 4 .tsx files under `src/components/session/`. No tests at this layer (covered by E2E in plan 02-11).
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md
@src/persist/schema.ts
@src/index.css
@src/session/types.ts
@src/session/selectors.ts

<interfaces>
<!-- From plans 02-01, 02-04, 02-05 -->

From src/persist/schema.ts:
```typescript
export type Exercise = { exerciseId: string; name: string; status: 'pending'|'active'|'done'|'skipped'; currentSetIndex: number; sets: ExerciseSetV3[] }
```

From src/utils/formatTime.ts (plan 02-05):
```typescript
export function formatTime(seconds: number): string
```
</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. Plain React + TS + the CSS classes added by plan 02-02.

**Copy strings (UI-SPEC §Copywriting — LOCKED):** the executor MUST copy these EXACTLY:
- '✓ Hecho' (primary CTA on FocusCard)
- 'Descansando · ' (prefix on RestStrip — note the middle dot ·, U+00B7, NOT a hyphen)
- '+15s' (extend rest button)
- 'Saltar' (skip rest button)
- 'Reps', 'Peso (kg)', 'RIR' (input labels)
- 'Set ' followed by `${current+1}/${total}` (set indicator)
</context>

<tasks>

<task type="auto">
  <name>Task 1: FocusCard.tsx + ExerciseStrip.tsx</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory (Phase 2)" rows for FocusCard + ExerciseStrip
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Layout & Responsive Rules" (sticky cinta z-index 2; FocusCard 70% viewport)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Copywriting" (exact strings)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-01 (Focus Mode — single set on screen)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-04 (steppers + RIR chips 0–4 — not slider)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-07 (RIR labels: 0=fallo, 1, 2, 3, 4=fácil)
    - src/index.css (classes .focus-card, .focus-card__display, .focus-card__row, .stepper, .stepper__btn, .stepper__value, .rir-group, .rir-chip, .ex-strip, .ex-chip, .session-indicator, .label-strong)
  </read_first>
  <action>
Create `src/components/session/FocusCard.tsx` EXACTLY:

```tsx
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
    <section className="focus-card" aria-labelledby="focus-card-title">
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
          onClick={() => onLogSet(reps, weight, rir)}
        >
          ✓ Hecho
        </button>
        <button type="button" className="btn" onClick={onPause}>
          Pausar
        </button>
      </div>
    </section>
  )
}
```

Create `src/components/session/ExerciseStrip.tsx` EXACTLY:

```tsx
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
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function FocusCard" src/components/session/FocusCard.tsx` matches
    - `rg "✓ Hecho" src/components/session/FocusCard.tsx` matches (exact CTA copy)
    - `rg "Pausar" src/components/session/FocusCard.tsx` matches
    - `rg "className=\"focus-card\"" src/components/session/FocusCard.tsx` matches
    - `rg "className=\"stepper\"" src/components/session/FocusCard.tsx` matches at least 2 times (reps + weight)
    - `rg "className=\"rir-chip\"" src/components/session/FocusCard.tsx` matches
    - `rg "role=\"radiogroup\"" src/components/session/FocusCard.tsx` matches
    - `rg "value: 0, subLabel: 'fallo'" src/components/session/FocusCard.tsx` matches (D-07)
    - `rg "value: 4, subLabel: 'fácil'" src/components/session/FocusCard.tsx` matches (D-07)
    - `rg "Set \{setIndex \+ 1\}/\{setsTotal\}" src/components/session/FocusCard.tsx` matches
    - `rg "step=\{2\.5\}" src/components/session/FocusCard.tsx` matches (D-04: ±2.5 kg)
    - `rg "Math\.max\(0, w - 2\.5\)|w - 2\.5" src/components/session/FocusCard.tsx` matches
    - `rg "export function ExerciseStrip" src/components/session/ExerciseStrip.tsx` matches
    - `rg "data-state=\{ex\.status\}" src/components/session/ExerciseStrip.tsx` matches
    - `rg "aria-current=\{i === currentExerciseIndex" src/components/session/ExerciseStrip.tsx` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>FocusCard + ExerciseStrip render the SESS-01/SESS-02 surface; props are minimal; copy is locked.</done>
</task>

<task type="auto">
  <name>Task 2: RestStrip.tsx (collapsed bottom rest indicator)</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory (Phase 2)" RestStrip row
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Copywriting" (exact strings: 'Descansando · ', 'Listo · pulsa para continuar' or equivalent — verify in UI-SPEC)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-09 (skip rest), D-10 (extend +15s)
    - src/index.css (classes .rest-strip, .rest-strip--active, .rest-strip--alert)
    - src/utils/formatTime.ts (plan 02-05)
  </read_first>
  <action>
Create `src/components/session/RestStrip.tsx` EXACTLY:

```tsx
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
    <div className={className} role="status" aria-live="polite">
      <button
        type="button"
        className="rest-strip__label"
        onClick={onExpand}
        style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', flex: 1, textAlign: 'left', padding: 0 }}
      >
        {finished ? 'Listo · pulsa para continuar' : <>Descansando · {formatTime(seconds)}</>}
      </button>
      <div className="actions" style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
        <button type="button" className="btn" onClick={onExtendRest} disabled={finished} aria-label="Añadir 15 segundos">
          +15s
        </button>
        <button type="button" className="btn" onClick={onSkipRest}>
          {finished ? '✓ Hecho' : 'Saltar'}
        </button>
      </div>
    </div>
  )
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function RestStrip" src/components/session/RestStrip.tsx` matches
    - `rg "Descansando · " src/components/session/RestStrip.tsx` matches (note middle dot)
    - `rg "Listo · pulsa para continuar" src/components/session/RestStrip.tsx` matches
    - `rg "'rest-strip--alert'" src/components/session/RestStrip.tsx` matches
    - `rg "'rest-strip--active'" src/components/session/RestStrip.tsx` matches
    - `rg "\\+15s" src/components/session/RestStrip.tsx` matches
    - `rg "'Saltar'" src/components/session/RestStrip.tsx` matches
    - `rg "import \{ formatTime \}" src/components/session/RestStrip.tsx` matches
    - `rg "role=\"status\"" src/components/session/RestStrip.tsx` matches (a11y for rest end announcement)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>RestStrip implements REST-01 visual surface; finished state announces; copy locked.</done>
</task>

<task type="auto">
  <name>Task 3: RestPanel.tsx (expanded rest dial + controls)</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" RestPanel row
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Layout & Responsive Rules" (full-screen overlay z-index 5)
    - src/index.css (.rest-panel, .rest-panel__count, .rest-dial, .rest-panel__controls)
    - src/utils/formatTime.ts
  </read_first>
  <action>
Create `src/components/session/RestPanel.tsx` EXACTLY:

```tsx
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
          Cerrar
        </button>
      </div>
    </div>
  )
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function RestPanel" src/components/session/RestPanel.tsx` matches
    - `rg "className=\"rest-panel\"" src/components/session/RestPanel.tsx` matches
    - `rg "className=\"rest-dial\"" src/components/session/RestPanel.tsx` matches
    - `rg "'--progress' as string" src/components/session/RestPanel.tsx` matches (CSS var injection)
    - `rg "role=\"dialog\"" src/components/session/RestPanel.tsx` matches
    - `rg "aria-label=\"Descanso\"" src/components/session/RestPanel.tsx` matches
    - `rg "\\+15s" src/components/session/RestPanel.tsx` matches
    - `rg "'Saltar'" src/components/session/RestPanel.tsx` matches
    - `rg "'Cerrar'" src/components/session/RestPanel.tsx` matches
    - `rg "import \{ formatTime \}" src/components/session/RestPanel.tsx` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>RestPanel renders the expanded REST-01 surface; conic dial wires via CSS var; copy locked.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- `npx tsc -b` exits 0 across new src/components/session/* files (App.tsx may still error pending plan 02-10).
- All UI-SPEC strings appear verbatim in the source files (greps above).
- Components are pure-presentational: `rg "useReducer|localStorage|saveSnapshot|loadSnapshot" src/components/session/` returns 0 matches.
</verification>

<success_criteria>
The active-session UI surface is complete and ready for App.tsx to wire (plan 02-10). SESS-01 (FocusCard always present) and REST-01 (RestStrip + RestPanel visible during rest) are implemented. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-07-SUMMARY.md` documenting:
- Component prop tables (FocusCard, ExerciseStrip, RestStrip, RestPanel)
- Copy strings used (verbatim list with UI-SPEC § cite)
- Files modified
- D-22 compliance confirmed
</output>
