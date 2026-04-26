---
phase: 02-guided-session-rest-timer
verified: 2026-04-26T15:27:00Z
status: human_needed
score: 5/5 success criteria verificados
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "El usuario puede ver la desviación media entre descanso prescrito y real (REST-02) — rest_actual_s ahora se inyecta en REST_DONE y SKIP_REST"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Wake Lock en móvil real"
    expected: "La pantalla no se apaga mientras la sesión está en curso (status === 'in_progress')"
    why_human: "navigator.wakeLock no es simulable en Playwright headless"
  - test: "Cue de audio al expirar el descanso en iOS"
    expected: "Sonido de beep audible en Safari/iOS tras primer gesto de usuario"
    why_human: "AudioContext en iOS requiere gesto previo; el comportamiento real depende del hardware"
  - test: "Vibración al expirar el descanso"
    expected: "El dispositivo vibra brevemente en Android cuando finaliza el descanso"
    why_human: "navigator.vibrate no emulable en Playwright"
  - test: "Dial cónico de RestPanel"
    expected: "El arco --progress aumenta suavemente mientras baja el contador"
    why_human: "Representación visual del CSS conic-gradient no verificable programáticamente"
---

# Fase 2: Guided Session + Rest Timer — Informe de Verificación (Re-verificación)

**Objetivo de fase:** El usuario puede completar una sesión guiada sin "folio en blanco", registrando sets con fidelidad y descansos medidos.  
**Verificado:** 2026-04-26T15:27:00Z  
**Estado:** `human_needed` — todos los must-haves verificados; 4 ítems requieren prueba en dispositivo real  
**Re-verificación:** Sí — tras cierre del gap REST-02 (`rest_actual_s` inyectado en reducer)

---

## Cambios respecto a verificación inicial

| Gap anterior | Estado previo | Estado ahora |
|---|---|---|
| `rest_actual_s` nunca escrito en `REST_DONE`/`SKIP_REST` (REST-02) | ✗ BLOCKER | ✓ CERRADO |

**Regresiones detectadas:** ninguna.

---

## Éxito en el objetivo

### Verdades observables (Success Criteria del ROADMAP)

| # | Verdad (SC) | Estado | Evidencia |
|---|-------------|--------|-----------|
| 1 | La app siempre muestra una "siguiente acción" clara — sin pantalla en blanco (SESS-01) | ✓ VERIFICADO | `selectNextAction` cubre idle/in_progress/paused/completed; SessionScreen tiene rama para cada kind; sin cambios desde verificación inicial |
| 2 | El usuario registra reps, peso, RIR y timestamp por set (SESS-02) | ✓ VERIFICADO | LOG_SET escribe `{ reps, weight, rir, at, rest_planned_s }` en CompletedSet; sin cambios desde verificación inicial |
| 3 | Al completar un set se inicia descanso y al finalizar se avisa (REST-01) | ✓ VERIFICADO | RestStrip + audioCue + vibration intactos; sin cambios desde verificación inicial |
| 4 | El usuario puede omitir un ejercicio y el resumen lo refleja (SESS-04) | ✓ VERIFICADO | SKIP_EXERCISE + UNDO_SKIP + SummaryScreen `status === 'skipped'`; sin cambios desde verificación inicial |
| 5 | El usuario puede ver la desviación media entre descanso prescrito y real (REST-02) | ✓ VERIFICADO | Ver análisis detallado de cierre de gap ↓ |

**Puntuación: 5/5 success criteria verificados**

---

### Análisis de cierre del gap REST-02

#### Nivel 1–3: Existencia, sustancia y conexión

`src/session/reducer.ts` líneas 149–165:

```typescript
case 'SKIP_REST':
case 'REST_DONE': {
  const rest = state.session.rest
  if (rest == null) return state
  const actualSeconds = Math.round((action.payload.nowMs - rest.startedAtMs) / 1000)
  const exercises = state.session.exercises.map((ex, eIdx) => {
    if (eIdx !== rest.exerciseIndex) return ex
    return {
      ...ex,
      sets: ex.sets.map((set, sIdx) => {
        if (sIdx !== rest.setIndex || set.completed == null) return set
        return { ...set, completed: { ...set.completed, rest_actual_s: actualSeconds } }
      }),
    }
  })
  return { ...state, session: { ...state.session, exercises, rest: null } }
}
```

- `rest.startedAtMs` se capturó en el handler `LOG_SET` (línea 81 del reducer) — campo fiable.  
- `action.payload.nowMs` lo inyecta `dispatchTimed` en `App.tsx` — también fiable (pureza del reducer preservada, INV-07 intacto).  
- El handler mapea `exercises` → `sets` usando `rest.exerciseIndex` y `rest.setIndex` — los mismos índices que `LOG_SET` almacenó cuando inició el descanso.  
- Se escribe antes de limpiar `rest: null` — sin window de race.

**Nivel 1:** ✓ Existe  
**Nivel 2:** ✓ Sustancial — cálculo real con ambos timestamps  
**Nivel 3:** ✓ Conectado — el `CompletedSet` modificado persiste en `state.session.exercises`

#### Nivel 4: Traza de flujo de datos

| Artefacto | Variable | Fuente | Datos reales | Estado |
|-----------|----------|--------|--------------|--------|
| `SummaryScreen` chip | `dev.meanDeltaSeconds` | `computeRestDeviation(snapshot)` → itera `rest_actual_s` | ✓ — `rest_actual_s` escrito por `REST_DONE`/`SKIP_REST` → `computeRestDeviation` devuelve `samples > 0` → chip renderiza `+N s` / `-N s` | ✓ FLOWING |
| `FocusCard` reps/weight/rir | `prefill.*` | Último `completed` del mismo ejercicio o `planned.reps` | ✓ Sin cambios | ✓ FLOWING |
| `RestStrip` remainingMs | `selectRestRemainingMs(state, nowMs)` | `state.session.rest.endAt - Date.now()` | ✓ Sin cambios | ✓ FLOWING |

`computeRestDeviation` (sin cambios desde verificación inicial) incluye correctamente el set en el cómputo cuando ambos campos están presentes (línea 37: `if (c.rest_planned_s == null || c.rest_actual_s == null) continue`). Con el reducer corregido, esta condición ya no descarta todos los sets.

---

### Artefactos requeridos

| Artefacto | Estado | Detalles |
|-----------|--------|----------|
| `src/session/reducer.ts` | ✓ VERIFICADO | `REST_DONE`/`SKIP_REST` calculan e inyectan `rest_actual_s`; INV-07 preservado (sin Date.now en reducer) |
| `src/session/selectors.ts` | ✓ VERIFICADO | `selectNextAction` sin cambios — cubre todos los estados; nunca devuelve null |
| `src/utils/restDeviation.ts` | ✓ VERIFICADO | Lógica correcta, recibe muestras reales ahora que el reducer escribe `rest_actual_s` |
| `src/components/session/SummaryScreen.tsx` | ✓ VERIFICADO | Chip renderiza `+N s`/`-N s` con `samples > 0`; clases `summary-chip--ok/warn/bad` aplicadas |
| `e2e/guided-session.spec.ts` | ⚠️ PARCIAL | Aserción REST-02 (línea 97) sigue siendo `toContainText('Δ descanso')` — pasa con "—"; no verifica valor numérico ni `rest_actual_s` en localStorage |

---

### Verificación de enlaces clave

| Desde | Hacia | Vía | Estado |
|-------|-------|-----|--------|
| `REST_DONE`/`SKIP_REST` action | `CompletedSet.rest_actual_s` | Handler calcula `actualSeconds` e inyecta en set por `exerciseIndex`+`setIndex` | ✓ CONECTADO (gap cerrado) |
| `CompletedSet.rest_actual_s` | `computeRestDeviation` | `snapshot.session.exercises[*].sets[*].completed.rest_actual_s` | ✓ CONECTADO |
| `computeRestDeviation` | `SummaryScreen` chip | `dev = computeRestDeviation(snapshot)` → `devLabel` → `{devLabel}` en JSX | ✓ CONECTADO |
| `FocusCard` onClick "✓ Hecho" | `App.tsx handleLogSet` | `props.onLogSet` → SessionScreen → App dispatch | ✓ CONECTADO (sin cambios) |
| `App.tsx dispatchTimed` | `sessionReducer` | `useReducer(sessionReducer)` | ✓ CONECTADO (sin cambios) |
| `App.tsx persistence effect` | `saveSnapshot(state)` | `useEffect([state])` con guarda `lastActionRef.current !== 'TICK'` | ✓ CONECTADO (sin cambios) |

---

### Checks de comportamiento (Spot-checks)

| Comportamiento | Verificación | Estado |
|---|---|---|
| `rest_actual_s` escrito en reducer: `rg "rest_actual_s" src/session/reducer.ts` | 1 coincidencia en línea 160 | ✓ PASA |
| Pureza del reducer (INV-07): `rg "Date\.now\|Math\.random\|crypto\.randomUUID" src/session/reducer.ts` | 0 coincidencias | ✓ PASA |
| Índices correctos: `rest.exerciseIndex` y `rest.setIndex` usados en el map | Confirmado en líneas 155, 158 | ✓ PASA |
| `computeRestDeviation` acepta `rest_actual_s` de tipo `number`: campo en `CompletedSet` es `rest_actual_s?: number` | Verificado en schema | ✓ PASA |
| E2E REST-02 aserción verifica valor numérico: `rg "toContainText.*[0-9]" e2e/guided-session.spec.ts` | 0 coincidencias — solo `'Δ descanso'` (L97) | ⚠️ DÉBIL |

---

### Cobertura de requisitos

| Requisito | Descripción | Estado | Evidencia |
|-----------|-------------|--------|-----------|
| SESS-01 | Sesión guiada sin pantalla en blanco | ✓ SATISFECHO | `selectNextAction`; SessionScreen; E2E happy path |
| SESS-02 | Registrar reps+peso+RIR+timestamp | ✓ SATISFECHO | CompletedSet con todos los campos; E2E 12 sets |
| SESS-04 | Omitir ejercicio refleja en resumen | ✓ SATISFECHO | SKIP_EXERCISE + UNDO_SKIP; SummaryScreen; E2E skip-flow |
| REST-01 | Timer + aviso visual/sonido al finalizar | ✓ SATISFECHO | RestStrip clases; audioCue.beep; E2E verifica "Listo" |
| REST-02 | Desviación prescrito vs real registrada y visible | ✓ SATISFECHO | `rest_actual_s` inyectado en `REST_DONE`/`SKIP_REST`; `computeRestDeviation` devuelve muestras reales; chip renderiza valor numérico |

---

### Anti-patterns detectados

| Archivo | Patrón | Severidad | Impacto |
|---------|--------|-----------|---------|
| `e2e/guided-session.spec.ts` L97 | `toContainText('Δ descanso')` pasa con "Δ descanso: —" | ⚠️ Warning | Sin protección de regresión para REST-02: si se revierten los cambios del reducer, el E2E sigue pasando; recomendado añadir `not.toContainText('—')` o `toMatch(/Δ descanso: [+-]?\d+/)` |
| `e2e/guided-session.spec.ts` L119-124 | Persistencia SESS-02 no verifica `rest_actual_s` en localStorage | ℹ️ Info | No bloquea v1; regresión de datos no detectada por E2E |
| `src/components/session/FocusCard.tsx` — prop `effortMetric` | `effortMetric` de preferences no se refleja (siempre muestra RIR) | ℹ️ Info | D-09 documentado como deferred |
| `App.tsx — handleSelectExercise` | No-op intencional (D-09) | ℹ️ Info | Deferred — chip taps no redirigen |

---

### Verificación humana requerida

#### 1. Wake Lock en móvil real

**Test:** Iniciar sesión en Chrome Android / Safari iOS, dejar el móvil en la mesa  
**Expected:** La pantalla permanece encendida durante el entreno (`status === 'in_progress'`)  
**Why human:** `navigator.wakeLock` no se puede simular en Playwright headless

#### 2. Cue de audio en iOS tras primer gesto

**Test:** Abrir la app en Safari iOS, completar el wizard, tap "Iniciar sesión", esperar que expire el descanso  
**Expected:** Se oye un beep audible (880 Hz, 200 ms) al finalizar el descanso  
**Why human:** AudioContext en iOS requiere `resume()` tras gesto de usuario; comportamiento real depende del hardware/versión de iOS

#### 3. Vibración en Android

**Test:** Mismo flujo en Chrome Android  
**Expected:** El teléfono vibra ~200 ms al finalizar el descanso si `restAlertVibration` está activado  
**Why human:** `navigator.vibrate` no es emulable en Playwright

#### 4. Dial cónico de RestPanel

**Test:** Abrir RestPanel (tap en RestStrip) durante un descanso; observar mientras cuenta atrás  
**Expected:** El arco `--progress` crece suavemente del 0 % al 100 % en la duración del descanso  
**Why human:** `conic-gradient` con CSS var no verificable programáticamente

---

### Resumen narrativo

**El único gap bloqueante de la verificación inicial (REST-02) está cerrado.**

El reducer en `src/session/reducer.ts` (líneas 149–165) ahora calcula `actualSeconds = Math.round((action.payload.nowMs - rest.startedAtMs) / 1000)` en ambos handlers (`REST_DONE` y `SKIP_REST`) e inyecta `rest_actual_s` en el `CompletedSet` correspondiente antes de limpiar `state.session.rest`. El flujo de datos completo está operativo: reducer → snapshot → `computeRestDeviation` → `SummaryScreen` chip.

**Aviso sobre test E2E (no bloqueante):** La aserción REST-02 en `guided-session.spec.ts` (línea 97) sigue usando `toContainText('Δ descanso')`, que pasa tanto con "Δ descanso: —" como con "Δ descanso: +5 s". Esto no impide pasar a la siguiente fase pero debilita la protección de regresión. Se recomienda actualizar la aserción en una ventana de oportunidad.

Los 4 ítems de verificación humana (Wake Lock, audio iOS, vibración Android, dial cónico) permanecen sin cambios y requieren prueba en dispositivo real.

---

_Verificado: 2026-04-26T15:27:00Z_  
_Verificador: Claude (gsd-verifier) — re-verificación tras cierre de gap_
