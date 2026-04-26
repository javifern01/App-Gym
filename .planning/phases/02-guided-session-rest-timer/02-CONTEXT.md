# Phase 2: Guided Session + Rest Timer - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar un **flujo de entreno guiado real** sobre la base persistente de Phase 1: el usuario completa una sesión sin “folio en blanco”, registrando cada set con fidelidad (reps reales, peso, RIR, timestamp) y midiendo descansos (prescrito vs real). Cubre **SESS-01, SESS-02, SESS-04, REST-01, REST-02**.

No incluye en esta fase: biblioteca/búsqueda de ejercicios + vídeos+cues (Phase 3), PRs ni progresión 1RM/sobrecarga (Phase 4), historial multi-sesión y tonelaje (Phase 5), sustituciones por equipamiento (Phase 6), racha (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Modelo de foco de la sesión (SESS-01)
- **D-01:** **Focus mode** — la pantalla durante la sesión muestra una **tarjeta grande del set actual** (~70% del viewport) + cinta/lista compacta superior con el resto de sets/ejercicios.
- **D-02:** Indicadores **siempre visibles** durante la sesión (cabecera/footer compactos en chips/iconos para no comerle protagonismo a la tarjeta del set):
  1. Nombre del ejercicio actual
  2. Progreso del ejercicio (sets hechos / planificados, p. ej. chips “1·2·3·4”)
  3. Progreso de la sesión (“Ejercicio 2 de 4”)
  4. Tiempo total de la sesión transcurrido
  5. Acceso a “Saltar ejercicio”
  6. Acceso a “Pausar/Abandonar”
  7. Indicador de auto-save (“Guardado”) — coherente con D-07 de Phase 1
- **D-03:** **Mobile-first explícito**: el diseño se optimiza para móvil vertical, una mano. Desktop debe verse correctamente pero no se usa el espacio extra para layouts especiales.
- **D-04:** **Salida de la sesión:** botón “Pausar / Abandonar” → estado `paused`. Al volver, la app pregunta **“¿Retomar o descartar?”** (snapshot persiste mientras no se descarte). Coherente con D-15 “auto-resume” de Phase 1, pero con elección explícita en pause.

### Input rápido del set (SESS-02)
- **D-05:** Mecanismo combinado: **steppers (+/−)** grandes con incrementos por defecto **±1 reps** y **±2.5 kg** (long-press para acelerar) **+ tap en el número abre el numpad nativo móvil** (`inputmode="numeric"`) para saltos grandes.
- **D-06:** **Pre-fill** del set: por defecto se copian **reps/peso/RIR del set anterior del MISMO ejercicio en la sesión actual**. Para el primer set de un ejercicio, pre-fill desde `planned` (reps planificadas, peso vacío).
- **D-07:** **Métrica de esfuerzo: RIR por defecto** (chips 0–4 con “0 = fallo”). RPE queda como opción configurable en preferencias para usuarios que la prefieran.
- **D-08:** **Confirmación inline** en la tarjeta del set activo + **botón grande “✓ Hecho”** que confirma el set, persiste, y dispara automáticamente el descanso. Sin sheet/modal.
- **D-09:** Edge cases válidos en v1:
  - **reps = 0** → registra el set como “fallo técnico” implícitamente (sin botón aparte)
  - **Editar un set ya completado** → tap en el set en la cinta superior reabre la edición
  - **peso = 0 permitido** → soporta ejercicios de peso corporal
  - (Notas por set, RIR fraccional → diferidos)

### Rest timer (REST-01, REST-02)
- **D-10:** **Presentación: strip persistente abajo** con cuenta atrás grande (mm:ss) durante el descanso activo. **Tap en el strip → expande a panel grande** con dial circular + controles. Cuando no hay descanso activo, el strip muestra estado “Listo para siguiente set”. No usar takeover full-screen (chocaría con los 7 indicadores siempre visibles, D-02).
- **D-11:** **Aviso al finalizar el descanso** (REST-01):
  - **Visual:** flash + cambio de color del strip (siempre activo)
  - **Sonido:** ON por defecto, toggle en preferencias
  - **Vibración:** Web Vibration API si está disponible, ON por defecto (toggle en preferencias)
  - Todo **in-app** — coherente con D-10 de Phase 1 (sin notificaciones del sistema)
- **D-12:** **Controles del timer:** **“Saltar”**, **“+15s”**, **“+30s”** disponibles en el strip o panel expandido. Skip permitido en cualquier momento.
- **D-13:** **Descanso prescrito (origen):** default por `goalFocus` del wizard:
  - `strength` → 180s
  - `hypertrophy` → 90s
  - `fat_loss` → 60s
  Editable por sesión vía tap largo en el strip → ajustar prescrito.
  *(La biblioteca de ejercicios en Phase 3 podrá refinar este valor por ejercicio.)*
- **D-14:** **Tracking de desviación (REST-02):**
  - Schema persiste **`rest_planned_s`** y **`rest_actual_s`** por set
  - Indicador discreto en cada set ya hecho dentro de la cinta superior (p. ej. `✓ 92s ↑+2s`)
  - **Desviación media** se muestra en el resumen de fin de sesión

### Skip y multi-ejercicio (SESS-04)
- **D-15:** **Forma de la sesión en Phase 2:** mini-rutina **estática de 2–4 ejercicios seed-en-código** (p. ej. press banca, sentadilla, remo). Hace que el “guided flow” sea real y testable sin esperar la biblioteca de Phase 3. La rutina configurable por usuario llega con Phase 3.
- **D-16:** **Skip ejercicio:** botón **“Saltar”** en la cabecera del ejercicio activo + accesible desde menú overflow (`•••`) en cada chip de la cinta superior. **Visible pero no primario.**
- **D-17:** **Confirmación de skip:** **sin modal**. Toast no bloqueante con **“Saltado · Deshacer”** (5s para deshacer). Reduce fricción.
- **D-18:** **Avance entre ejercicios:** **auto-advance** al completar el último set, **con pantalla de hand-off de ~3s**: muestra “Siguiente: [Ejercicio]” con cuenta atrás visible + **“Empezar ya”** + **“Saltar este”**. Cumple “no folio en blanco” en la transición.

### Resumen de fin de sesión
- **D-19:** **Alcance mínimo viable Phase 2** (no extender a tonelaje — eso es HIST-02, Phase 5):
  - Lista de ejercicios: hechos / saltados
  - Duración total de la sesión
  - **Desviación media de descanso** (cumple REST-02 lectura)
  - Chip “✓ N sets · Skipped: N”
- **D-20:** **Estilo:** la misma single-page (D-13 Phase 1) cambia a **estado “Resumen”** cuando `session.status === 'completed'`. Tarjeta grande con los datos + **“Iniciar nueva sesión”** + **“Cerrar resumen”** (vuelve a empty state; snapshot conservado).

### Lenguaje visual y ergonomía
- **D-21:** **Mantener dark glassmorphism actual** y tokens CSS existentes (`--primary`, `--surface`, `--radius-*`, `pill`, `card`, `set-row`). Refinar con principios “gym mode”:
  - Tap targets primarios **≥ 56×56 px** (steppers, “✓ Hecho”, skip)
  - Tipografía **gruesa y XL** en el número del set actual (peso, reps) — legible desde ~50 cm
  - Contraste reforzado del set activo respecto a sets futuros/pasados
  - `--primary` (morado) = CTA, `--primary-2` (verde) = estado “hecho”
- **D-22:** **Stack: sin Tailwind / Radix / Zustand en Phase 2.** Seguimos con CSS plano + `useState` (lo de Phase 1). Diferimos la adopción hasta que la complejidad lo pida. *(Justificación: timer + multi-ejercicio + input UX ya es bastante carga; añadir 3 dependencias y migrar tokens duplicaría riesgo sin beneficio neto.)*
- **D-23:** **Wake Lock — in-scope.** Activar `navigator.wakeLock.request('screen')` cuando `session.status === 'in_progress'` y liberarlo en `paused`/`completed`. Fallback silencioso si la API no está disponible. Restaurar wake lock tras `visibilitychange` (volver a la pestaña).

### Schema (cambios para Phase 2)
- **D-24:** **Bump V2 → V3** del snapshot. Cambios:
  - `ExerciseSetSchema.completed` añade: `weight: number`, `rir: number` (0–4), `rest_planned_s?: number`, `rest_actual_s?: number`
  - `Session` pasa de un solo `exerciseName` a un array `exercises: Exercise[]` con `name`, `sets`, `status: 'pending'|'active'|'done'|'skipped'`, `currentSetIndex`
  - `Session.status` añade `'paused'`
  - `Preferences` añade: `restAlertSound: boolean`, `restAlertVibration: boolean`, `effortMetric: 'rir'|'rpe'`
- **D-25:** **Migración V1/V2 → V3:** los snapshots antiguos se migran preservando preferencias y la sesión se reinicia a `idle` (los sets antiguos no tienen weight/rir y no son recuperables como “completos”).

### Claude's Discretion
- Esquema de animaciones / transiciones (entrada del timer, hand-off entre ejercicios)
- Iconografía concreta (emoji vs SVG) — preferencia por SVG inline ligeros
- Texto exacto de microcopy (errores, toasts)
- Estructura interna de componentes / hooks (`useRestTimer`, `useSession`, `useWakeLock`, etc.)
- Detalles del refactor del schema y la migración V2→V3 (siempre que no rompa el contrato D-24/D-25)
- Selección concreta de los 2–4 ejercicios seed (D-15) — coherentes con compound básicos (press banca, sentadilla, remo, peso muerto, dominadas)
- Cómo se eligen los inputs en escritorio (probablemente steppers + Enter para confirmar, sin numpad nativo)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + requisitos
- `.planning/ROADMAP.md` §Phase 2 — objetivo, requirements, success criteria
- `.planning/REQUIREMENTS.md` — SESS-01, SESS-02, SESS-04, REST-01, REST-02 y trazabilidad
- `.planning/PROJECT.md` — visión, constraints (UX “sin folio en blanco”, data fidelity)

### Decisiones previas (Phase 1)
- `.planning/phases/01-foundation-deploy/01-CONTEXT.md` — D-09 (sin PWA), D-10 (alertas in-app, no system notifications), D-13 (single page sin rutas), D-15 (auto-resume), D-05/D-06/D-07 (localStorage + snapshot + auto-save)

### Stack y arquitectura recomendada
- `.planning/research/STACK.md` — stack recomendado (Tailwind/Radix/Zustand). **NOTA:** Phase 2 explícitamente NO los adopta (D-22). Útil como referencia para evaluar la decisión más adelante.
- `.planning/research/ARCHITECTURE.md` — patrones (snapshot vs event-log) — Phase 2 sigue snapshot.
- `.planning/research/PITFALLS.md` — riesgos de fricción / persistencia.

### Reglas de proyecto
- `.cursor/rules/CLAUDE.md` — convenciones y guardrails

### Web APIs relevantes (para Phase 2)
- Web Vibration API (`navigator.vibrate`) — usado en aviso del rest timer (D-11). Considerar fallback si no disponible.
- Screen Wake Lock API (`navigator.wakeLock`) — usado en sesión activa (D-23). Considerar `visibilitychange` para reactivar tras volver a la pestaña.
- HTML `inputmode="numeric"` — usado en numpad nativo (D-05).

### Código existente a tocar
- `src/persist/schema.ts` — bump V2 → V3 (D-24, D-25)
- `src/persist/snapshot.ts` — migración V1/V2 → V3
- `src/components/SessionScreen.tsx` — reescritura completa al modelo focus mode + timer + multi-ejercicio
- `src/components/EmptyStateScreen.tsx` — actualizar al nuevo flujo (sembrar mini-rutina al iniciar)
- `src/index.css` — extender tokens y patrones existentes; añadir clases para focus card, strip, dial, hand-off, summary
- `src/App.tsx` — orquestar estados `idle / in_progress / paused / completed`, hand-off entre ejercicios, wake lock

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Tokens CSS** (`src/index.css`): `--primary`, `--primary-2`, `--surface`, `--border`, `--radius-lg/md/sm`, `--shadow`. Reusables tal cual; añadiremos los necesarios para timer/strip/dial.
- **Patrones existentes:** `card` (contenedor principal), `pill` (chips de estado), `set-row` (lista de sets), `btn` / `btn-primary` / `btn-success`, `radio-card` (selector). Todos reusables y extensibles.
- **`SnapshotV2Schema`** + flujo `loadSnapshot/saveSnapshot` en `src/persist/snapshot.ts` — **mantenemos el patrón** snapshot + Zod + auto-save; solo cambia el shape (D-24).
- **`WizardScreen`**: ya recoge `goalFocus` (necesario para D-13: descansos prescritos por defecto). No se rediseña en Phase 2 salvo añadir los toggles `restAlertSound` / `restAlertVibration` / `effortMetric`.

### Established Patterns
- **State management:** `useState` + función `updateSnapshot` que persiste en cada cambio. Se mantiene (D-22, D-07 Phase 1). El estado de Phase 2 (timer activo, índice de set/ejercicio, paused) sigue cabiendo aquí; si crece, evaluar `useReducer` antes de pasar a Zustand.
- **Persistencia:** localStorage + Zod parse/safeParse (D-05/D-06 Phase 1). Para timestamps usar ISO strings (ya es el patrón en `completed.at`).
- **CSS:** plain CSS + tokens, dark glassmorphism con auto-light-mode vía `prefers-color-scheme`. Mantener.

### Integration Points
- `src/App.tsx` orquesta: wizard → empty → session → resumen. Añadir estado `paused` con prompt de retomar/descartar (D-04).
- `src/persist/snapshot.ts` migración: añadir `migrateV2toV3` siguiendo el patrón actual `migrateV1toV2`.
- `src/persist/schema.ts` exporta el contrato — todo lo que toque Session/Set/Preferences pasa por aquí.

### Constraints heredados
- D-13 Phase 1: **single page sin rutas** → el resumen, el hand-off entre ejercicios y el panel del timer son **estados internos** de la misma página, no rutas.
- D-15 Phase 1: **auto-resume** sin preguntar al recargar → solo el estado `paused` (D-04 nuevo) requiere prompt explícito al volver.
- D-09 Phase 1: **sin PWA** → no podemos asumir background timers ni notificaciones del SO. Todo el aviso del rest timer debe funcionar con la pestaña visible (Wake Lock D-23 mitiga el riesgo de pantalla apagada).

</code_context>

<specifics>
## Specific Ideas

- “Sudado, con una mano, mirando el móvil 50 cm” es el escenario base de diseño — toda decisión visual/táctil se valida contra eso.
- **Set actual = la pantalla**. Todo lo demás (lista de sets, progreso de sesión, timer mientras descanso) ocupa los bordes.
- “No folio en blanco” se interpreta en Phase 2 como: **siempre** hay una `next-action-card` visible — si no es el set actual, es el descanso, y si no es el descanso, es el hand-off al siguiente ejercicio, y si no, es el resumen.
- El `goalFocus` que ya elige el usuario en el wizard (Phase 1) se aprovecha como **única señal** para los descansos prescritos por defecto en Phase 2; no añadimos otra pregunta.
- El “undo” por toast (D-17) es preferible a confirmaciones modales: encaja con la velocidad del gym.

</specifics>

<deferred>
## Deferred Ideas

- **Notas opcionales por set** (texto corto) — Phase 5 (cuando haya pantalla de detalle de sesión)
- **Tonelaje (kg × reps) en el resumen** — Phase 5 / HIST-02
- **Sugerencia de progresión en el pre-fill** (“sube 2.5 kg” / “mete 1 rep más”) — Phase 4 / PROG-02
- **Configurar la rutina de la sesión por usuario** (no estática) — Phase 3 (biblioteca)
- **Adoptar Tailwind / Radix / Zustand** — re-evaluar al final de v1 si la complejidad de los componentes lo pide; por ahora deferred (D-22)
- **Notificaciones del sistema cuando termina el descanso** — descartado en Phase 1 (D-10), permanece deferred
- **RIR fraccional / RPE como métrica primaria** — usuarios avanzados; queda como toggle opcional vía `effortMetric` (D-24) pero la UX por defecto es RIR
- **Editar peso/reps planificados antes de empezar el set** — la mini-rutina seed-en-código no expone edición de planificación en Phase 2; con la biblioteca llega esto

</deferred>

---

*Phase: 02-guided-session-rest-timer*
*Context gathered: 2026-04-26*
