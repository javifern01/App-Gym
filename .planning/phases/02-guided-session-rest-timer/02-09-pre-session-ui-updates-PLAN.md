---
phase: 2
plan: 09
type: execute
wave: 3
depends_on: ["02-01", "02-02", "02-06"]
files_modified:
  - src/components/EmptyStateScreen.tsx
  - src/components/WizardScreen.tsx
autonomous: true
requirements: [SESS-04, REST-01]
must_haves:
  truths:
    - "EmptyStateScreen lists the seed mini-routine: 3 exercises × 4 sets × 8 reps (D-15) — visible bullet list of 'Sentadilla', 'Press banca', 'Remo con barra'"
    - "EmptyStateScreen primary CTA still reads 'Iniciar sesión' AND its onClick calls (a) audioCue.prime() (b) onStartSession() — gesture priming per RESEARCH §Pattern 3"
    - "EmptyStateScreen retains data-testid='start-session' for E2E spec stability"
    - "WizardScreen adds three preference toggles: restAlertSound (boolean checkbox), restAlertVibration (boolean checkbox), effortMetric ('rir' | 'rpe' radio) — D-24"
    - "WizardScreen submits all 5 fields (goalFocus, equipmentNote, restAlertSound, restAlertVibration, effortMetric) via onSubmit"
    - "WizardScreen imports PreferencesV3 type (not the old SnapshotV2['preferences']) — schema migration completion"
  artifacts:
    - path: "src/components/EmptyStateScreen.tsx"
      provides: "Updated empty-state with mini-routine preview + audio gesture priming"
      contains: "audioCue.prime"
    - path: "src/components/WizardScreen.tsx"
      provides: "Wizard with REST-01 + RIR/RPE preferences"
      contains: "restAlertSound"
  key_links:
    - from: "EmptyStateScreen onClick"
      to: "useAudioCue.prime (plan 02-06)"
      via: "tap on 'Iniciar sesión' triggers prime() before onStartSession()"
      pattern: "audioCue\\.prime"
    - from: "WizardScreen onSubmit"
      to: "App.tsx setPreferences"
      via: "passes full PreferencesV3 object"
      pattern: "restAlertSound: , restAlertVibration: , effortMetric:"
---

<objective>
Update the two pre-session screens to (a) preview the seed routine so the user knows what they're starting (D-15 + SESS-01), (b) prime the AudioContext from a real user gesture (RESEARCH §Pattern 3), and (c) collect the three new V3 preferences (D-24: REST-01 alert toggles + effortMetric).

Purpose: Without (b) iOS Safari refuses to play the rest-end beep. Without (c) the rest alerts ignore user intent. Without (a) SESS-01 starts on a vague screen with no commitment context.
Output: 2 updated files. No new files.
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
@src/components/EmptyStateScreen.tsx
@src/components/WizardScreen.tsx

<interfaces>
From src/persist/schema.ts (after plan 02-01):
```typescript
export type PreferencesV3 = {
  goalFocus: 'strength' | 'hypertrophy' | 'fat_loss'
  equipmentNote: string
  restAlertSound: boolean
  restAlertVibration: boolean
  effortMetric: 'rir' | 'rpe'
}
```

From src/hooks/useAudioCue.ts (plan 02-06):
```typescript
export interface UseAudioCueResult {
  prime: () => Promise<void>
  beep: (frequencyHz?: number, durationMs?: number) => void
  isPrimed: boolean
}
export function useAudioCue(): UseAudioCueResult
```

From src/session/seed.ts (plan 02-04):
```typescript
export function getSeedExercises(exerciseIds: string[]): Exercise[] // 3 ex × 4 sets × 8 reps
```
</interfaces>

**Stack constraint (D-22 — LOCKED):** No new deps.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update EmptyStateScreen.tsx — preview seed routine + prime audio onClick</name>
  <read_first>
    - src/components/EmptyStateScreen.tsx (current 28-line minimal version)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-15 (mini-routine preview)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" "EmptyStateScreen (updated)"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pattern 3: Web Audio gesture priming"
    - .planning/phases/02-guided-session-rest-timer/02-RESEARCH.md §"Pitfall 1: Web Audio without gesture"
    - src/hooks/useAudioCue.ts (plan 02-06 contract)
  </read_first>
  <action>
Replace `src/components/EmptyStateScreen.tsx` ENTIRELY with:

```tsx
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
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "import \{ useAudioCue \}" src/components/EmptyStateScreen.tsx` matches
    - `rg "const audioCue = useAudioCue\(\)" src/components/EmptyStateScreen.tsx` matches
    - `rg "void audioCue\.prime\(\)" src/components/EmptyStateScreen.tsx` matches (gesture priming)
    - `rg "onClick=\{handleStart\}" src/components/EmptyStateScreen.tsx` matches
    - `rg "data-testid=\"start-session\"" src/components/EmptyStateScreen.tsx` matches (E2E selector preserved)
    - `rg "Iniciar sesión" src/components/EmptyStateScreen.tsx` matches
    - `rg "'Sentadilla'" src/components/EmptyStateScreen.tsx` matches
    - `rg "'Press banca'" src/components/EmptyStateScreen.tsx` matches
    - `rg "'Remo con barra'" src/components/EmptyStateScreen.tsx` matches
    - `rg "4, reps: 8" src/components/EmptyStateScreen.tsx` matches at least 3 times (one per exercise)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>EmptyStateScreen previews routine; primes audio inside the click; testid stable.</done>
</task>

<task type="auto">
  <name>Task 2: Update WizardScreen.tsx — add restAlertSound, restAlertVibration, effortMetric (D-24)</name>
  <read_first>
    - src/components/WizardScreen.tsx (current ~100 line version, V2 typed)
    - src/persist/schema.ts (PreferencesV3 — defined by plan 02-01)
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-24 (preferences additions)
    - .planning/phases/02-guided-session-rest-timer/02-UI-SPEC.md §"Component Inventory" "WizardScreen (updated)" — toggles
    - .planning/phases/02-guided-session-rest-timer/02-CONTEXT.md D-07 (RIR vs RPE — effortMetric drives later UI)
  </read_first>
  <action>
Replace `src/components/WizardScreen.tsx` ENTIRELY with:

```tsx
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
```
  </action>
  <verify>
    <automated>npx tsc -b</automated>
  </verify>
  <acceptance_criteria>
    - `rg "import type \{ PreferencesV3 \}" src/components/WizardScreen.tsx` matches
    - `rg "useState<boolean>" src/components/WizardScreen.tsx` returns ≥ 2 matches (sound + vibration)
    - `rg "data-testid=\"pref-rest-sound\"" src/components/WizardScreen.tsx` matches
    - `rg "data-testid=\"pref-rest-vibrate\"" src/components/WizardScreen.tsx` matches
    - `rg "data-testid=\"pref-effort-rir\"" src/components/WizardScreen.tsx` matches
    - `rg "data-testid=\"pref-effort-rpe\"" src/components/WizardScreen.tsx` matches
    - `rg "data-testid=\"wizard-submit\"" src/components/WizardScreen.tsx` matches (E2E continuity)
    - `rg "data-testid=\"equipment-note\"" src/components/WizardScreen.tsx` matches (E2E continuity)
    - `rg "restAlertSound" src/components/WizardScreen.tsx` matches at least 4 times (state, setter, prop, payload)
    - `rg "effortMetric" src/components/WizardScreen.tsx` matches at least 4 times
    - `rg "Avisos de descanso" src/components/WizardScreen.tsx` matches
    - `rg "Métrica de esfuerzo" src/components/WizardScreen.tsx` matches
    - `rg "0=fallo, 4=fácil" src/components/WizardScreen.tsx` matches (D-07 alignment)
    - `rg "SnapshotV2" src/components/WizardScreen.tsx` returns 0 matches (V2 import dropped)
    - `npx tsc -b` exits 0
  </acceptance_criteria>
  <done>WizardScreen collects all 5 V3 preferences with stable test IDs; V2 type import removed.</done>
</task>

</tasks>

<verification>
- All two tasks pass.
- `npx tsc -b` exits 0 across the two files.
- E2E selectors `data-testid="start-session"`, `data-testid="wizard-submit"`, `data-testid="equipment-note"` STILL present (Phase 1 E2E continuity).
- New E2E hooks `data-testid="pref-*"` present for plan 02-11 reuse.
</verification>

<success_criteria>
Pre-session screens are V3-aware and gesture-prime audio. Zero new npm deps.
</success_criteria>

<output>
After completion, create `.planning/phases/02-guided-session-rest-timer/02-09-SUMMARY.md` documenting:
- Diff summary (lines added/removed per file)
- New testids
- D-22 + D-24 compliance confirmed
</output>
