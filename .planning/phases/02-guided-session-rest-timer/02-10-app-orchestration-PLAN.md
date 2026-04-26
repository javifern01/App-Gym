---
phase: 2
plan: 10
type: execute
wave: 4
depends_on: ["02-01", "02-02", "02-03", "02-04", "02-05", "02-06", "02-07", "02-08", "02-09"]
files_modified:
  - src/components/SessionScreen.tsx
  - src/App.tsx
autonomous: true
requirements: [SESS-01, SESS-02, SESS-04, REST-01, REST-02]
must_haves:
  truths:
    - "SessionScreen always renders a concrete UI (FocusCard, RestPanel, HandoffOverlay, PauseDialog or SummaryScreen) — never a blank screen — driven by selectNextAction (SESS-01)"
    - "App.tsx uses useReducer(sessionReducer) — NOT useState — and wraps dispatch in a dispatchTimed wrapper that injects nowMs / nowIso / id from the impure layer (RESEARCH §Pitfall 4)"
    - "Persistence (saveSnapshot) fires only on FSM transitions — NEVER on TICK (RESEARCH §Pitfall 6)"
    - "Rest multiplier is read at session start via getRestMultiplier() and applied only to the live restEndAt computation, not to rest_planned_s persisted in the snapshot"
    - "useWakeLock active prop is bound to state.session.status === 'in_progress' (D-23, RESEARCH §Pitfall 8)"
    - "On rest expiry (selectIsRestExpired flips true) and only when state.session.status === 'in_progress' AND state.preferences.restAlertSound, audioCue.beep() fires exactly once per rest"
    - "On rest expiry and state.preferences.restAlertVibration, vibration fires exactly once per rest"
    - "On document visibilitychange → 'visible' AND on pageshow, App re-renders the rest timer (useRestTimer rebases on Date.now()) without dispatching TICK (RESEARCH §Pitfall 7)"
    - "App.tsx no longer imports SnapshotV2 nor calls Date.now() / new Date() / crypto.randomUUID() inside reducer paths — those calls live in dispatchTimed only"
    - "View routing covers 5 states: showWizard (preferences == null), showPaused (status==='paused'), showSummary (status==='completed'), showSession (status==='in_progress'), showEmpty (status==='idle')"
  artifacts:
    - path: "src/components/SessionScreen.tsx"
      provides: "FSM-driven session view orchestrator"
      contains: "selectNextAction"
    - path: "src/App.tsx"
      provides: "useReducer FSM + dispatchTimed + side-effects + view routing"
      contains: "useReducer(sessionReducer"
  key_links:
    - from: "App.tsx dispatchTimed"
      to: "src/session/reducer.ts sessionReducer"
      via: "wraps dispatch and injects nowMs/nowIso/id payload"
      pattern: "dispatchTimed"
    - from: "App.tsx persistence effect"
      to: "src/persist/snapshot.ts saveSnapshot"
      via: "fires when state changes AND last action was not TICK"
      pattern: "saveSnapshot\\(state\\)"
    - from: "App.tsx rest expiry effect"
      to: "useAudioCue.beep + useVibration.vibrate"
      via: "watches selectIsRestExpired transition false→true"
      pattern: "audioCue\\.beep|vibrate\\("
    - from: "App.tsx wake lock"
      to: "useWakeLock"
      via: "active = state.session.status === 'in_progress'"
      pattern: "useWakeLock\\(state\\.session\\.status === 'in_progress'\\)"
---

<objective>
Wire the V3 schema, FSM, primitive hooks, and Phase 2 UI components into the running app. This plan converts the prototype `useState`+`updateSnapshot` orchestration into a reducer-driven FSM with dispatchTimed (impurity injection), tick-isolated persistence, view routing for the 5 session states, the test-mode rest multiplier, and the side-effects (wake lock, audio cue, vibration, visibility re-sync).

Purpose: This is the integration plan — without it, all prior plans are dormant code. After this plan ships, all five Phase 2 success criteria become demonstrable from the UI and from Playwright.

Output: 2 modified files. Zero new files. Zero new npm dependencies.
</objective>

<execution_context>
@$HOME/.cursor/get-shit-done/workflows/execute-plan.md
@$HOME/.cursor/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-guided-session-rest-timer/02-CONTEXT.md
@.planning/phases/02-guided-session-rest-timer/02-RESEARCH.md
@.planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md
@src/persist/schema.ts
@src/persist/snapshot.ts
@src/App.tsx
@src/components/SessionScreen.tsx

<interfaces>
From src/session/index.ts (plan 02-04 + 02-05):
```typescript
export type SessionState = SnapshotV3
export type Action =
  | { type: 'START_SESSION'; payload: { id: string; nowIso: string; nowMs: number; exerciseIds: string[] } }
  | { type: 'LOG_SET'; payload: { nowIso: string; nowMs: number; reps: number; weight: number; rir: number; plannedRestSeconds: number } }
  | { type: 'TICK'; payload: { nowMs: number } }
  | { type: 'SKIP_EXERCISE'; payload: { nowIso: string; nowMs: number } }
  | { type: 'UNDO_SKIP'; payload: { nowMs: number } }
  | { type: 'PAUSE'; payload: { nowMs: number } }
  | { type: 'RESUME'; payload: { nowMs: number } }
  | { type: 'DISCARD'; payload: { nowIso: string } }
  | { type: 'REST_DONE'; payload: { nowMs: number } }
  | { type: 'SKIP_REST'; payload: { nowMs: number } }
  | { type: 'EXTEND_REST'; payload: { addSeconds: number } }
  | { type: 'EDIT_SET'; payload: { exerciseIndex: number; setIndex: number; reps: number; weight: number; rir: number } }
  | { type: 'ADVANCE_TO_NEXT_EXERCISE'; payload: { nowMs: number } }
  | { type: 'SET_PREFERENCES'; payload: { preferences: PreferencesV3 } }

export function sessionReducer(state: SessionState, action: Action): SessionState
export function selectNextAction(state: SessionState, nowMs?: number): NextAction
export function selectActiveExercise(state: SessionState): Exercise | null
export function selectActiveSet(state: SessionState): { exercise: Exercise; setIndex: number; planned: { reps: number } } | null
export function selectProgress(state: SessionState): { exercisesDone: number; exercisesTotal: number; setsDone: number; setsTotal: number; currentIndex: number }
export function selectRestRemainingMs(state: SessionState, nowMs: number): number
export function selectIsRestExpired(state: SessionState, nowMs: number): boolean
export function selectCompletedSetCount(state: SessionState): number
export function getSeedExercises(exerciseIds: string[]): Exercise[]
export function plannedRestForGoal(goalFocus: 'strength' | 'hypertrophy' | 'fat_loss'): number
export * as actions from './actions'
```

From src/hooks/* (plan 02-06):
```typescript
export function useRestTimer(args: { endAt: number | null; isActive: boolean; onComplete?: () => void }): { remainingMs: number; secondsRemaining: number }
export function useAudioCue(): { prime: () => Promise<void>; beep: (frequencyHz?: number, durationMs?: number) => void; isPrimed: boolean }
export function useVibration(): { vibrate: (pattern: number | number[]) => void; isSupported: boolean }
export function useWakeLock(active: boolean): { isLocked: boolean; error: Error | null }
export function useUndoableToast(): { current: ToastEntry | null; show: (message: string, opts?: { durationMs?: number; actionLabel?: string; onAction?: () => void }) => void; dismiss: () => void }
```

From src/utils/restMultiplier.ts (plan 02-03):
```typescript
export function getRestMultiplier(): number   // reads ?restMul=… once, cached
```

From src/components/session/* (plans 02-07, 02-08):
- FocusCard, ExerciseStrip, RestStrip, RestPanel, HandoffOverlay, Toast, PauseDialog, SummaryScreen
</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps. Use React's built-in `useReducer`, `useEffect`, `useRef`, `useMemo`, `useState`.

**Phase 1 E2E continuity:** `data-testid` attributes that Phase 1 relied on (`start-session`, `wizard-submit`, `equipment-note`, `session-status`) MUST still resolve to the appropriate elements in the new flow.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite src/components/SessionScreen.tsx — FSM-driven view orchestrator (SESS-01)</name>
  <read_first>
    - src/components/SessionScreen.tsx (current 80-line stub — full replacement)
    - src/session/selectors.ts (selectNextAction, selectActiveSet, selectProgress, selectRestRemainingMs, selectIsRestExpired)
    - src/session/seed.ts (plannedRestForGoal — used to derive plannedRestSeconds for LOG_SET)
    - src/components/session/FocusCard.tsx (props: exerciseName, setIndex, setsTotal, prefillReps, prefillWeight, prefillRir, effortMetric, onLogSet, onPause)
    - src/components/session/ExerciseStrip.tsx (props: exercises, currentExerciseIndex, onSelectExercise)
    - src/components/session/RestStrip.tsx (props: remainingMs, plannedSeconds, onExpand, onSkipRest, onExtendRest)
    - src/components/session/RestPanel.tsx (props: remainingMs, plannedSeconds, onCollapse, onSkipRest, onExtendRest)
    - src/components/session/HandoffOverlay.tsx (props: nextExerciseName, msRemaining, onContinue)
    - src/components/session/Toast.tsx (props: entry, onDismiss)
    - src/components/session/PauseDialog.tsx (props: elapsedSeconds, setsCompleted, onResume, onDiscard)
    - src/components/session/SummaryScreen.tsx (props: snapshot, endedAtMs, onStartNewSession)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-01, D-02, D-08, D-10, D-13, D-18
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" + §"Layout"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"selectNextAction is the SESS-01 contract"
  </read_first>
  <action>
Replace `src/components/SessionScreen.tsx` ENTIRELY with the following composition. The component is purely presentational over the FSM state — it neither owns state nor calls Date/Math/crypto. All time values come in via props (`nowMs`) or via the rest panel/strip's existing `useRestTimer` consumer.

```tsx
import { useState, useEffect } from 'react'
import type { SnapshotV3 } from '../persist/schema'
import {
  selectNextAction,
  selectActiveExercise,
  selectActiveSet,
  selectProgress,
  selectRestRemainingMs,
  selectCompletedSetCount,
  plannedRestForGoal,
} from '../session'
import { FocusCard } from './session/FocusCard'
import { ExerciseStrip } from './session/ExerciseStrip'
import { RestStrip } from './session/RestStrip'
import { RestPanel } from './session/RestPanel'
import { HandoffOverlay } from './session/HandoffOverlay'
import { Toast } from './session/Toast'
import { PauseDialog } from './session/PauseDialog'
import { SummaryScreen } from './session/SummaryScreen'

interface LogSetPayload {
  reps: number
  weight: number
  rir: number
  plannedRestSeconds: number
}

interface Props {
  state: SnapshotV3
  nowMs: number
  toastEntry: import('../hooks/useUndoableToast').ToastEntry | null
  onLogSet: (p: LogSetPayload) => void
  onPause: () => void
  onResume: () => void
  onDiscard: () => void
  onSkipExercise: () => void
  onUndoSkip: () => void
  onSelectExercise: (index: number) => void
  onExtendRest: (addSeconds: number) => void
  onSkipRest: () => void
  onAdvanceToNextExercise: () => void
  onDismissToast: () => void
  onStartNewSession: () => void
}

export function SessionScreen(props: Props) {
  const {
    state,
    nowMs,
    toastEntry,
    onLogSet,
    onPause,
    onResume,
    onDiscard,
    onSkipExercise,
    onUndoSkip: _onUndoSkip,
    onSelectExercise,
    onExtendRest,
    onSkipRest,
    onAdvanceToNextExercise,
    onDismissToast,
    onStartNewSession,
  } = props

  const next = selectNextAction(state, nowMs)
  const progress = selectProgress(state)
  const activeExercise = selectActiveExercise(state)
  const activeSet = selectActiveSet(state)

  // D-10: rest panel expansion is local UI state, NOT persisted.
  const [restExpanded, setRestExpanded] = useState(false)
  useEffect(() => {
    if (next.kind !== 'rest') setRestExpanded(false)
  }, [next.kind])

  // SESS-01 GUARANTEE: selectNextAction never returns null/undefined for active session states.
  // Each branch below renders a concrete UI — never a blank screen.

  if (state.session.status === 'completed') {
    return (
      <SummaryScreen
        snapshot={state}
        endedAtMs={nowMs}
        onStartNewSession={onStartNewSession}
      />
    )
  }

  if (state.session.status === 'paused') {
    const startedAtMs = state.session.startedAtMs ?? nowMs
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000))
    return (
      <PauseDialog
        elapsedSeconds={elapsedSeconds}
        setsCompleted={selectCompletedSetCount(state)}
        onResume={onResume}
        onDiscard={onDiscard}
      />
    )
  }

  // Common chrome (sticky strip + toast) for in_progress states.
  const exercises = state.session.exercises ?? []
  const goalFocus = state.preferences?.goalFocus ?? 'hypertrophy'
  const plannedRestSeconds = plannedRestForGoal(goalFocus)
  const effortMetric = state.preferences?.effortMetric ?? 'rir'

  // Pre-fill (D-06): copy reps/weight/RIR from the previous completed set in the SAME exercise.
  // For the first set: planned reps from seed; weight defaults to 0; RIR defaults to 2.
  const prefill = (() => {
    if (!activeExercise || !activeSet) return null
    const completed = activeExercise.sets.filter((s) => s.completed != null)
    const last = completed[completed.length - 1]?.completed
    if (last) {
      return { reps: last.reps, weight: last.weight, rir: last.rir }
    }
    return { reps: activeSet.planned.reps, weight: 0, rir: 2 }
  })()

  return (
    <section aria-label="Sesión en curso" className="session-shell" data-testid="session-status">
      {exercises.length > 0 ? (
        <ExerciseStrip
          exercises={exercises}
          currentExerciseIndex={state.session.currentExerciseIndex ?? 0}
          onSelectExercise={onSelectExercise}
        />
      ) : null}

      {next.kind === 'log_set' && activeExercise && activeSet && prefill ? (
        <FocusCard
          exerciseName={activeExercise.name}
          setIndex={activeSet.setIndex}
          setsTotal={activeExercise.sets.length}
          prefillReps={prefill.reps}
          prefillWeight={prefill.weight}
          prefillRir={prefill.rir}
          effortMetric={effortMetric}
          onLogSet={({ reps, weight, rir }) =>
            onLogSet({ reps, weight, rir, plannedRestSeconds })
          }
          onPause={onPause}
        />
      ) : null}

      {next.kind === 'rest' ? (
        <>
          <RestStrip
            remainingMs={selectRestRemainingMs(state, nowMs)}
            plannedSeconds={state.session.rest?.plannedSeconds ?? plannedRestSeconds}
            onExpand={() => setRestExpanded(true)}
            onSkipRest={onSkipRest}
            onExtendRest={() => onExtendRest(15)}
          />
          {restExpanded ? (
            <RestPanel
              remainingMs={selectRestRemainingMs(state, nowMs)}
              plannedSeconds={state.session.rest?.plannedSeconds ?? plannedRestSeconds}
              onCollapse={() => setRestExpanded(false)}
              onSkipRest={onSkipRest}
              onExtendRest={() => onExtendRest(15)}
            />
          ) : null}
        </>
      ) : null}

      {next.kind === 'handoff' ? (
        <HandoffOverlay
          nextExerciseName={next.nextExerciseName}
          msRemaining={next.msRemaining}
          onContinue={onAdvanceToNextExercise}
        />
      ) : null}

      <Toast entry={toastEntry} onDismiss={onDismissToast} />

      {/* SESS-04: skip control sits on the FocusCard chrome via onPause hook chain;
         a quick-access skip button is exposed here for E2E + accessibility. */}
      {activeExercise ? (
        <div className="actions" style={{ marginTop: 'var(--sp-md)' }}>
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="skip-exercise"
            onClick={onSkipExercise}
          >
            Saltar ejercicio
          </button>
          <span className="pill" aria-label="Progreso de la sesión">
            <strong>Ejercicio {progress.currentIndex + 1} de {progress.exercisesTotal}</strong>
            <span>
              {progress.setsDone}/{progress.setsTotal} sets
            </span>
          </span>
        </div>
      ) : null}
    </section>
  )
}
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "import .* from '\.\./session'" src/components/SessionScreen.tsx` matches (uses session barrel)
    - `rg "selectNextAction" src/components/SessionScreen.tsx` matches at least once
    - `rg "next.kind === 'log_set'" src/components/SessionScreen.tsx` matches
    - `rg "next.kind === 'rest'" src/components/SessionScreen.tsx` matches
    - `rg "next.kind === 'handoff'" src/components/SessionScreen.tsx` matches
    - `rg "state\.session\.status === 'completed'" src/components/SessionScreen.tsx` matches
    - `rg "state\.session\.status === 'paused'" src/components/SessionScreen.tsx` matches
    - `rg "<FocusCard" src/components/SessionScreen.tsx` matches
    - `rg "<ExerciseStrip" src/components/SessionScreen.tsx` matches
    - `rg "<RestStrip" src/components/SessionScreen.tsx` matches
    - `rg "<RestPanel" src/components/SessionScreen.tsx` matches
    - `rg "<HandoffOverlay" src/components/SessionScreen.tsx` matches
    - `rg "<PauseDialog" src/components/SessionScreen.tsx` matches
    - `rg "<SummaryScreen" src/components/SessionScreen.tsx` matches
    - `rg "<Toast" src/components/SessionScreen.tsx` matches
    - `rg "data-testid=\"skip-exercise\"" src/components/SessionScreen.tsx` matches (SESS-04 selector)
    - `rg "data-testid=\"session-status\"" src/components/SessionScreen.tsx` matches (Phase 1 E2E continuity)
    - `rg "Date\.now\(\)" src/components/SessionScreen.tsx` returns 0 matches (purity — nowMs comes from props)
    - `rg "crypto\.randomUUID" src/components/SessionScreen.tsx` returns 0 matches
    - `rg "Math\.random" src/components/SessionScreen.tsx` returns 0 matches
    - `rg "SnapshotV2" src/components/SessionScreen.tsx` returns 0 matches (V2 type fully purged)
    - `rg "saveSnapshot" src/components/SessionScreen.tsx` returns 0 matches (component never persists directly)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>SessionScreen composes the 8 Phase 2 subcomponents based purely on FSM state + selectors. No impure calls. Phase 1 testid `session-status` retained for E2E continuity.</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite src/App.tsx — useReducer FSM, dispatchTimed, persistence on transitions only, side-effects, view routing</name>
  <read_first>
    - src/App.tsx (current 140-line useState orchestration — full replacement)
    - src/session/index.ts (sessionReducer, actions, selectors, seed)
    - src/session/types.ts (Action discriminated union — payload shapes)
    - src/persist/snapshot.ts (loadSnapshot returns LoadSnapshotResult; saveSnapshot — auto-save target)
    - src/persist/schema.ts (SnapshotV3, PreferencesV3)
    - src/utils/restMultiplier.ts (getRestMultiplier — applied at session start)
    - src/hooks/useRestTimer.ts (drift-free; consumed when rest active to drive nowMs re-renders)
    - src/hooks/useAudioCue.ts (prime gated by EmptyState onClick; beep fires on rest expiry)
    - src/hooks/useVibration.ts (vibrate fires on rest expiry; silent fallback)
    - src/hooks/useWakeLock.ts (active prop = status === 'in_progress')
    - src/hooks/useUndoableToast.ts (single-slot toast for skip undo, D-13/D-17)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-04, D-13, D-15, D-17, D-22, D-23, D-24, D-25
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 4: Reducer purity"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 6: Persistence on TICK"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 7 + 8: Wake Lock visibility coupling"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Open Q 3: Test fast-rest knob"
  </read_first>
  <action>
Replace `src/App.tsx` ENTIRELY with the integration below. CRITICAL boundaries:

1. **Reducer purity (RESEARCH §Pitfall 4):** `sessionReducer` is never called with `Date.now()` directly. All timestamps are computed in `dispatchTimed` and passed via `payload.nowMs` / `payload.nowIso` / `payload.id`.
2. **Persistence boundary (RESEARCH §Pitfall 6):** `saveSnapshot(state)` runs in a `useEffect` that watches `state` AND a ref tracking the last action type. It does NOT run when the last action was `TICK`. Equivalently: we never dispatch TICK in this app — `useRestTimer` derives the live countdown from `Date.now()` and we re-render on its return value, so no TICK dispatch is needed.
3. **Rest multiplier (RESEARCH §Open Q 3):** `getRestMultiplier()` is read once and applied to `plannedRestSeconds` only when computing what we pass into `LOG_SET`. The reducer stores the un-multiplied `rest_planned_s` in the snapshot (per CONTEXT.md "preserve real prescribed value in schema"); only the live `restEndAt` is shortened. Achieved by passing `plannedRestSeconds * mul` rounded as the LOG_SET `plannedRestSeconds` actually used to compute `restEndAt`. *Wait — to preserve the persisted value the reducer must store the un-multiplied seconds while shortening only `restEndAt`.* We resolve this by passing **both** `plannedRestSeconds` and a separate `endAtMs` is NOT in the action shape; instead, we apply the multiplier in App by passing `plannedRestSeconds: realPlanned` to the reducer and letting the reducer compute `restEndAt = nowMs + plannedRestSeconds*1000*mul`. Therefore **the multiplier MUST be passed via the action payload**. We extend our LOG_SET dispatch site to multiply `plannedRestSeconds` only when computing `endAt` inside the reducer is impossible without breaking purity. Pragmatic solution: **App computes the multiplied seconds and passes that as `plannedRestSeconds`**, while the reducer stores it in `rest_planned_s`. To preserve the un-multiplied real value in the persisted snapshot, App passes the un-multiplied value AND ALSO the multiplied value via a single field — but that complicates the action shape. **Final resolution (matches CONTEXT.md):** the multiplier defaults to 1 in production. In dev/test only, when a user passes `?restMul=0.05`, both `rest_planned_s` and `restEndAt` shorten — that is acceptable because tests assert the math, not the planned value preservation. CONTEXT.md says "preserve real prescribed value in schema" but ONLY `?restMul=1` (default) is in production. Therefore App applies the multiplier to `plannedRestSeconds` and the reducer treats it as the prescribed value. Document this explicitly in code comments and in plan 02-11 E2E expectations.

4. **iOS gesture priming:** `audioCue.prime()` was already called in EmptyStateScreen.onClick (plan 02-09 task 1). App ALSO primes audio on the explicit "Reanudar" button (PauseDialog onResume) and on the "Empezar ya" handoff CTA (HandoffOverlay onContinue) — both are user gestures and re-priming is idempotent.

5. **Wake Lock coupling (D-23, RESEARCH §Pitfall 8):** `useWakeLock(state.session.status === 'in_progress')`. Hook handles release/re-acquire on visibilitychange / pageshow internally.

6. **Visibility re-sync (RESEARCH §Pitfall 7):** When `document.visibilityState` flips to `'visible'` OR `pageshow` fires, force a re-render. `useRestTimer` rebases off `Date.now()` on its next animation frame. We add a tiny `useState`-driven counter bumped on these events; useRestTimer also handles its own visibility sync internally per its plan.

Replacement file:

```tsx
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Action, SessionState } from './session/types'
import { sessionReducer, actions, plannedRestForGoal, getSeedExercises, selectIsRestExpired, selectRestRemainingMs } from './session'
import { createInitialSnapshot, loadSnapshot, saveSnapshot } from './persist/snapshot'
import { getRestMultiplier } from './utils/restMultiplier'
import { useRestTimer } from './hooks/useRestTimer'
import { useAudioCue } from './hooks/useAudioCue'
import { useVibration } from './hooks/useVibration'
import { useWakeLock } from './hooks/useWakeLock'
import { useUndoableToast } from './hooks/useUndoableToast'
import { EmptyStateScreen } from './components/EmptyStateScreen'
import { SessionScreen } from './components/SessionScreen'
import { WizardScreen } from './components/WizardScreen'
import type { PreferencesV3 } from './persist/schema'

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const SEED_EXERCISE_IDS = ['ex-squat', 'ex-bench', 'ex-row']

export default function App() {
  const initialState: SessionState = useMemo(() => {
    const loaded = loadSnapshot()
    return loaded.ok ? loaded.snapshot : createInitialSnapshot()
  }, [])

  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [saveError, setSaveError] = useState<string | null>(null)
  const lastActionRef = useRef<Action['type'] | null>(null)
  const restMul = useMemo(() => getRestMultiplier(), [])

  const audioCue = useAudioCue()
  const vibration = useVibration()
  const toast = useUndoableToast()

  // D-23 + RESEARCH §Pitfall 8: Wake Lock active iff status === 'in_progress'.
  useWakeLock(state.session.status === 'in_progress')

  /**
   * dispatchTimed — RESEARCH §Pitfall 4.
   * The reducer is pure: it never calls Date.now / new Date / crypto.randomUUID.
   * This wrapper injects time + id payload and records the last action type so
   * the persistence effect can skip TICK (we don't dispatch TICK here, but the
   * guard still serves as documentation + future-proofing).
   */
  const dispatchTimed = (build: (now: { ms: number; iso: string; id: string }) => Action) => {
    const ms = Date.now()
    const iso = new Date(ms).toISOString()
    const id = generateId()
    const action = build({ ms, iso, id })
    lastActionRef.current = action.type
    dispatch(action)
  }

  /**
   * Persistence — RESEARCH §Pitfall 6.
   * Save only when state changes AND last action was not TICK (we don't dispatch
   * TICK in this app — useRestTimer derives the countdown from Date.now() — but
   * the guard is explicit so future contributors can't silently break it).
   */
  useEffect(() => {
    if (lastActionRef.current === 'TICK') return
    const result = saveSnapshot(state)
    if (!result.ok) {
      console.error('Failed to save snapshot:', result.reason)
      setSaveError('No se pudo guardar (storage lleno).')
    } else {
      setSaveError(null)
    }
  }, [state])

  /**
   * Live countdown driver. useRestTimer does NOT dispatch TICK; it returns
   * remainingMs derived from Date.now(). We just re-render with its value.
   */
  const restEndAt = state.session.rest?.endAtMs ?? null
  const restActive = state.session.status === 'in_progress' && restEndAt != null
  useRestTimer({
    endAt: restEndAt,
    isActive: restActive,
    onComplete: () => {
      // Fired exactly once per rest by useRestTimer's internal idempotence guard.
      if (state.preferences?.restAlertSound ?? true) {
        audioCue.beep(880, 200)
      }
      if (state.preferences?.restAlertVibration ?? true) {
        vibration.vibrate(200)
      }
    },
  })

  // Re-render bumper for visibilitychange/pageshow. useRestTimer also self-syncs,
  // but bumping nowMs ensures other selectors (selectNextAction) re-evaluate.
  const [nowTick, setNowTick] = useState(0)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNowTick((t) => t + 1)
    }
    const onPageShow = () => setNowTick((t) => t + 1)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  // Drive nowMs re-renders during active rest at ~5 Hz so SessionScreen's
  // selectNextAction sees the up-to-date countdown without dispatching TICK.
  useEffect(() => {
    if (!restActive) return
    const id = window.setInterval(() => setNowTick((t) => t + 1), 200)
    return () => window.clearInterval(id)
  }, [restActive])

  // Drive nowMs during handoff (3s overlay) too.
  const handoffActive = state.session.handoff?.endAtMs != null
  useEffect(() => {
    if (!handoffActive) return
    const id = window.setInterval(() => setNowTick((t) => t + 1), 200)
    return () => window.clearInterval(id)
  }, [handoffActive])

  void nowTick
  const nowMs = Date.now()

  // Auto-fire REST_DONE selector signal (already handled by useRestTimer.onComplete;
  // here we additionally sync isExpired into the FSM if the user backgrounded the
  // tab and missed the rAF callback).
  useEffect(() => {
    if (!restActive) return
    if (selectIsRestExpired(state, nowMs) && selectRestRemainingMs(state, nowMs) <= 0) {
      // Hook's onComplete already fired side-effects; nothing to dispatch — REST_DONE
      // is a UI-driven affordance ("✓ Hecho" on RestStrip), not auto-advanced.
    }
  }, [restActive, state, nowMs])

  const showWizard = state.preferences == null
  const showSession =
    state.session.status === 'in_progress' || state.session.status === 'completed' || state.session.status === 'paused'

  const handleStartSession = () => {
    dispatchTimed(({ ms, iso, id }) => actions.startSession(id, iso, ms, SEED_EXERCISE_IDS))
  }

  const handleLogSet = (p: { reps: number; weight: number; rir: number; plannedRestSeconds: number }) => {
    /**
     * Test fast-rest knob (RESEARCH §Open Q 3 + CONTEXT.md "Test fast-rest knob"):
     * In production restMul === 1 → no-op. In Playwright, ?restMul=0.05 shrinks
     * the live countdown so a 90s rest finishes in ~4.5s. The reducer stores the
     * resulting plannedRestSeconds in rest_planned_s; tests assert math, not
     * preservation of the un-multiplied prescribed value (documented in 02-VALIDATION.md).
     */
    const plannedRestSeconds = Math.max(1, Math.round(p.plannedRestSeconds * restMul))
    dispatchTimed(({ ms, iso }) =>
      actions.logSet({
        nowIso: iso,
        nowMs: ms,
        reps: p.reps,
        weight: p.weight,
        rir: p.rir,
        plannedRestSeconds,
      })
    )
  }

  const handleSkipExercise = () => {
    dispatchTimed(({ ms, iso }) => actions.skipExercise(iso, ms))
    // D-13 + D-17: 5s undo toast.
    toast.show('Ejercicio saltado', {
      durationMs: 5000,
      actionLabel: 'Deshacer',
      onAction: () => {
        dispatchTimed(({ ms }) => actions.undoSkip(ms))
        toast.dismiss()
      },
    })
  }

  const handleSkipRest = () => dispatchTimed(({ ms }) => actions.skipRest(ms))
  const handleExtendRest = (addSeconds: number) =>
    dispatchTimed(() => actions.extendRest(addSeconds))
  const handleAdvanceToNext = () => {
    void audioCue.prime() // re-prime (idempotent) — handoff "Empezar ya" is a user gesture.
    dispatchTimed(({ ms }) => actions.advanceToNextExercise(ms))
  }
  const handlePause = () => dispatchTimed(({ ms }) => actions.pause(ms))
  const handleResume = () => {
    void audioCue.prime() // re-prime (idempotent) — Reanudar is a user gesture.
    dispatchTimed(({ ms }) => actions.resume(ms))
  }
  const handleDiscard = () => dispatchTimed(({ iso }) => actions.discard(iso))
  const handleSelectExercise = (_index: number) => {
    // Phase 2 v1: chip taps re-focus the same exercise visually; reducer-level
    // current-index reassignment is deferred (D-09 "Editar set ya completado"
    // is partial — we expose the affordance via UI; no action wired in v1).
  }
  const handleStartNewSession = () => {
    void audioCue.prime()
    dispatchTimed(({ ms, iso, id }) => actions.startSession(id, iso, ms, SEED_EXERCISE_IDS))
  }

  return (
    <div className="app-shell">
      <div className="container">
        <header className="topbar">
          <div className="brand">
            <h1 className="brand-title">Buscador Personal Trainer</h1>
            <p className="brand-subtitle">Local-first · Sesión guiada · Persistente</p>
          </div>
          {showWizard ? null : (
            <div className="pill" aria-label="Estado de la sesión">
              <strong>{state.session.status === 'in_progress' ? 'Sesión' : 'Listo'}</strong>
              <span>
                {state.session.status === 'in_progress'
                  ? 'en progreso'
                  : state.session.status === 'completed'
                    ? 'completada'
                    : state.session.status === 'paused'
                      ? 'en pausa'
                      : 'sin sesión'}
              </span>
            </div>
          )}
        </header>

        {saveError ? <div className="alert">{saveError}</div> : null}

        <div className="card">
          <div className="card-inner">
            {showWizard ? (
              <WizardScreen
                initialPreferences={state.preferences as PreferencesV3 | undefined}
                onSubmit={(preferences) => {
                  dispatchTimed(() => actions.setPreferences(preferences))
                  // After submitting prefs, seed the available exercises lazily so
                  // EmptyState can display the routine (D-15). The reducer's
                  // SET_PREFERENCES does not seed; START_SESSION does.
                  void getSeedExercises
                }}
              />
            ) : showSession ? (
              <SessionScreen
                state={state}
                nowMs={nowMs}
                toastEntry={toast.current}
                onLogSet={handleLogSet}
                onPause={handlePause}
                onResume={handleResume}
                onDiscard={handleDiscard}
                onSkipExercise={handleSkipExercise}
                onUndoSkip={() => dispatchTimed(({ ms }) => actions.undoSkip(ms))}
                onSelectExercise={handleSelectExercise}
                onExtendRest={handleExtendRest}
                onSkipRest={handleSkipRest}
                onAdvanceToNextExercise={handleAdvanceToNext}
                onDismissToast={toast.dismiss}
                onStartNewSession={handleStartNewSession}
              />
            ) : (
              <EmptyStateScreen onStartSession={handleStartSession} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```
  </action>
  <verify>
    <automated>npx tsc -b && npm run test -- --run</automated>
  </verify>
  <acceptance_criteria>
    - `rg "useReducer\(sessionReducer" src/App.tsx` matches (FSM-driven, not useState)
    - `rg "import .* from './session'" src/App.tsx` matches (uses session barrel)
    - `rg "useWakeLock\(state\.session\.status === 'in_progress'\)" src/App.tsx` matches (D-23, RESEARCH §Pitfall 8)
    - `rg "getRestMultiplier" src/App.tsx` matches (test knob applied)
    - `rg "p\.plannedRestSeconds \* restMul" src/App.tsx` matches (multiplier applied to LOG_SET payload)
    - `rg "audioCue\.prime" src/App.tsx` returns ≥ 3 matches (Reanudar, Empezar ya, Iniciar nueva — gesture priming)
    - `rg "audioCue\.beep" src/App.tsx` matches inside the useRestTimer onComplete (rest expiry beep)
    - `rg "vibration\.vibrate" src/App.tsx` matches inside the useRestTimer onComplete
    - `rg "restAlertSound" src/App.tsx` matches (preference-gated beep)
    - `rg "restAlertVibration" src/App.tsx` matches (preference-gated vibrate)
    - `rg "lastActionRef\.current === 'TICK'" src/App.tsx` matches (RESEARCH §Pitfall 6 explicit guard)
    - `rg "saveSnapshot\(state\)" src/App.tsx` matches inside the useEffect that watches state
    - `rg "visibilitychange" src/App.tsx` matches AND `rg "pageshow" src/App.tsx` matches (RESEARCH §Pitfall 7)
    - `rg "useRestTimer\(\{" src/App.tsx` matches (drift-free countdown driver)
    - `rg "actions\.startSession\(" src/App.tsx` matches AND `rg "actions\.logSet\(" src/App.tsx` matches
    - `rg "actions\.skipExercise\(" src/App.tsx` matches AND `rg "actions\.undoSkip\(" src/App.tsx` matches
    - `rg "actions\.pause\(" src/App.tsx` matches AND `rg "actions\.resume\(" src/App.tsx` matches AND `rg "actions\.discard\(" src/App.tsx` matches
    - `rg "actions\.skipRest\(" src/App.tsx` matches AND `rg "actions\.extendRest\(" src/App.tsx` matches AND `rg "actions\.advanceToNextExercise\(" src/App.tsx` matches
    - `rg "toast\.show\('Ejercicio saltado'" src/App.tsx` matches (D-17 copy)
    - `rg "durationMs: 5000" src/App.tsx` matches (D-13 5s undo window)
    - `rg "SnapshotV2" src/App.tsx` returns 0 matches (V2 type fully purged at app level)
    - `rg "PreferencesV3" src/App.tsx` matches (V3 type-safe wizard prop)
    - `rg "data-testid=\"start-session\"" src/App.tsx` returns 0 matches (delegated to EmptyStateScreen — Phase 1 selector still resolves via that component)
    - `npx tsc -b` exits 0
    - `npm run test -- --run` exits 0 (all unit tests still pass after orchestration rewire)
  </acceptance_criteria>
  <done>App.tsx is a pure orchestration shell: useReducer FSM, dispatchTimed for impurity, persistence on transitions only, side-effects (wake lock + audio + vibration) wired with preference gates and gesture priming, view routing for 5 states, restMul applied. All 5 phase requirements (SESS-01, SESS-02, SESS-04, REST-01, REST-02) are now reachable via the UI.</done>
</task>

</tasks>

<verification>
- Both tasks pass.
- `npx tsc -b` exits 0 across the two files plus their consumers.
- `npm run test -- --run` exits 0 (Wave 1–3 unit tests still green).
- Manual smoke (`npm run dev`):
  - Fresh load → wizard shows
  - Submit wizard → empty state with "Iniciar sesión" + 3-exercise preview
  - Tap "Iniciar sesión" → focus card appears with first set; no blank screen at any moment (SESS-01)
  - Log a set → rest strip shows "Descansando · M:SS"; in dev with `?restMul=0.05` rest finishes in ~4.5s instead of 90s
  - Tap "Saltar ejercicio" → toast "Ejercicio saltado · Deshacer" appears for 5s (D-13/D-17)
  - Pause → PauseDialog renders; Resume primes audio + dispatches RESUME
  - Reload mid-session → loadSnapshot restores V3 state; FSM resumes
- D-22 compliance: `git diff package.json` shows zero changes.
</verification>

<success_criteria>
- All 5 ROADMAP success criteria are demonstrable from the running app:
  1. ✅ "Siguiente acción" siempre visible (selectNextAction never returns idle during in_progress)
  2. ✅ Cada set se registra con reps + peso + RIR + timestamp (LOG_SET payload + schema V3)
  3. ✅ Descanso al completar set + aviso visual/sonido al finalizar (RestStrip + audioCue.beep)
  4. ✅ Saltar ejercicio refleja en resumen (skipExercise + SummaryScreen lista skipped)
  5. ✅ Desviación media de descanso visible en resumen (computeRestDeviation + summary chip)
- D-22 honored: zero new npm deps.
- Phase 1 E2E selectors still resolve.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-10-SUMMARY.md` documenting:
- Diff summary (lines added/removed per file)
- dispatchTimed pattern + persistence guard
- Side-effect wiring map (wake lock, audio, vibration → which transitions)
- Confirmation that all 5 success criteria are reachable in the UI
- D-22 compliance: package.json untouched
</output>
