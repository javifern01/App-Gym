---
phase: 2
plan: 08
type: execute
wave: 3
depends_on: ["02-01", "02-02", "02-04", "02-05"]
files_modified:
  - src/components/session/HandoffOverlay.tsx
  - src/components/session/Toast.tsx
  - src/components/session/PauseDialog.tsx
  - src/components/session/SummaryScreen.tsx
autonomous: true
requirements: [SESS-01, SESS-04, REST-02]
must_haves:
  truths:
    - "HandoffOverlay renders a 3-second transition between exercises and exposes onContinue (immediate skip) — D-08"
    - "HandoffOverlay shows the EXACT next exercise name from props.nextExerciseName (SESS-01: never blank between exercises)"
    - "Toast renders an undo affordance for skipExercise — D-13: 5-second window"
    - "PauseDialog renders 'Reanudar' AND 'Descartar sesión' buttons (UI-SPEC §Copywriting)"
    - "SummaryScreen renders 'Tiempo total', 'Sets registrados', 'Δ descanso' chips with computeRestDeviation values (REST-02)"
    - "SummaryScreen renders one row per exercise with status (✓ done / ↷ skipped) — SESS-04"
    - "All four components are pure-presentational: NO useReducer, NO localStorage, NO Date.now"
  artifacts:
    - path: "src/components/session/HandoffOverlay.tsx"
      provides: "3s transition overlay between exercises"
      contains: "nextExerciseName"
    - path: "src/components/session/Toast.tsx"
      provides: "Undo toast for SKIP_EXERCISE"
      contains: "Deshacer"
    - path: "src/components/session/PauseDialog.tsx"
      provides: "Pause modal with Resume + Discard"
      contains: "Reanudar"
    - path: "src/components/session/SummaryScreen.tsx"
      provides: "Final session summary with REST-02 deviation"
      contains: "Δ descanso"
  key_links:
    - from: "SummaryScreen"
      to: "computeRestDeviation (plan 02-05)"
      via: "renders meanDeltaSeconds with sign + 's' suffix"
      pattern: "computeRestDeviation"
    - from: "Toast"
      to: "useUndoableToast (plan 02-06)"
      via: "App passes the current toast entry as props"
      pattern: "ToastEntry|onAction"
---

<objective>
Build the four "auxiliary" session UI components — surfaces that appear at transitions, errors, or end-of-session.

Purpose: SESS-04 (skip + undo) requires Toast; SESS-01 (no folio en blanco between exercises) requires HandoffOverlay; PauseDialog completes the user's escape hatch; SummaryScreen renders REST-02's computed deviation.
Output: 4 .tsx files. No tests at this layer (covered by E2E plan 02-11).
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
@src/utils/restDeviation.ts
@src/utils/formatTime.ts

<interfaces>
From src/utils/restDeviation.ts (plan 02-05):
```typescript
export type RestDeviationResult = {
  meanDeltaSeconds: number
  samples: number
  perExercise: Array<{ exerciseId: string; name: string; samples: number; meanDeltaSeconds: number }>
}
export function computeRestDeviation(state: SessionState): RestDeviationResult
```

From src/hooks/useUndoableToast.ts (plan 02-06):
```typescript
export interface ToastEntry { id: number; message: string; actionLabel?: string; onAction?: () => void; expiresAtMs: number }
```
</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. Plain React + TS.

**Copy strings (UI-SPEC §Copywriting — LOCKED):**
- HandoffOverlay: 'Siguiente:' (label), 'Empezar ya' (CTA — D-08 NOT a back-to-summary)
- Toast (skip undo): 'Ejercicio saltado · ' (prefix), 'Deshacer' (action)
- PauseDialog: 'Sesión en pausa' (title), 'Reanudar' (primary CTA), 'Descartar sesión' (secondary danger)
- SummaryScreen title: '¡Sesión completada!'
- SummaryScreen chips: 'Tiempo total', 'Sets registrados', 'Δ descanso'
- SummaryScreen deviation chip when samples=0: 'Δ descanso: —'
- SummaryScreen deviation chip when samples>0: 'Δ descanso: ${signed} s' (e.g., '+5 s' or '-4 s' or '0 s')
</context>

<tasks>

<task type="auto">
  <name>Task 1: HandoffOverlay.tsx + Toast.tsx</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" rows for HandoffOverlay + Toast
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-08 (handoff overlay 3s, "Empezar ya" → ADVANCE_TO_NEXT_EXERCISE)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-13 (skip undo toast 5s)
    - src/index.css (.handoff-overlay, .handoff-overlay__title, .handoff-overlay__count, .toast)
  </read_first>
  <action>
Create `src/components/session/HandoffOverlay.tsx` EXACTLY:

```tsx
export interface HandoffOverlayProps {
  nextExerciseName: string
  msRemaining: number
  onContinue: () => void
}

/**
 * 3-second transition between exercises (D-08).
 * App.tsx handles the auto-dismiss timer + the ADVANCE_TO_NEXT_EXERCISE dispatch
 * when msRemaining hits 0; this component is purely presentational.
 *
 * "Empezar ya" lets the user shortcut the 3s wait.
 */
export function HandoffOverlay({ nextExerciseName, msRemaining, onContinue }: HandoffOverlayProps) {
  const seconds = Math.max(0, Math.ceil(msRemaining / 1000))
  return (
    <div className="handoff-overlay" role="dialog" aria-label="Siguiente ejercicio">
      <h2 className="handoff-overlay__title">Siguiente: {nextExerciseName}</h2>
      <p className="handoff-overlay__count" aria-live="polite">{seconds}</p>
      <button type="button" className="btn btn-primary" onClick={onContinue}>
        Empezar ya
      </button>
    </div>
  )
}
```

Create `src/components/session/Toast.tsx` EXACTLY:

```tsx
import type { ToastEntry } from '../../hooks/useUndoableToast'

export interface ToastProps {
  entry: ToastEntry | null
  onDismiss: () => void
}

/**
 * Single-slot toast renderer. App owns the ToastEntry; this component renders or null.
 * Used primarily for the skip-exercise undo (D-13: 5s).
 */
export function Toast({ entry, onDismiss }: ToastProps) {
  if (!entry) return null
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{entry.message}</span>
      {entry.actionLabel && entry.onAction ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            entry.onAction?.()
          }}
        >
          {entry.actionLabel}
        </button>
      ) : null}
      <button type="button" className="btn" onClick={onDismiss} aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  )
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function HandoffOverlay" src/components/session/HandoffOverlay.tsx` matches
    - `rg "Siguiente: \{nextExerciseName\}" src/components/session/HandoffOverlay.tsx` matches
    - `rg "Empezar ya" src/components/session/HandoffOverlay.tsx` matches
    - `rg "className=\"handoff-overlay\"" src/components/session/HandoffOverlay.tsx` matches
    - `rg "className=\"handoff-overlay__count\"" src/components/session/HandoffOverlay.tsx` matches
    - `rg "Math\.ceil\(msRemaining / 1000\)" src/components/session/HandoffOverlay.tsx` matches
    - `rg "export function Toast" src/components/session/Toast.tsx` matches
    - `rg "className=\"toast\"" src/components/session/Toast.tsx` matches
    - `rg "role=\"status\"" src/components/session/Toast.tsx` matches
    - `rg "import type \{ ToastEntry \}" src/components/session/Toast.tsx` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>Handoff + Toast render with locked copy; both pure-presentational.</done>
</task>

<task type="auto">
  <name>Task 2: PauseDialog.tsx</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" PauseDialog row
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-12 (pause flow)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-13 (discarding loses progress)
    - src/index.css (.pause-dialog, .pause-dialog__card, .pause-dialog__title, .pause-dialog__actions, .btn-danger-outline)
  </read_first>
  <action>
Create `src/components/session/PauseDialog.tsx` EXACTLY:

```tsx
export interface PauseDialogProps {
  /** Total elapsed since session start, in seconds. Display-only. */
  elapsedSeconds: number
  setsCompleted: number
  onResume: () => void
  onDiscard: () => void
}

/**
 * Pause modal. Locked copy per UI-SPEC §Copywriting.
 *
 * D-12: Pause does NOT release Wake Lock here — App handles that via
 * useWakeLock(state.session.status === 'in_progress'). This component just
 * exposes the two human-actionable choices.
 */
export function PauseDialog({ elapsedSeconds, setsCompleted, onResume, onDiscard }: PauseDialogProps) {
  return (
    <div className="pause-dialog" role="dialog" aria-modal="true" aria-labelledby="pause-dialog-title">
      <div className="pause-dialog__card">
        <h2 id="pause-dialog-title" className="pause-dialog__title">Sesión en pausa</h2>
        <p className="hint">
          Llevas {Math.floor(elapsedSeconds / 60)} min · {setsCompleted} sets registrados.
        </p>
        <div className="pause-dialog__actions">
          <button type="button" className="btn btn-primary" onClick={onResume}>
            Reanudar
          </button>
          <button type="button" className="btn btn-danger-outline" onClick={onDiscard}>
            Descartar sesión
          </button>
        </div>
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
    - `rg "export function PauseDialog" src/components/session/PauseDialog.tsx` matches
    - `rg "Sesión en pausa" src/components/session/PauseDialog.tsx` matches
    - `rg "Reanudar" src/components/session/PauseDialog.tsx` matches
    - `rg "Descartar sesión" src/components/session/PauseDialog.tsx` matches
    - `rg "className=\"pause-dialog\"" src/components/session/PauseDialog.tsx` matches
    - `rg "className=\"pause-dialog__card\"" src/components/session/PauseDialog.tsx` matches
    - `rg "aria-modal=\"true\"" src/components/session/PauseDialog.tsx` matches
    - `rg "btn-danger-outline" src/components/session/PauseDialog.tsx` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>PauseDialog provides Resume/Discard with locked copy; a11y compliant.</done>
</task>

<task type="auto">
  <name>Task 3: SummaryScreen.tsx (REST-02 visible)</name>
  <read_first>
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" SummaryScreen row
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Color" (.summary-chip--ok / --warn / --bad usage)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-19 (summary metrics)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-23 (NO completion banner; go straight to summary)
    - src/utils/restDeviation.ts
    - src/utils/formatTime.ts
    - src/persist/schema.ts (Exercise, SessionV3, SnapshotV3)
  </read_first>
  <action>
Create `src/components/session/SummaryScreen.tsx` EXACTLY:

```tsx
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
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "export function SummaryScreen" src/components/session/SummaryScreen.tsx` matches
    - `rg "import \{ computeRestDeviation \}" src/components/session/SummaryScreen.tsx` matches
    - `rg "import \{ formatTime \}" src/components/session/SummaryScreen.tsx` matches
    - `rg "¡Sesión completada!" src/components/session/SummaryScreen.tsx` matches
    - `rg "Tiempo total: " src/components/session/SummaryScreen.tsx` matches
    - `rg "Sets registrados: " src/components/session/SummaryScreen.tsx` matches
    - `rg "Δ descanso: " src/components/session/SummaryScreen.tsx` matches at least once
    - `rg "Δ descanso: —" src/components/session/SummaryScreen.tsx` matches (samples=0 case)
    - `rg "summary-chip--ok" src/components/session/SummaryScreen.tsx` matches
    - `rg "summary-chip--warn" src/components/session/SummaryScreen.tsx` matches
    - `rg "summary-chip--bad" src/components/session/SummaryScreen.tsx` matches
    - `rg "saltado" src/components/session/SummaryScreen.tsx` matches (SESS-04 visible in summary)
    - `rg "'↷'" src/components/session/SummaryScreen.tsx` matches (skipped icon)
    - `rg "'✓'" src/components/session/SummaryScreen.tsx` matches (done icon)
    - `rg "Empezar otra sesión" src/components/session/SummaryScreen.tsx` matches
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>SummaryScreen surfaces all D-19 metrics including REST-02 deviation; per-exercise rows reflect SESS-04 skips.</done>
</task>

</tasks>

<verification>
- All three tasks pass.
- `npx tsc -b` exits 0 across new src/components/session/* files (App.tsx may still error pending plan 02-10).
- All UI-SPEC strings present verbatim.
- Components are pure-presentational: `rg "useReducer|localStorage" src/components/session/HandoffOverlay.tsx src/components/session/Toast.tsx src/components/session/PauseDialog.tsx src/components/session/SummaryScreen.tsx` returns 0 matches.
</verification>

<success_criteria>
The auxiliary session UI surface is complete. SESS-01, SESS-04, and REST-02 each have a visible artifact. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-08-SUMMARY.md` documenting:
- Component prop tables (HandoffOverlay, Toast, PauseDialog, SummaryScreen)
- Copy strings used (verbatim list with UI-SPEC § cite)
- Files modified
- D-22 compliance confirmed
</output>
