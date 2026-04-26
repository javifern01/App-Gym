# Phase 2: Guided Session + Rest Timer — Research

**Researched:** 2026-04-26
**Domain:** React state machines, drift-free Web timers, Web Audio gesture-priming, Wake Lock API, Zod schema migration
**Confidence:** HIGH (stack & patterns verified in code; Web APIs verified against caniuse/MDN, April 2026)

<user_constraints>
## User Constraints (from 02-CONTEXT.md)

> Research and planning MUST honor these locked decisions verbatim. The orchestrator's intro mentioned Dexie/Zustand/TanStack Router/vite-plugin-pwa/RHF — those are explicitly **excluded** by D-22 and inherited Phase 1 D-09/D-13. They are **out of scope** for this phase.

### Locked Decisions

**Modelo de foco de la sesión (SESS-01)**
- **D-01:** Focus mode — tarjeta grande del set actual (~70% del viewport) + cinta/lista compacta superior con el resto de sets/ejercicios.
- **D-02:** Indicadores **siempre visibles** durante la sesión: (1) nombre del ejercicio actual, (2) progreso del ejercicio (chips “1·2·3·4”), (3) progreso de la sesión (“Ejercicio 2 de 4”), (4) tiempo total transcurrido, (5) acceso a “Saltar ejercicio”, (6) acceso a “Pausar/Abandonar”, (7) indicador de auto-save (“Guardado”).
- **D-03:** Mobile-first explícito (móvil vertical, una mano).
- **D-04:** Salida de la sesión → estado `paused`. Al volver, prompt **“¿Retomar o descartar?”** (snapshot persiste mientras no se descarte).

**Input rápido del set (SESS-02)**
- **D-05:** Steppers (+/−) ±1 reps / ±2.5 kg + tap en el número abre numpad nativo (`inputmode="numeric"`).
- **D-06:** Pre-fill desde el set anterior del mismo ejercicio en la sesión actual; primer set ↦ pre-fill desde `planned`.
- **D-07:** **RIR** por defecto (chips 0–4, “0 = fallo”). RPE como toggle en preferencias.
- **D-08:** Confirmación inline + botón grande **“✓ Hecho”**, sin sheet/modal.
- **D-09:** Edge cases válidos: reps = 0 (fallo técnico), editar set ya completado (tap en chip), peso = 0 permitido. (Notas y RIR fraccional → diferidos.)

**Rest timer (REST-01, REST-02)**
- **D-10:** Strip persistente abajo + tap → panel grande con dial circular. **No** takeover full-screen.
- **D-11:** Aviso = visual (flash + cambio de color) **+ sonido ON por defecto** (toggle) **+ vibración** (Web Vibration API si disponible, ON por defecto, toggle). Todo in-app (D-10 Phase 1).
- **D-12:** Controles del timer: **“Saltar”**, **“+15s”**, **“+30s”**. Skip permitido en cualquier momento.
- **D-13:** Descanso prescrito por defecto desde `goalFocus` del wizard: `strength → 180s`, `hypertrophy → 90s`, `fat_loss → 60s`. Editable por sesión (tap largo en strip).
- **D-14:** Schema persiste **`rest_planned_s`** y **`rest_actual_s`** por set. Indicador discreto por set en la cinta (`✓ 92s ↑+2s`). Desviación media en resumen.

**Skip y multi-ejercicio (SESS-04)**
- **D-15:** Mini-rutina **estática de 2–4 ejercicios seed-en-código** (compound básicos). La rutina configurable por usuario llega con Phase 3.
- **D-16:** Skip ejercicio: botón “Saltar” en cabecera + menú overflow (•••) en chips de la cinta. Visible pero no primario.
- **D-17:** Confirmación de skip: **sin modal**. Toast “Saltado · Deshacer” (5s).
- **D-18:** Avance entre ejercicios = **auto-advance** + pantalla **hand-off ~3s** (“Siguiente: [Ejercicio]” + “Empezar ya” + “Saltar este”).

**Resumen**
- **D-19:** Mínimo viable: lista hechos/saltados, duración total, **desviación media de descanso**, chip “✓ N sets · Skipped: N”. **NO** tonelaje (HIST-02 / Phase 5).
- **D-20:** Misma single-page → estado “Resumen” cuando `session.status === 'completed'`. Tarjeta grande + “Iniciar nueva sesión” + “Cerrar resumen”.

**Lenguaje visual**
- **D-21:** Mantener dark glassmorphism + tokens existentes (`--primary`, `--surface`, `--radius-*`, `pill`, `card`, `set-row`). Tap targets primarios **≥ 56×56 px**. Tipografía gruesa XL en el número del set actual. `--primary` (morado) = CTA; `--primary-2` (verde) = hecho.
- **D-22:** **SIN Tailwind / Radix / Zustand en Phase 2.** CSS plano + `useState` (continuidad con Phase 1). Diferimos adopción.
- **D-23:** **Wake Lock in-scope.** `navigator.wakeLock.request('screen')` en `in_progress`, liberar en `paused`/`completed`. Fallback silencioso. Re-acquire tras `visibilitychange`.

**Schema (D-24, D-25)**
- **D-24:** Bump V2 → V3.
  - `ExerciseSetSchema.completed` añade: `weight: number`, `rir: number` (0–4), `rest_planned_s?: number`, `rest_actual_s?: number`.
  - `Session` pasa de un solo `exerciseName` a array `exercises: Exercise[]` con `name`, `sets`, `status: 'pending'|'active'|'done'|'skipped'`, `currentSetIndex`.
  - `Session.status` añade `'paused'`.
  - `Preferences` añade: `restAlertSound: boolean`, `restAlertVibration: boolean`, `effortMetric: 'rir'|'rpe'`.
- **D-25:** Migración V1/V2 → V3 preservando preferencias; sets antiguos no son “completos” recuperables.

### Claude's Discretion (research recommends, planner decides)

- Esquema de animaciones / transiciones (entrada del timer, hand-off entre ejercicios).
- Iconografía concreta (preferencia SVG inline ligeros).
- Microcopy (toasts, errores).
- Estructura interna de hooks (`useRestTimer`, `useSession`, `useWakeLock`, etc.).
- Detalles del refactor del schema y migración V2→V3 (sin romper D-24/D-25).
- Selección concreta de los 2–4 ejercicios seed (compound básicos).
- UX de inputs en escritorio (probablemente steppers + Enter, sin numpad nativo).

### Deferred Ideas (OUT OF SCOPE)

- Notas opcionales por set → Phase 5.
- Tonelaje (kg × reps) en resumen → Phase 5 / HIST-02.
- Sugerencia de progresión en pre-fill → Phase 4 / PROG-02.
- Configurar rutina por usuario (no estática) → Phase 3.
- Adoptar Tailwind / Radix / Zustand → re-evaluar al final de v1.
- Notificaciones del sistema al terminar descanso → descartado en Phase 1 (D-10).
- RIR fraccional / RPE como métrica primaria → toggle, no por defecto.
- Editar peso/reps planificados antes de empezar el set → llega con biblioteca (Phase 3).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **SESS-01** | App muestra una sesión guiada con “siguiente acción” clara — sin pantallas en blanco | § Session State Machine + § Routing/“Next Action” Guarantee + § Skip / Redo / Reorder (hand-off ~3s, single-page state switching, FSM nunca en estado “limbo”) |
| **SESS-02** | Registrar cada set con reps reales, peso, RIR (o RPE), timestamp | § Set Logging Forms & Validation (RIR chips 0–4, steppers + numpad, controlled inputs) + § Persistence Schema (V3 `completed.{reps,weight,rir,at}`) |
| **SESS-04** | Marcar ejercicio como realizado/omitido y reflejarlo en resumen | § Skip / Redo / Reorder + § Rest Deviation Summary (skipped excluido del cálculo) + § Persistence Schema (`Exercise.status: 'pending'\|'active'\|'done'\|'skipped'`) |
| **REST-01** | Iniciar timer al completar un set y avisar al finalizar (visual + sonido opcional) | § Rest Timer (drift-free + visibility recovery) + § Audio Cues (Web Audio + iOS gesture priming) + § PWA & Offline (Wake Lock para mantener pantalla) |
| **REST-02** | Persistir descanso prescrito vs real por set, mostrar desviación media | § Persistence Schema (`rest_planned_s`, `rest_actual_s`) + § Rest Deviation Summary (fórmula + edge cases) |
</phase_requirements>

## Project Constraints (from .cursor/rules/CLAUDE.md)

- **Deployment:** GitHub Pages (static, no backend). All Phase 2 work must build + deploy to `dist/` unchanged.
- **UX guardrail:** “Sin folio en blanco” → cualquier pantalla durante la sesión muestra una *next action* explícita.
- **Data fidelity:** Cada set persiste timestamps reales (no solo planificados).
- **Stack note in CLAUDE.md:** El bloque “Recommended Stack” menciona Dexie/Zustand/Tailwind/Radix/RHF/PWA. **CONTEXT.md D-22 anula esto para Phase 2.** El planner debe rechazar cualquier tarea que reintroduzca esas dependencias.
- **GSD workflow:** Trabajo file-changing solo desde GSD command flow (research → plan → execute).

## Executive Summary

1. **Stack continuity is the dominant constraint.** Phase 2 reuses Phase 1 exactly: plain `useState` (no Zustand), single localStorage key + Zod (no Dexie), CSS plano con tokens existentes (no Tailwind/Radix), single page con cambio de estado interno (no TanStack Router), inputs controlados (no React Hook Form), sin service worker (no `vite-plugin-pwa`). El planner debe asumir **cero nuevas dependencias** salvo *quizás* `nanoid` (sustituible por `crypto.randomUUID()` ya en uso). Recomendación de research: **0 nuevas deps**.

2. **Session FSM cabe en un `useReducer` puro de TS.** Discriminated union con `status: 'idle' | 'in_progress' | 'paused' | 'completed'`, acciones `START_SESSION | LOG_SET | START_REST | TICK | REST_DONE | SKIP_EXERCISE | UNDO_SKIP | PAUSE | RESUME | DISCARD | NEXT_EXERCISE | EDIT_SET`. Snapshot persistido es fuente de verdad durable; el reducer es la transición; cada acción → `dispatch` → `updateSnapshot`. Esto evita Zustand y mantiene el patrón de Phase 1.

3. **El rest timer DEBE ser drift-free vía `Date.now()` + endTimestamp.** Patrón canónico: persistir `restEndAt` (epoch ms) en el snapshot, computar `remainingMs = restEndAt - Date.now()` en cada tick (rAF o `setInterval(_, 250)`). Esto sobrevive a `setInterval` throttling en background, lock de pantalla, recarga del navegador (ya teníamos auto-resume) y catch-up automático en `visibilitychange`. Wake Lock D-23 mitiga el caso “móvil bloquea pantalla” pero no es garantía — el timer matemático es la verdad.

4. **iOS Safari requiere gesture-priming del audio Y del Wake Lock.** Crear `AudioContext` perezosamente al primer `pointerdown` durante la sesión (botón “Iniciar sesión” o “✓ Hecho”), llamar `ctx.resume()`, y mantenerlo vivo. Wake Lock idem: la primera `request('screen')` debe ocurrir dentro del handler de un evento de usuario; iOS rechaza con `NotAllowedError` si se llama frío. Vibración: feature-detect `'vibrate' in navigator` — **iOS Safari NO la soporta** (verificado en caniuse 2026.5), fallback silencioso al flash visual.

5. **Schema V3 con array de ejercicios cambia toda la lectura del state.** El cambio más invasivo del phase: pasar de `session.exerciseName + session.sets` a `session.exercises: Exercise[]` rompe `App.tsx`, `SessionScreen.tsx`, `EmptyStateScreen.tsx` y los tests existentes. La migración V2→V3 envuelve los sets viejos en un único `Exercise` con `status: 'pending'` y la sesión vuelve a `idle` (D-25). El planner debe aislar este cambio en una task temprana de la fase.

**Primary recommendation:** Treat Phase 2 as **3 ortogonal subsystems**:
**(a)** schema + reducer FSM (no UI), **(b)** rest timer + audio + wake-lock primitives (custom hooks aislados), **(c)** UI rewrite del SessionScreen sobre (a) + (b). Plan tasks en olas: schema/FSM/hooks (paralelo) → SessionScreen rewrite + EmptyState + App orchestration → resumen + skip/undo + e2e Playwright.

## Standard Stack

> CONTEXT.md D-22 prohibe nuevas dependencias de UI/state/router/PWA. La tabla refleja el stack **ya presente** en el repo (Phase 1) que Phase 2 reutiliza tal cual. **No se debe instalar nada nuevo.**

### Core (already installed, reuse)
| Library | Installed Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `react` | 19.x (Phase 1 baseline) | UI primitives + `useState` / `useReducer` / `useEffect` | Already the project's UI foundation; `useReducer` covers FSM needs without Zustand. |
| `vite` + `@vitejs/plugin-react` | latest | Build / dev server | Already wired for GH Pages with `base: './'`. |
| `typescript` | 5.x | Static types for FSM + schema | Already enforced in Phase 1. |
| `zod` | 3.x | Runtime validation + V2/V3 migration | Already the persistence contract; extends to new schema. |

### Web APIs (browser built-ins, no install)
| API | Browser Baseline (April 2026) | Use In Phase 2 |
|-----|-------------------------------|----------------|
| `Date.now()` + `requestAnimationFrame` / `setInterval` | universal | drift-free timer math |
| `Page Visibility API` (`document.visibilityState`, `visibilitychange`) | universal | timer catch-up + wake-lock re-acquire |
| `Screen Wake Lock` (`navigator.wakeLock.request('screen')`) | Safari **16.4+**, Chrome 85+, Firefox 126+, iOS Safari **16.4+** | mantener pantalla durante sesión activa |
| `Web Audio API` (`AudioContext`, `OscillatorNode`, `GainNode`) | Baseline since 2021; iOS requires gesture priming | beep al fin del descanso |
| `Vibration API` (`navigator.vibrate(pattern)`) | Chrome / Edge / Firefox / Android: yes. **iOS Safari: NOT supported** (caniuse 2026.5) | feature-detect; silent fallback en iOS |
| `crypto.randomUUID()` | Baseline since Safari 15.4 / Chrome 92 | IDs de sesión / set / ejercicio (ya en uso en `App.tsx`) |
| `localStorage` | universal | persistencia (ya el system of record de v1) |
| `inputmode="numeric"` (HTML attribute) | universal | numpad nativo en mobile (D-05) |

### Testing (already installed, reuse)
| Library | Use |
|---------|-----|
| `vitest` + `@testing-library/react` | unit tests (FSM, timer math, schema, deviation calc) |
| `@playwright/test` | E2E smoke (start → log set → rest fires → next set) |

### Alternatives Considered

| Instead of | Could Use | Why Phase 2 sticks with current choice |
|------------|-----------|----------------------------------------|
| `useReducer` | Zustand | D-22 forbids; useReducer is sufficient for the action set; ergonomically close. |
| `useReducer` | XState / xstate-lite | Adds 30+KB and learning curve. FSM here has ~10 actions; a discriminated-union reducer is more readable for the team coming from Phase 1. |
| Inline reducer | Zustand + slices | D-22 forbids. Would add 7KB + a parallel mental model to the existing snapshot pattern. |
| Plain controlled inputs | React Hook Form + `@hookform/resolvers/zod` | Phase 1 already uses controlled `useState` inputs. RHF wins on >5 fields with re-render pressure; the set-entry form has 3 fields (reps, weight, RIR). Adding RHF is a 4th new dep that contradicts D-22 spirit. **Recommendation: skip RHF in Phase 2; revisit if real perf issues appear.** |
| `localStorage` snapshot | Dexie + IndexedDB | D-22 + Phase 1 D-05/D-06 lock localStorage. v1 data volume is tiny (one user, one snapshot, ~10KB). Dexie comes with Phase 5+ when history grows. |
| TanStack Router | state-based screen switching in `App.tsx` | D-13 Phase 1: single page sin rutas. Hand-off / paused / summary son **estados internos** de la misma página. |
| `vite-plugin-pwa` | nothing (no SW) | D-09 Phase 1: sin PWA. No background timers, no notifications, no precache. Wake Lock + visible-tab math is the only timer guarantee. |
| `date-fns` | `Date.now()` + ad-hoc helpers | Recommended in CLAUDE.md but not yet installed. Phase 2 uses milliseconds + ISO strings only. **Defer install** unless duration formatting (`mm:ss`) becomes painful — a 5-line `formatMmSs(seconds)` helper is enough. |

**Installation:** **none.** Phase 2 ships with zero new npm deps. Confirmed by D-22.

**Version verification policy:** N/A for this phase (no installs). For React/Zod/Vitest already installed, planner should leave versions untouched.

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
├── components/
│   ├── SessionScreen.tsx          # REWRITE: focus card + chip strip + timer strip
│   ├── EmptyStateScreen.tsx       # UPDATE: ahora siembra mini-rutina (D-15)
│   ├── WizardScreen.tsx           # UPDATE: añadir toggles restAlertSound/Vibration/effortMetric
│   ├── session/                   # NEW subfolder for session-specific UI
│   │   ├── FocusCard.tsx          # tarjeta grande del set actual (D-01)
│   │   ├── ExerciseStrip.tsx      # cinta superior con chips de ejercicios + sets
│   │   ├── RestStrip.tsx          # strip persistente abajo + expansion (D-10)
│   │   ├── RestPanel.tsx          # panel grande con dial + +15s/+30s/skip
│   │   ├── HandoffOverlay.tsx     # pantalla de transición entre ejercicios (~3s, D-18)
│   │   ├── PauseDialog.tsx        # prompt "¿Retomar o descartar?" (D-04)
│   │   ├── SummaryScreen.tsx      # estado completed (D-19, D-20)
│   │   └── Toast.tsx              # toast no bloqueante con undo (D-17)
├── session/                       # NEW: state machine + pure logic (no React)
│   ├── reducer.ts                 # FSM transitions (puro, testable, deterministic)
│   ├── actions.ts                 # tagged-union de acciones
│   ├── selectors.ts               # derivedSelector(state) → currentExercise, currentSet, etc.
│   └── seed.ts                    # mini-rutina estática (D-15)
├── hooks/                         # NEW
│   ├── useRestTimer.ts            # drift-free timer; lee restEndAt del snapshot
│   ├── useWakeLock.ts             # request + visibilitychange re-acquire
│   ├── useAudioCue.ts             # AudioContext primed on first gesture; beep()
│   ├── useVibration.ts            # feature-detected wrapper; no-op on iOS
│   └── useUndoableToast.ts        # 5s timer for D-17 skip-undo
├── persist/
│   ├── schema.ts                  # ADD V3 + types (D-24)
│   └── snapshot.ts                # ADD migrateV2toV3 (D-25)
└── utils/
    ├── formatTime.ts              # mm:ss helper (~5 líneas, no date-fns)
    └── restDeviation.ts           # mean(rest_actual - rest_planned) (REST-02)
```

### Pattern 1: FSM via `useReducer` + persistent snapshot

**What:** El reducer transforma `(state, action) → state`. `App.tsx` mantiene el reducer y llama a `saveSnapshot(state)` después de cada `dispatch`. La sesión es derivable enteramente del snapshot al recargar (incluyendo `restEndAt` epoch ms).

**When to use:** State con >5 transiciones discretas y constraints de transición (no se puede entrar a `resting` sin un set logueado primero).

**Example sketch:**

```typescript
// src/session/reducer.ts
type State = SnapshotV3
type Action =
  | { type: 'START_SESSION'; preferences: Preferences; nowIso: string; nowMs: number }
  | { type: 'LOG_SET'; reps: number; weight: number; rir: number; nowIso: string; nowMs: number }
  | { type: 'TICK'; nowMs: number }                 // drives derived rest_actual_s
  | { type: 'REST_DONE'; nowMs: number }            // emitted by useRestTimer when remainingMs <= 0
  | { type: 'SKIP_REST'; nowMs: number }
  | { type: 'EXTEND_REST'; deltaMs: number }
  | { type: 'SKIP_EXERCISE'; exerciseIndex: number; nowIso: string }
  | { type: 'UNDO_SKIP'; exerciseIndex: number }
  | { type: 'EDIT_SET'; exerciseIndex: number; setIndex: number; patch: Partial<CompletedSet> }
  | { type: 'PAUSE' } | { type: 'RESUME' } | { type: 'DISCARD' }
  | { type: 'ADVANCE_TO_NEXT_EXERCISE'; nowIso: string }

export function reducer(state: State, action: Action): State { /* exhaustive switch */ }
```

`App.tsx` becomes:

```typescript
const [state, dispatch] = useReducer(reducer, initialSnapshot)
useEffect(() => { saveSnapshot(state) }, [state])
```

This stays inside D-22's “useState + funcional update” spirit (the official React docs treat `useReducer` as “the same shape for complex state”).

### Pattern 2: Drift-free timer driven by persisted `restEndAt`

**What:** Persistir `session.rest.endAt: number /* epoch ms */` en el snapshot. Un hook `useRestTimer()` lee ese valor y computa `remainingMs = endAt - Date.now()` en cada tick. Cuando `remainingMs <= 0`, dispara `dispatch({ type: 'REST_DONE' })` (idempotente). El hook NO acumula tiempo; solo lee el reloj.

**When to use:** cualquier countdown que deba seguir siendo correcto tras lock de pantalla, throttling de tab background, o reload.

**Example:**

```typescript
// src/hooks/useRestTimer.ts
export function useRestTimer(restEndAt: number | null, onDone: () => void) {
  const [now, setNow] = useState(() => Date.now())
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (restEndAt == null) return
    let raf = 0
    const tick = () => {
      setNow(Date.now())
      const remaining = restEndAt - Date.now()
      if (remaining <= 0) onDoneRef.current()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onVis = () => {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis) }
  }, [restEndAt])

  if (restEndAt == null) return { remainingMs: 0, active: false }
  return { remainingMs: Math.max(0, restEndAt - now), active: true }
}
```

> **Source:** Pattern is canonical for JS countdowns. `requestAnimationFrame` self-throttles when tab hidden; the `visibilitychange` listener forces an immediate re-read on return. The `endAt` math is correct independent of how many frames were skipped.

### Pattern 3: Audio cue with iOS gesture priming

**What:** Lazy-init `AudioContext` on the first user gesture inside the session. Once `ctx.state === 'running'`, `beep()` produces tones via `OscillatorNode + GainNode` without needing further gestures. Persist `ctx` in a module-level `let` or in a hook ref.

**Example:**

```typescript
// src/hooks/useAudioCue.ts
let ctx: AudioContext | null = null

export function primeAudioOnGesture() {
  // Call inside an onClick / onPointerDown handler ONCE per page load
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* ignore */ })
}

export function beep(durationMs = 180, freqHz = 880) {
  if (!ctx || ctx.state !== 'running') return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = freqHz
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01)  // soft attack
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000 + 0.02)
}

export function useAudioPrimingOnSession(active: boolean) {
  // Attach a one-shot pointerdown listener whenever session enters 'in_progress'
  useEffect(() => {
    if (!active) return
    const handler = () => primeAudioOnGesture()
    window.addEventListener('pointerdown', handler, { once: true, passive: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [active])
}
```

> **Source:** *web-audio-touch-unlock* pattern (Pavle Goloskokovic, HackerNoon) + MDN `AudioContext.resume()`. Verified iOS Safari 26.x still requires gesture priming.

### Pattern 4: Wake Lock with visibility re-acquire

**What:** Request lock on session entering `in_progress`; release on `paused`/`completed`/unmount. Re-acquire on `visibilitychange` → `visible` because iOS auto-releases on hide.

**Example:**

```typescript
// src/hooks/useWakeLock.ts
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active) return
    if (!('wakeLock' in navigator)) return  // silent fallback (D-23)

    const acquire = async () => {
      try {
        sentinelRef.current = await (navigator as any).wakeLock.request('screen')
      } catch (err) {
        // NotAllowedError on iOS if no prior gesture; silent fallback
      }
    }
    acquire()

    const onVis = () => {
      if (document.visibilityState === 'visible' && sentinelRef.current === null) acquire()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      sentinelRef.current?.release().catch(() => {})
      sentinelRef.current = null
    }
  }, [active])
}
```

> **Source:** MDN Wake Lock + StackOverflow iOS NotAllowedError pattern. The first `request()` MUST be inside (or shortly after) a user gesture chain on iOS — calling it inside a `useEffect` triggered by clicking “Iniciar sesión” is OK.

### Pattern 5: Single localStorage snapshot, V2 → V3 migration

**What:** Extend the existing `loadSnapshot()` chain: try V3 → if fails, try V2 → adapt → if fails, try V1 → adapt twice. The snapshot is **always** the current schema in memory (V3 from Phase 2 onward); legacy versions only exist on disk for migration.

**Example:**

```typescript
// src/persist/snapshot.ts (extended)
export function loadSnapshot(): LoadSnapshotResult {
  // ... raw + parse JSON ...
  const v3 = SnapshotV3Schema.safeParse(parsed)
  if (v3.success) return { ok: true, snapshot: v3.data }

  const v2 = SnapshotV2Schema.safeParse(parsed)
  if (v2.success) return { ok: true, snapshot: migrateV2toV3(v2.data) }

  const v1 = SnapshotV1Schema.safeParse(parsed)
  if (v1.success) return { ok: true, snapshot: migrateV2toV3(migrateV1toV2(v1.data)) }

  return { ok: false, reason: 'invalid_schema' }
}
```

### Anti-Patterns to Avoid

- **`setInterval(_, 1000)` accumulator** for the rest timer. Wrong: tab background throttling cuts intervals to once-per-minute on Chrome, longer on iOS, so a 90s timer counted with "remaining -= 1 each tick" can be off by **dozens of seconds**. Always compute from `Date.now()`.
- **Storing the AudioContext inside React state.** Causes recreation on rerender; iOS counts each new context against gesture grants. Module-level singleton or ref is correct.
- **Calling `wakeLock.request()` outside a gesture chain on iOS.** Throws `NotAllowedError`. Trigger on a user click/tap event, not on `useEffect` from a non-gesture-driven mount.
- **Embedding `Date.now()` directly in reducer logic** (rather than passing in `nowMs` via the action). Makes the reducer non-deterministic and impossible to unit test. **Always inject `nowMs`/`nowIso` via the action**.
- **Reading the rest end time from React state instead of the snapshot.** Loses across reload. The snapshot must hold `rest.endAt`.
- **Service worker / `vite-plugin-pwa`.** D-09 Phase 1 explicitly excluded PWA. Re-introducing it here breaks deploy story.
- **`localStorage` `setItem` on every TICK.** The TICK action shouldn't change persisted state at all (only `now` is read live). Persist on transitions, not on ticks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema versioning | Manual `if (data.version === 1)` cascades with custom JSON parsers | Zod `safeParse` per version + linear migrators | Already the project's pattern; type inference flows; corrupt JSON handling is built-in. |
| Drift-free countdown | Custom `setInterval` accumulator | `endAt` epoch + `remaining = endAt - Date.now()` on each tick | Correct under throttling, sleep, reload. (See Pattern 2.) |
| Audio playback timing | Manual `setTimeout` to sequence beeps | `OscillatorNode.start(t) + stop(t)` against `audioContext.currentTime` | The Web Audio clock is sample-accurate; JS timer drift would mistime the beep. |
| Vibration cross-platform | Custom haptic abstraction | Feature-detect `'vibrate' in navigator` + silent fallback (iOS lacks support) | The non-standard "switch checkbox" hack is unreliable; planner should not chase it. |
| Wake Lock fallback | "No-sleep video loop" hack (silent video playing) | Just feature-detect; let iOS <16.4 sleep | The video hack drains battery and is brittle. Wake Lock support is now broad enough (Safari 16.4+). |
| `mm:ss` formatting | `date-fns` install just for one helper | `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` | One file, ten lines, zero dep. |
| Toast with undo | Custom global toast manager | One-off component with internal `setTimeout` + dismiss | Single use case (skip exercise); a global system is over-engineering. |
| Numeric input UX | Build a custom keypad | `<input inputmode="numeric" pattern="[0-9]*">` + steppers | The native iOS/Android numpad is faster and accessible. (D-05.) |

**Key insight:** Phase 2's complexity sits in *coordination* (FSM transitions × timer × persistence × audio gesture × wake-lock × visibility), not in any individual piece. Each piece individually is a small native API. The risk is one piece going wrong on a target browser (iOS Safari mostly) — keep each one feature-detected with silent graceful fallback.

## Common Pitfalls

### Pitfall 1: iOS `NotAllowedError` on Wake Lock first request
**What goes wrong:** `navigator.wakeLock.request('screen')` rejects with `NotAllowedError` on iOS if the page hasn't received a user gesture, or if it's called too long after one.
**Why it happens:** WebKit treats wake lock as a privileged op needing recent gesture, like fullscreen.
**How to avoid:** Trigger the *first* request inside the `onClick` of "Iniciar sesión" / "Empezar ya" / "Reanudar" — these are the FSM entry points to `in_progress`. Treat the failure as silent (no error UI) per D-23.
**Warning signs:** Console errors only on iOS; pantalla apaga sola en mitad del test E2E.

### Pitfall 2: Suspended `AudioContext` on iOS for the first beep
**What goes wrong:** The end-of-rest beep is silent the FIRST time, even though `beep()` was called.
**Why it happens:** `AudioContext` initialized but `state === 'suspended'` until a gesture. If you create the context on session start and the user doesn't tap until the first set, that gesture *can* unlock it, but if you create it inside a `useEffect` (no gesture), it stays suspended.
**How to avoid:** `primeAudioOnGesture()` inside the click handler of every "session-entry" button (start, resume, complete-set). Idempotent: only resumes if `suspended`.
**Warning signs:** No sound on iOS Safari, but `console.log(ctx.state)` shows `'suspended'`. Desktop Chrome works fine (false positive).

### Pitfall 3: `setInterval` drift in background tabs
**What goes wrong:** User locks the phone for 60s. Comes back. Timer says "82s left" instead of "30s left".
**Why it happens:** Background `setInterval` is throttled (Chrome: 1 tick/min; iOS Safari: even less). Accumulator-based timers under-count.
**How to avoid:** Always compute `remaining = endAt - Date.now()` (Pattern 2). The visual update can use `requestAnimationFrame` (also throttled, but the math doesn't depend on frequency).
**Warning signs:** Timer is correct on desktop foreground; wildly off on locked-screen mobile.

### Pitfall 4: Reducer non-determinism breaks unit tests
**What goes wrong:** Tests pass on Tuesday, fail on Wednesday because they touch `Date.now()`.
**Why it happens:** Reducer reads ambient time/random/storage.
**How to avoid:** Reducer is pure: every action carries `nowMs`/`nowIso`/`id` from the dispatcher. Dispatcher is the only impure layer (`App.tsx` `dispatchTimed(action)` injects `Date.now()`).
**Warning signs:** Flaky `expect(state.session.startedAt).toEqual(...)` tests.

### Pitfall 5: V2 → V3 migration drops user data
**What goes wrong:** User's in-progress session disappears on first run after deploy.
**Why it happens:** Migration sets `session.status = 'idle'` (D-25) — correct per decision — but if the migrator ALSO discards completed sets array, the user loses logged sets they thought were saved.
**How to avoid:** D-25 explicitly says old sets are not "completos recuperables" because they have no `weight`/`rir`. Translate that to: wrap legacy sets into one `Exercise{ name, status: 'pending', sets: [oldSets...] }` so the user *sees* them after migration but starts a fresh session. Alternative: discard with a banner "tu sesión anterior no se pudo recuperar tras una actualización".
**Warning signs:** Beta tester reports "perdí mis sets" right after a deploy.

### Pitfall 6: Auto-save thrashes localStorage on every timer tick
**What goes wrong:** `localStorage.setItem` is synchronous; calling it 60 times/sec freezes the main thread.
**Why it happens:** Naïve `useEffect(() => saveSnapshot(state), [state])` triggers on every ms-resolution tick if the timer's remaining-ms is part of state.
**How to avoid:** Keep `Date.now()`-derived values OUTSIDE state (Pattern 2 keeps `remainingMs` purely derived in the hook). State only contains `restEndAt` (immutable for the duration of one rest). Auto-save fires only on FSM transitions.
**Warning signs:** UI sluggish during rest; profiler shows constant `setItem` calls.

### Pitfall 7: Visibility API not firing on iOS lock screen
**What goes wrong:** User locks screen → unlocks → timer should re-evaluate → it doesn't.
**Why it happens:** iOS sometimes fires `pageshow` / `pagehide` instead of `visibilitychange` when the page is restored from BFCache.
**How to avoid:** Listen to BOTH `visibilitychange` AND `pageshow`. On `pageshow`, force a `setNow(Date.now())`.
**Warning signs:** Timer "frozen" after unlocking phone, jumps to correct value only after touching the screen.

### Pitfall 8: Wake Lock survives logical session end
**What goes wrong:** User pauses session → leaves the tab open → battery drains.
**Why it happens:** Forgot to `release()` on transition to `paused`/`completed`/`idle`.
**How to avoid:** `useWakeLock(active: boolean)`'s cleanup function fires on `active` going false. Pair `active` to `state.session.status === 'in_progress'`.
**Warning signs:** Battery complaints.

## Code Examples

### Example A: Computing the next-action selector

```typescript
// src/session/selectors.ts
export type NextAction =
  | { kind: 'log_set'; exerciseIndex: number; setIndex: number; prefill: PrefillValues }
  | { kind: 'rest'; restEndAt: number; nextSetIndex: number; nextExerciseIndex: number }
  | { kind: 'handoff'; nextExerciseIndex: number; visibleUntil: number }
  | { kind: 'summary' }
  | { kind: 'paused' }

export function nextAction(state: SnapshotV3): NextAction {
  const s = state.session
  if (s.status === 'paused') return { kind: 'paused' }
  if (s.status === 'completed') return { kind: 'summary' }
  if (s.rest?.endAt && Date.now() < s.rest.endAt) {
    return { kind: 'rest', restEndAt: s.rest.endAt, /* ... */ }
  }
  if (s.handoff?.visibleUntil && Date.now() < s.handoff.visibleUntil) {
    return { kind: 'handoff', /* ... */ }
  }
  // Find first exercise with status !== 'done' && !== 'skipped'
  const exIdx = s.exercises.findIndex(e => e.status === 'active' || e.status === 'pending')
  if (exIdx === -1) return { kind: 'summary' }  // all done/skipped
  const exercise = s.exercises[exIdx]
  const setIdx = exercise.sets.findIndex(set => set.completed == null)
  // ... return { kind: 'log_set', ... }
}
```

> Why this matters: SESS-01's “sin folio en blanco” is enforced by *exhaustive* return from `nextAction`. The render layer does `switch (next.kind) { ... }` and TypeScript's exhaustiveness check catches missing cases.

### Example B: Rest deviation calculation

```typescript
// src/utils/restDeviation.ts
export interface RestDeviationStats {
  meanDeltaSeconds: number    // positive = descansaste de más; negative = de menos
  countedSets: number         // sets que tienen ambos rest_planned_s y rest_actual_s
  totalCompletedSets: number  // sanity check
}

export function computeRestDeviation(snapshot: SnapshotV3): RestDeviationStats {
  const allSets = snapshot.session.exercises
    .filter(e => e.status === 'done' || e.status === 'active')
    .flatMap(e => e.sets)
  const completed = allSets.filter(s => s.completed != null)
  const eligible = completed.filter(
    s => s.completed?.rest_planned_s != null && s.completed?.rest_actual_s != null
  )
  if (eligible.length === 0) {
    return { meanDeltaSeconds: 0, countedSets: 0, totalCompletedSets: completed.length }
  }
  const totalDelta = eligible.reduce(
    (acc, s) => acc + (s.completed!.rest_actual_s! - s.completed!.rest_planned_s!),
    0
  )
  return {
    meanDeltaSeconds: totalDelta / eligible.length,
    countedSets: eligible.length,
    totalCompletedSets: completed.length,
  }
}
```

> Why edge cases matter: the **last set of the last exercise** has no rest after it (D-14 doesn't dictate, but logically). It will have `rest_planned_s` but `rest_actual_s == null` because no rest fires. Excluding it from the mean is correct; counting it would skew the average toward zero deviation. Edge cases handled: skipped exercises excluded; manual "skip rest" still records `rest_actual_s = (now - restStartedAt) / 1000`.

### Example C: Zod V3 schema (extending Phase 1)

```typescript
// src/persist/schema.ts (extended)
export const SCHEMA_VERSION = 3 as const

export const CompletedSetSchema = z.object({
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  rir: z.number().int().min(0).max(4),         // RPE handled via preferences toggle separately
  at: z.string(),                              // ISO 8601 timestamp
  rest_planned_s: z.number().nonnegative().optional(),
  rest_actual_s: z.number().nonnegative().optional(),
})

export const ExerciseSetSchemaV3 = z.object({
  setId: z.string(),
  planned: z.object({ reps: z.number().int().nonnegative() }),
  completed: CompletedSetSchema.optional(),
})

export const ExerciseSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'active', 'done', 'skipped']),
  currentSetIndex: z.number().int().nonnegative(),
  sets: z.array(ExerciseSetSchemaV3),
})

export const RestStateSchema = z.object({
  startedAt: z.string(),                       // ISO
  endAt: z.number().int(),                     // epoch ms — math foundation (Pattern 2)
  plannedSeconds: z.number().nonnegative(),
  exerciseIndex: z.number().int().nonnegative(),
  setIndex: z.number().int().nonnegative(),
})

export const HandoffStateSchema = z.object({
  visibleUntil: z.number().int(),              // epoch ms
  nextExerciseIndex: z.number().int().nonnegative(),
})

export const SessionSchemaV3 = z.object({
  status: z.enum(['idle', 'in_progress', 'paused', 'completed']),
  id: z.string().optional(),
  startedAt: z.string().optional(),
  exercises: z.array(ExerciseSchema),
  currentExerciseIndex: z.number().int().nonnegative(),
  rest: RestStateSchema.nullable().optional(),
  handoff: HandoffStateSchema.nullable().optional(),
})

export const PreferencesSchemaV3 = z.object({
  goalFocus: z.enum(['strength', 'hypertrophy', 'fat_loss']),
  equipmentNote: z.string().max(200),
  restAlertSound: z.boolean().default(true),
  restAlertVibration: z.boolean().default(true),
  effortMetric: z.enum(['rir', 'rpe']).default('rir'),
})

export const SnapshotV3Schema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  preferences: PreferencesSchemaV3.optional(),
  session: SessionSchemaV3,
})

export type SnapshotV3 = z.infer<typeof SnapshotV3Schema>
```

### Example D: V2 → V3 migration

```typescript
// src/persist/snapshot.ts (extended)
function migrateV2toV3(v2: SnapshotV2): SnapshotV3 {
  const legacyExercise: Exercise = {
    exerciseId: 'legacy-0',
    name: v2.session.exerciseName,
    status: 'pending',
    currentSetIndex: 0,
    sets: v2.session.sets.map(s => ({
      setId: s.setId,
      planned: s.planned,
      completed: undefined,                    // D-25: old sets aren't "completos recuperables"
    })),
  }
  return {
    schemaVersion: 3,
    preferences: v2.preferences && {
      ...v2.preferences,
      restAlertSound: true,
      restAlertVibration: true,
      effortMetric: 'rir',
    },
    session: {
      status: 'idle',                          // D-25: reset to idle
      id: undefined,
      startedAt: undefined,
      exercises: [legacyExercise],
      currentExerciseIndex: 0,
      rest: null,
      handoff: null,
    },
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval` accumulator timers | `endAt` + `Date.now()` delta on each frame | always (well known); critical for mobile after Chrome's tab-throttling tightening (~Chrome 88 / 2021) | timers stay accurate during sleep / lock |
| Polling `audioContext.state` for unlock | `await ctx.resume()` Promise resolves on unlock | Web Audio spec update + iOS 14.5+ | one-line gesture priming |
| "NoSleep.js" silent-video hack | Screen Wake Lock API | Safari 16.4 (March 2023) added support — last major holdout | drop the hack, feature-detect Wake Lock |
| Vibration cross-platform polyfills (`switch input` haptic hack on iOS) | Feature detect, accept iOS gap | WebKit publicly opposes Vibration API (Interop 2025 rejected proposal) | ship with iOS gap; visual + audio still hit the user |
| Heavy state libs (Redux, MobX) for FSMs | `useReducer` with discriminated-union actions; or XState if states get big | React 16.8+ | for ~10-action FSMs, plain reducer is enough; no dep |

**Deprecated/outdated:**
- `webkitAudioContext` polyfill check — still useful as a fallback constructor (`window.AudioContext || (window as any).webkitAudioContext`) for old Safari, but Safari 14.1+ has unprefixed.
- `ScriptProcessorNode` for any audio analysis — deprecated; not relevant here (we only synthesize, no input).
- `localStorage` for primary data store at scale — *not yet* deprecated for this v1 size (single-user, tiny snapshot), but the project should expect to migrate to Dexie when history (Phase 5) lands. **Phase 2 sticks with localStorage** per D-22.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (already configured, used in `src/persist/snapshot.test.ts`) |
| Config file | `vite.config.ts` (vitest config inline) — **verify in plan** |
| Quick run command | `npm test -- --run` (or `npx vitest run`) |
| Full suite command | `npm test -- --run && npx playwright test` |
| Mock Date | `vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'setTimeout', 'requestAnimationFrame'] })` + `vi.setSystemTime(new Date(...))` + `vi.advanceTimersByTime(ms)` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-01 | `nextAction()` is exhaustive — never returns `undefined` for any reachable FSM state | unit | `npx vitest run src/session/selectors.test.ts` | ❌ Wave 0 |
| SESS-01 | FSM never transitions into a "no next action" state when `status === 'in_progress'` | unit (property-test style: enumerate transitions) | `npx vitest run src/session/reducer.test.ts -t "no folio en blanco"` | ❌ Wave 0 |
| SESS-01 | E2E: from `idle`, user can complete a set + see rest + see next set without empty screen | e2e | `npx playwright test tests/e2e/guided-session.spec.ts -g "no empty screen"` | ❌ Wave 0 |
| SESS-02 | Schema accepts a complete set: `{reps, weight, rir, at}`; rejects negative reps, RIR > 4 | unit | `npx vitest run src/persist/schema.test.ts -t "completed set"` | ❌ Wave 0 (extend) |
| SESS-02 | Reducer LOG_SET stores `at` ISO from action payload (deterministic) | unit | `npx vitest run src/session/reducer.test.ts -t "LOG_SET"` | ❌ Wave 0 |
| SESS-02 | E2E: user types reps + weight + selects RIR + presses ✓ Hecho → set persists across reload | e2e | `npx playwright test tests/e2e/guided-session.spec.ts -g "set persists"` | ❌ Wave 0 |
| SESS-04 | Reducer SKIP_EXERCISE marks exercise.status = 'skipped' and advances index | unit | `npx vitest run src/session/reducer.test.ts -t "SKIP_EXERCISE"` | ❌ Wave 0 |
| SESS-04 | Reducer UNDO_SKIP within 5s window restores status to previous value | unit | `npx vitest run src/session/reducer.test.ts -t "UNDO_SKIP"` | ❌ Wave 0 |
| SESS-04 | Summary computeStats counts skipped vs done exercises correctly | unit | `npx vitest run src/utils/restDeviation.test.ts -t "summary"` | ❌ Wave 0 |
| REST-01 | Timer with `endAt = now + 1500` returns `remaining = 0` after `vi.advanceTimersByTime(1500)` | unit | `npx vitest run src/hooks/useRestTimer.test.ts` | ❌ Wave 0 |
| REST-01 | Timer correctly catches up after simulated 60s "background" gap (mocked Date.now jumped) | unit | `npx vitest run src/hooks/useRestTimer.test.ts -t "background catchup"` | ❌ Wave 0 |
| REST-01 | Reducer transitions `in_progress` (set just logged) → `rest active` only on LOG_SET, never spontaneously | unit (invariant) | `npx vitest run src/session/reducer.test.ts -t "rest invariant"` | ❌ Wave 0 |
| REST-01 | E2E: complete set → strip shows countdown → end-of-rest visual flash fires | e2e | `npx playwright test tests/e2e/rest-timer.spec.ts -g "rest fires"` | ❌ Wave 0 |
| REST-02 | `computeRestDeviation` returns mean delta in seconds; excludes sets without rest_actual_s | unit | `npx vitest run src/utils/restDeviation.test.ts` | ❌ Wave 0 |
| REST-02 | `computeRestDeviation` returns 0 mean / 0 count when no eligible sets | unit | `npx vitest run src/utils/restDeviation.test.ts -t "empty"` | ❌ Wave 0 |
| REST-02 | E2E: complete 2 sets, summary shows non-zero mean deviation | e2e | `npx playwright test tests/e2e/summary.spec.ts -g "deviation"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (Vitest unit suite; Playwright omitted for speed).
- **Per wave merge:** `npm test -- --run && npx playwright test` (full unit + E2E smoke).
- **Phase gate:** Full suite green before `/gsd-verify-work`. Manual UAT script: start session → log 2 sets in exercise A → skip exercise B → finish exercise C → see summary with non-zero deviation and "1 saltado".

### FSM Invariants (the property-test set)

These are unit-testable assertions that any sequence of valid actions must preserve. The plan should encode them as one test file `src/session/reducer.invariants.test.ts`.

| Invariant | Statement |
|-----------|-----------|
| INV-01 | Si `session.status === 'in_progress'` y no hay `rest`, existe al menos un `exercise` con `status === 'pending' \| 'active'` y un `set` con `completed == null` (next action no vacía). |
| INV-02 | `rest` solo puede aparecer inmediatamente después de un `LOG_SET` exitoso. No hay transición `idle → rest` ni `START_SESSION → rest`. |
| INV-03 | Cualquier set con `completed != null` tiene `completed.at` válida y `completed.reps >= 0`, `completed.weight >= 0`, `completed.rir ∈ [0, 4]`. |
| INV-04 | `rest_actual_s` solo se calcula al cerrar un descanso (`REST_DONE`/`SKIP_REST`/`LOG_SET` siguiente), nunca durante `TICK`. |
| INV-05 | `restEndAt` es siempre `>= rest.startedAt + plannedSeconds * 1000` en el momento de la transición a rest activo. |
| INV-06 | `currentExerciseIndex` siempre apunta a un ejercicio con `status === 'active' \| 'pending'` o iguala `exercises.length` (sesión completada). |
| INV-07 | `UNDO_SKIP` es válido solo dentro de los 5000ms posteriores a `SKIP_EXERCISE` para el mismo ejercicio (D-17). |
| INV-08 | Pasar `PAUSE` no destruye `rest`/`handoff`; `RESUME` los restaura tal cual; `DISCARD` los limpia y vuelve a `idle`. |
| INV-09 | El total de `done + skipped` ejercicios + (1 si hay activo) <= `exercises.length`. |
| INV-10 | `migrateV2toV3` aplicado seguido de `SnapshotV3Schema.parse` no lanza para ningún snapshot V2 generado por `createInitialSnapshot()` extendido con sets variados. |

### Timer Accuracy Bounds

| Metric | Bound | Test Method |
|--------|-------|-------------|
| Drift after 90s active foreground | < 50ms | `vi.useFakeTimers` + advance in 16.6ms steps for 90 / 0.0166 frames + assert `remainingMs === 0` exactly when `Date.now() >= endAt` |
| Drift after simulated 60s background gap | < 50ms | Set `endAt`, advance Date.now by 60_000 ms in one jump (no rAF), then dispatch `visibilitychange` → assert `remainingMs` matches `endAt - Date.now()` |
| End-of-rest fires exactly once | exactly 1 dispatch of `REST_DONE` | spy on `dispatch`; advance well past `endAt`; assert callcount === 1 |

### Persistence Invariants

| Invariant | Test |
|-----------|------|
| Round-trip: any V3 snapshot saved + loaded === original | `expect(loadSnapshot()).toEqual({ ok: true, snapshot: original })` |
| Migration is monotonic: `migrate(migrate(v1)) === migrate(v1)` (idempotent on V3) | snapshot V3 fed back yields itself |
| Every committed `completed.at` parses to a valid ISO date | `expect(() => new Date(completed.at)).not.toThrow()` |
| `saveSnapshot` returns `{ok: false, reason: 'quota_exceeded'}` when localStorage full (mock) | mock `Storage.prototype.setItem` to throw QuotaExceededError |

### E2E Scenarios (Playwright)

1. **Happy path:** wizard → start session (mini-rutina seed) → log set 1 with reps/weight/RIR → see strip with countdown → wait short rest (use `--rest-fast` URL param to compress to 2s for tests) → next set prompt visible → log set 2 → finish all sets → handoff to exercise 2 → finish exercise 2 → summary visible with set count and deviation chip.
2. **Skip path:** during exercise 1, user taps "Saltar" → toast appears with "Deshacer" → wait 6s → toast gone → exercise marked skipped → summary shows "1 saltado".
3. **Skip + undo:** as above but tap "Deshacer" within 5s → exercise restored to pending.
4. **Pause/resume:** during set entry, tap "Pausar" → status `paused` → reload page → prompt "¿Retomar o descartar?" appears → "Retomar" → state restored.
5. **Pause/discard:** as above but choose "Descartar" → returns to empty state → snapshot's session is `idle` (preferences preserved).
6. **Migration:** seed localStorage with a V2 snapshot containing completed sets → load app → user sees idle empty state with mini-rutina (legacy sets visible inside one "legacy" exercise OR not shown per planner choice from D-25).

### Wave 0 Gaps

- [ ] `src/session/reducer.ts` + `src/session/reducer.test.ts` + `src/session/reducer.invariants.test.ts` — covers SESS-01 (FSM), SESS-04 (skip), REST-01 (rest transitions)
- [ ] `src/session/selectors.test.ts` — covers SESS-01 nextAction exhaustiveness
- [ ] `src/hooks/useRestTimer.test.ts` — covers REST-01 timer accuracy bounds
- [ ] `src/persist/schema.test.ts` (extend existing if any; otherwise create) — covers SESS-02 schema validation
- [ ] `src/persist/snapshot.test.ts` — extend with V2→V3 migration tests (covers data fidelity / no data loss)
- [ ] `src/utils/restDeviation.test.ts` — covers REST-02 mean calculation + edge cases
- [ ] `tests/e2e/guided-session.spec.ts` — happy path + reload (extend Phase 1 e2e)
- [ ] `tests/e2e/rest-timer.spec.ts` — rest fires + skip rest
- [ ] `tests/e2e/skip-undo.spec.ts` — D-17 toast undo flow
- [ ] `tests/e2e/pause-resume.spec.ts` — D-04 pause prompt
- [ ] **Test-mode fast-rest knob** — planner must add a development-only mechanism to compress rest durations (e.g., a `?rest=2` URL param that overrides plannedSeconds in dev/test). Without this, Playwright tests must wait 60–180s. Recommended: read from `import.meta.env.DEV` + URL param.

## Open Questions / Risks

1. **Pre-fill from a previous session vs current session only.**
   - What we know: D-06 says "set anterior del mismo ejercicio en la sesión actual". Primer set ↦ planned.
   - What's unclear: ¿qué pasa si reanudas una sesión `paused` que ya tiene un set logueado del ejercicio actual? (Asumimos: pre-fill usa el último set logueado del mismo `Exercise`, sea de antes o después de la pausa.)
   - Recommendation: planner explicita "último set con `completed != null` dentro del mismo `Exercise` del snapshot actual; si ninguno, usa `planned.reps` y `weight = 0`". Documentar en task.

2. **Hand-off "Empezar ya" vs cuenta atrás 3s.**
   - What we know: D-18 says ~3s con counter visible + botones.
   - What's unclear: ¿se persiste el `handoff.visibleUntil` en el snapshot? ¿Sobrevive un reload?
   - Recommendation: SI persistir (Pattern 2 lo exige). En reload, si `visibleUntil < Date.now()`, transición automática a `LOG_SET` del nuevo ejercicio.

3. **Test-mode fast-rest — feature-flagged or always-on in dev?**
   - What we know: necesario para Playwright (no esperar 180s reales).
   - What's unclear: ¿lo dejamos en `if (import.meta.env.DEV)`? ¿O detrás de un URL param `?test=1`?
   - Recommendation: URL param leído al iniciar sesión, valor que multiplica todas las duraciones por una fracción (e.g., `?rest=0.05`). Más explícito que `import.meta.env.DEV` (no se cuela en builds de prod por accidente).

4. **Edición de un set ya completado (D-09).**
   - What we know: tap en el chip reabre la edición.
   - What's unclear: si editas un set ya completado durante un descanso activo del set siguiente, ¿afecta `rest_actual_s` de algún set?
   - Recommendation: edición es local al set tocado (reps/weight/rir/RIR); NO modifica timestamps ni rest fields. Documentar en CONVENTIONS y test.

5. **iOS — sonido cuando la app está en background.**
   - What we know: D-09 Phase 1 prohíbe PWA / system notifications.
   - What's unclear: si el usuario bloquea la pantalla durante un descanso, ¿debería sonar el beep igualmente?
   - Recommendation: NO. AudioContext suspende al perder foco; al volver, el delta ya pasó pero podemos disparar un beep tardío en `visibilitychange` si `restEndAt < Date.now()`. Aceptable como UX "discreto" — no bloquea REST-01 si la pestaña está visible.

6. **Wake Lock degrada batería.**
   - What we know: D-23 acepta el coste durante `in_progress`.
   - What's unclear: ¿advertimos al usuario? ¿toggle en preferencias?
   - Recommendation: NO toggle inicial. Si hay queja en UAT, añadir `Preferences.keepScreenAwake` después.

## PWA & Offline Considerations

> **CONTEXT.md D-09 Phase 1 (heredado): NO PWA, NO service worker.** Phase 2 honra esta decisión. Las consideraciones que siguen son para enmarcar QUÉ NO HACEMOS y por qué es OK.

| Concern | Phase 2 Strategy |
|---------|------------------|
| Service worker update during a live session | N/A — no SW. La pestaña no se interrumpe por activación de SW porque no hay SW. Reload es la única forma de recargar el JS. |
| Background timers cuando la pestaña pierde foco | Pattern 2 (drift-free `endAt` math) sobrevive throttling sin SW. Wake Lock D-23 mantiene la pantalla encendida durante el entreno. |
| Notificaciones del sistema al fin del descanso | OUT OF SCOPE per D-10 Phase 1. Aviso es 100% in-app: visual + audio + vibración. |
| Cache budget para audio | N/A — no usamos asset MP3/OGA. Web Audio sintetiza el beep. Cero overhead de cache. |
| Funcionar offline | localStorage + JS bundle ya descargado funciona offline. La app es estática; abrir desde cache del navegador en avión funciona si el bundle ya cargó al menos una vez. **No prometemos PWA install.** |
| Wake Lock bajo battery saver | El navegador puede negar la request. D-23 dice "fallback silencioso" — es exactamente el comportamiento correcto. |

## Routing / "Next Action" Guarantee

**Constraint inherited from Phase 1 D-13:** single page, no routes. TanStack Router is **out of scope** (D-22).

**Strategy:**
- `App.tsx` mantiene un `useReducer` con el snapshot. La JSX condicional renderiza una de N "vistas" (no rutas) basándose en un único selector `nextAction(state)`.
- La vista renderizada es exhaustiva: `'log_set' | 'rest' | 'handoff' | 'summary' | 'paused'` cubren TODOS los estados reachables. TypeScript exhaustiveness check garantiza que no hay caso "vacío".
- En reload, `loadSnapshot()` restaura el estado completo. `nextAction()` recomputa la vista desde el snapshot. Si una `rest.endAt` ya pasó al recargar, el reducer dispatcha `REST_DONE` durante el bootstrap. Si un `handoff.visibleUntil` pasó, ditto.
- Persistencia mid-set: la `dirty state` de un set en edición (reps/weight/rir tipeados pero no confirmados) **no se persiste hasta `LOG_SET`**. Esto matchea Phase 1's "auto-save granularity = transición FSM, no input keystroke". Cost: si el navegador muere mid-tipeado, el usuario pierde lo escrito en ese set. Mitigación opcional (Claude's discretion): persistir un `draft` por exercise cada 1s con debounce, NO requerido por requirements.

**Why this beats TanStack Router for this phase:** routing añade URL state que el wizard/empty/session flow no necesita; Phase 1 ya estableció el patrón "App.tsx orquesta vistas"; introducir router contradice D-22 y D-13.

## Skip / Redo / Reorder

### Skip exercise (D-16, D-17)

**Data:** `Exercise.status = 'skipped'`. No se borra; el ejercicio persiste en `exercises[]`.

**UX:** Botón "Saltar" en cabecera del ejercicio activo + menú overflow (•••) en cada chip. Tap → toast "Saltado · Deshacer" durante 5s → `dispatch({ type: 'SKIP_EXERCISE', exerciseIndex })`.

**Within 5s:** mientras el toast está visible, el reducer aún acepta `UNDO_SKIP`. Implementación: el toast component mantiene un `setTimeout(5000)` y `dispatch({ type: 'UNDO_SKIP' })` se llama desde su botón "Deshacer". Después de 5s, el toast desaparece y el undo deja de estar disponible.

**Auto-advance:** después de skip (con o sin undo dentro del window), si el ejercicio siguiente está `pending`, transiciona a `handoff` (~3s) → `active`.

### Redo (re-do skipped exercise)

**Data:** `Exercise.status = 'pending'` again (restaurar desde 'skipped').

**UX:** después de los 5s del toast, el undo "fácil" expira. Para des-saltar, el usuario toca el chip skipped en la cinta → menú overflow → "Reanudar". Esto dispatcha una versión "manual" de `UNDO_SKIP`.

**Edge case:** si el ejercicio venía después en orden y ahora se reanuda, ¿se inserta antes del actual? Recomendación: el orden NO cambia; el ejercicio reanudado se ejecuta DESPUÉS del actual (el flujo continúa). Solo el `status` cambia.

### Reorder

**Out of scope para Phase 2.** Mini-rutina seed-en-código (D-15) tiene orden fijo. Reordenar usuarios llega con Phase 3 (biblioteca). El schema NO necesita un campo `position` porque `exercises[]` es ordenado por índice.

### Edit a completed set (D-09)

**Data:** modificar `completed.{reps, weight, rir}` del set tocado. NO tocar `completed.at` (timestamp original) ni `completed.rest_*` (descanso original).

**UX:** tap en el chip de un set ya hecho en la cinta → reabrir card de edición → guardar dispatcha `EDIT_SET` con el patch.

**Test:** asserting `completed.at` no cambia tras `EDIT_SET`.

### Skip rest (D-12)

**Data:** al disparar `SKIP_REST`, el reducer fija `rest_actual_s = (Date.now() - rest.startedAtMs) / 1000` para el último set logueado, y limpia `session.rest`.

**UX:** botón "Saltar" siempre disponible en strip o panel.

**Edge case en deviation:** un rest skipped tiene `rest_actual_s` válido (= tiempo realmente transcurrido). Se incluye en el cálculo. Esto refleja la realidad ("descansé 30s, salté el resto").

## Rest Deviation Summary

**Formula (REST-02 + D-14, D-19):**

\[
\text{meanDelta}_s = \frac{1}{|S|} \sum_{s \in S} (\text{rest\_actual\_s} - \text{rest\_planned\_s})
\]

donde \(S\) = sets con `completed != null` AND `rest_actual_s != null` AND `rest_planned_s != null` AND `Exercise.status \in \{'done', 'active'\}` (skipped excluido).

**Edge cases:**

| Case | Behavior |
|------|----------|
| Último set del último ejercicio (ningún rest tras él) | `rest_planned_s` se asigna por D-13 al iniciar el descanso, pero como no hay descanso después, `rest_actual_s == null`. **Excluido del mean.** |
| Set con `SKIP_REST` antes de que termine el descanso | `rest_actual_s` = tiempo real transcurrido. **Incluido en el mean** (delta probablemente negativo). |
| Set en ejercicio `skipped` | Excluido del cálculo entero (no es un set "hecho"). |
| Sesión sin sets logueados (saliste sin completar ninguno) | `meanDeltaSeconds = 0`, `countedSets = 0`. UI muestra "—" o esconde el chip. |
| Sesión con 1 set logueado y rest aún activo al cerrar | El set tiene `rest_planned_s` pero `rest_actual_s == null` aún. Excluido. |
| Manual edit de rest_planned_s después del set (D-13 tap largo) | El cálculo usa el valor PERSISTIDO en el momento del set, no el actual. (Decisión de research: `rest_planned_s` se "freeze" al iniciar el descanso del set, no se actualiza retroactivamente.) |

**Display (D-19):** chip "✓ N sets · Skipped: M" + chip "Δ descanso: +12s" (verde si negativo o cerca de 0; ámbar si >30s; rojo si >60s) — Claude's discretion sobre umbrales.

**Per-set indicator (D-14):** en la cinta superior cada chip de set hecho muestra `✓ 92s ↑+2s` (estilo: arrow up = más descanso del prescrito; arrow down = menos).

## Set Logging Forms & Validation

### UX (D-05, D-08)

- **Reps stepper:** `[ - ]  8  [ + ]` — tap en el número abre numpad nativo (`<input inputmode="numeric" pattern="[0-9]*">`), tap fuera o Enter confirma. Long-press en `+`/`-` acelera (200ms inicial → 80ms tras 800ms presionando).
- **Weight stepper:** idéntico, paso ±2.5 kg, valor inicial pre-fill (D-06).
- **RIR chips (D-07):** botones grandes 0–4, "0 = fallo" como label pequeño bajo el "0". Selección única, persistente al cambiar set.
- **Confirm:** botón **"✓ Hecho"** (≥56×56, color `--primary-2`). Disabled mientras `reps == null` o `weight == null` (RIR puede defaultear a 2).

### Validation (Zod)

```typescript
export const SetInputSchema = z.object({
  reps: z.number().int().min(0).max(99),       // 0 = fallo (D-09)
  weight: z.number().min(0).max(999),          // 0 permitido para peso corporal (D-09)
  rir: z.number().int().min(0).max(4),
})
```

Aplicar `safeParse` en `onClick` del botón "✓ Hecho"; mostrar inline error si falla.

### Why no React Hook Form

- D-22 prohíbe nuevas deps "no esenciales".
- El form tiene **3 fields** (reps, weight, rir). RHF gana en perf con >5 fields y muchos rerenders; aquí los rerenders son trivialmente baratos.
- Phase 1 ya usa controlled `useState` en `WizardScreen.tsx`. Consistencia > marginal perf gain.
- Si en Phase 4+ aparecen formularios complejos (PRs con contexto), reevaluar.

### Mobile keyboard hygiene

- `<input type="text" inputmode="numeric" pattern="[0-9]*">` evita el teclado completo en iOS (la combinación `inputmode="decimal"` para weight si se permiten decimales — recomendación: usar enteros + `inputmode="numeric"` + paso 2.5 → multiplicar internamente; muestra "2.5" pero almacena 25 décimas; **alternativa más simple: solo enteros (kg redondo)** — Claude's discretion).
- `autocomplete="off"`, `autocapitalize="off"` en todos los inputs numéricos.
- `enterkeyhint="done"` en el último input para que el teclado muestre "Hecho".

## Persistence Schema (Dexie? No — single localStorage key + Zod)

**Storage:** `localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))` — único objeto, ya el patrón de Phase 1.

**Indexing:** N/A — el snapshot es un objeto enraizado, no una colección. Lookups son en memoria.

**Write strategy:**
- **Persist on FSM transition only** (LOG_SET, START_SESSION, SKIP_EXERCISE, PAUSE, RESUME, REST_DONE, ADVANCE_TO_NEXT_EXERCISE, EDIT_SET, DISCARD, etc.).
- **Do NOT persist on TICK** — TICK no muta state, solo causa rerender via `useRestTimer`'s internal `setNow`.
- **Do NOT persist on draft input** (reps tipeados pero no confirmados). El input local vive en `useState` del componente del set. Phase 1 tampoco lo hace.
- Persistir es síncrono (`localStorage.setItem`); con un snapshot ~10KB es <2ms.

**Concurrency:** N/A — single-tab use case asumido. Si se abre otra pestaña y dispatcha, las dos tabs se pisan. Mitigación opcional (Claude's discretion): añadir un `storage` event listener que recargue snapshot si `key === STORAGE_KEY`. NO requerido por requirements.

**Per-set transaction:** localStorage no tiene transacciones reales, pero como persistimos el snapshot completo en cada transición, **la atomicidad es trivial**: o el snapshot escribe entero o no escribe. La única semántica de "perder un set" sería un crash entre `dispatch(LOG_SET)` y `localStorage.setItem` (microsecond window). Aceptable.

**Index strategy for "session summary":** la lista de ejercicios + sets vive en `snapshot.session.exercises[]`. Iterar es O(N) con N ≤ 4 ejercicios × ~5 sets = 20 elementos. Sin índices.

**Future migration to Dexie:** cuando Phase 5 (history) requiera persistir múltiples sesiones pasadas, **entonces** se introduce Dexie. En Phase 5 hay un volumen >> Phase 2. La migración será: `Dexie.sessions.put(snapshot.session)` al finalizar; localStorage deja de ser system of record. Phase 2 NO toca esto.

## Audio Cues

### Recommended approach: WebAudio synthesis (no asset)

**Why no asset (mp3/wav/oga):**
- Bundling el más pequeño beep (~5-10KB) infla el bundle estático.
- Sin SW (D-09 Phase 1) no hay precache → cada cold load lo descarga otra vez.
- WebAudio synthesis es <30 líneas y no agrega bytes al bundle.

### iOS gesture priming pattern (verified April 2026)

(See Pattern 3 above for code.)

**Triggers para llamar `primeAudioOnGesture()`:**
1. Click en "Iniciar sesión" → primer evento de usuario en la pestaña.
2. Click en "Reanudar" después de pause → reactiva si fue hibernado.
3. Click en "✓ Hecho" → cinturón y tirantes; útil si el primer set tarda más que el lifetime del AudioContext.

Ya idempotente: si `ctx.state === 'running'`, no hace nada.

### Beep design (Claude's discretion)

- Frequency 880Hz (A5) — clear, not annoying.
- Duration 180ms.
- Soft attack (10ms ramp up) y soft release (full duration ramp down) para evitar click.
- Volume nominal 40% del max (gain.gain = 0.4) — audible sin ser estridente.
- (Optional) doble beep: 880Hz + 660Hz a 100ms separación para "fin de descanso" diferenciado.

### Preferences toggle (D-11)

- `Preferences.restAlertSound: boolean` (default true).
- Si false, el reducer/hook **no llama beep()** al dispatchear `REST_DONE`. Visual flash + vibración (si toggle activo) siguen.

### Vibration

```typescript
// src/hooks/useVibration.ts
export function vibrate(pattern: number | number[]) {
  if (!('vibrate' in navigator)) return false  // iOS Safari path
  return (navigator as any).vibrate(pattern)
}
```

Pattern recomendado para fin de rest: `[150, 100, 150]` (zumbido-pausa-zumbido). En iOS el feature detection devuelve true (la propiedad existe), pero la llamada es no-op silenciosa — comportamiento correcto.

> **Verified April 2026:** caniuse mdn-api_navigator_vibrate confirms iOS Safari 26.5 still NOT supported. Recent issue mdn/browser-compat-data#29166 (March 2026) reported "vibrate works on iOS now" but the discoverer self-corrected: it's a hack via the `<input type="checkbox" switch>` haptic feedback, NOT real `navigator.vibrate()` support. Treat as unavailable on iOS.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node` | dev/build/test | (already validated in Phase 1) | 22 | — |
| `npm` | install/test | ✓ (Phase 1) | latest | — |
| `vitest` | unit tests | ✓ (already in project) | from Phase 1 lockfile | — |
| `@playwright/test` + browsers | E2E | ✓ (already in project) | from Phase 1 lockfile | — |
| Browser Wake Lock API | runtime D-23 | ✓ on Safari 16.4+, Chrome 85+, Firefox 126+ | per browser | silent no-op (D-23) |
| Browser Web Audio API | runtime D-11 sound | ✓ on all targets | per browser | silent no-op (sonido OFF) |
| Browser Vibration API | runtime D-11 vibración | ✓ on Android Chrome/Firefox/Edge; ✗ on iOS Safari | per browser | silent no-op (D-11 implícito) |

**Missing dependencies with no fallback:** None — all phase work runs offline on the existing dev machine.

**Missing dependencies with fallback:** Wake Lock + Vibration on iOS — graceful degradation per D-23 + D-11.

## Testing Strategy

### Unit (Vitest, jsdom)

**Setup:**
```typescript
// vitest.config.ts already wired in Phase 1
test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] }
```

**Mocking time:**
```typescript
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'setTimeout', 'requestAnimationFrame'] })
  vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
})
afterEach(() => vi.useRealTimers())
```

**Mocking Web APIs:**
- `AudioContext`: stub `globalThis.AudioContext = class { state='running'; createOscillator(){...}; createGain(){...}; resume(){return Promise.resolve()}; ... }`.
- `navigator.wakeLock`: stub `(navigator as any).wakeLock = { request: vi.fn().mockResolvedValue({ release: vi.fn(), addEventListener: vi.fn() }) }`.
- `navigator.vibrate`: stub `(navigator as any).vibrate = vi.fn(() => true)`.

**FSM tests:**
- Pure reducer; no React imports needed in `reducer.test.ts`.
- One test per action × edge case (24-30 tests for full coverage).
- Invariants file (`reducer.invariants.test.ts`) loops through random valid action sequences and asserts INV-01..10 hold.

**Hook tests (with `@testing-library/react`):**
- `useRestTimer.test.ts`: `renderHook(() => useRestTimer(endAt, onDone))` + `act(() => vi.advanceTimersByTime(1500))` + assert `onDone` called.
- `useWakeLock.test.ts`: assert `request('screen')` called when `active` flips true; `release()` called on cleanup.

### Integration (Vitest + jsdom)

- Render `<App>` with seeded localStorage; click through flow with `userEvent.click`. Faster than Playwright for FSM verification.

### E2E (Playwright)

Already in the project (Phase 1). Extend with Phase 2 specs:
- `tests/e2e/guided-session.spec.ts`
- `tests/e2e/rest-timer.spec.ts`
- `tests/e2e/skip-undo.spec.ts`
- `tests/e2e/pause-resume.spec.ts`

**Time compression for E2E:** introduce `?test=1&restMul=0.05` URL params (Claude's discretion implementation). When `restMul < 1`, multiply prescribed rest by `restMul`. Tests use `restMul=0.05` to make 90s rests last 4.5s.

**Audio in headless:** Playwright headless typically has audio disabled — that's fine, we don't assert audio output. We assert that `dispatch(REST_DONE)` fired by inspecting visible DOM (flash class added, "Listo" copy in strip).

## Sources

### Primary (HIGH confidence)

- **MDN — Screen Wake Lock API:** https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API — used for visibility re-acquire pattern, secure-context requirement, sentinel lifecycle.
- **caniuse — Screen Wake Lock API:** https://caniuse.com/wake-lock — Safari 16.4+ baseline confirmed; iOS Safari 16.4+ baseline confirmed (as of caniuse data April 2026).
- **MDN — `Navigator.vibrate()`:** https://developer.mozilla.org/en-US/docs/Web/API/Navigator.vibrate — confirms "Limited availability"; iOS Safari excluded from baseline.
- **caniuse — Navigator.vibrate:** https://caniuse.com/mdn-api_navigator_vibrate — explicit "Not supported" on Safari iOS through 26.5.
- **MDN — `AudioContext.resume()`:** https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume — "Baseline since April 2021" — Promise-based unlock.
- **MDN — Page Visibility API:** https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — `visibilitychange` for catch-up.
- **Vitest docs (`vi.useFakeTimers`):** https://vitest.dev/api/vi.html — `toFake: ['Date']` covers `Date.now()`.
- **Existing project code:** `src/persist/{schema,snapshot}.ts`, `src/App.tsx`, `src/components/SessionScreen.tsx`, `src/components/EmptyStateScreen.tsx`, `src/index.css`, `src/persist/snapshot.test.ts` — direct authoritative source for Phase 1 baseline.

### Secondary (MEDIUM confidence — verified against MDN/caniuse)

- **HackerNoon / Pavle Goloskokovic — "Unlocking Web Audio — the smarter way":** https://medium.com/hackernoon/unlocking-web-audio-the-smarter-way-8858218c0e09 — gesture priming pattern. Cross-verified with MDN AudioContext.resume.
- **Repo `pavle-goloskokovic/web-audio-unlock`:** https://github.com/pavle-goloskokovic/web-audio-unlock — modernized 2024+ unlock logic; uses `pointerdown`/`pointerup`/`touchstart`/`touchend` listener set with `{capture: true, passive: true}`.
- **Stack Overflow — WakeLock NotAllowedError on iOS:** https://stackoverflow.com/questions/78697618 — confirms iOS requires user gesture before first request.
- **fsjs.dev — "Mastering Screen Wake Lock":** https://fsjs.dev/screen-wake-lock-api-mastering-user-experience — robust visibility re-acquisition pattern.

### Tertiary (LOW confidence — flag for validation)

- **WebKit Bugzilla — `<input type="checkbox" switch>` haptic side-effect:** referenced in MDN BCD issue #29166. Treat as informational, NOT a recommended path. Phase 2 does not depend on it.
- **Web Platform Tests Interop #718, #837:** WebKit's stated opposition to Vibration API. Tertiary because it's policy, not a feature spec.

## Metadata

**Confidence breakdown:**
- Standard stack & "no new deps": **HIGH** — verified against existing `src/`, lockfile pattern, and explicit D-22 lock.
- Architecture (FSM via useReducer, drift-free timer pattern): **HIGH** — well-established React + JS patterns; cross-verified with MDN.
- Web API capabilities (Wake Lock, AudioContext, Vibration): **HIGH** — MDN + caniuse data April 2026.
- iOS-specific gotchas (gesture priming, NotAllowedError): **MEDIUM** — based on multiple developer reports + WebKit blog. Verify on real iOS device during E2E phase.
- Schema migration safety: **MEDIUM** — pattern is sound; specific migration code not yet implemented.
- E2E timing compression: **MEDIUM** — pattern proposed; planner must implement and verify in CI.

**Research date:** 2026-04-26
**Valid until:** ~2026-07-26 (3 months — Web API support is stable; framework versions could shift).

## RESEARCH COMPLETE
