# Phase 2: Guided Session + Rest Timer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 02-guided-session-rest-timer
**Areas discussed:** Session focus model, Set input UX, Rest timer presentation, Skip/multi-exercise flow, End-of-session summary, Visual & ergonomy
**User framing:** “Quiero mejorar la UX y UI completa” → interpretado como “diseñar bien Phase 2 + iterar el lenguaje visual existente”.

---

## Área 1 — Modelo de foco de la sesión (SESS-01)

### Q1.1 — Layout principal

| Option | Description | Selected |
|--------|-------------|----------|
| Focus mode | Tarjeta grande del set actual ~70% + cinta/lista compacta del resto | ✓ |
| Lista con foco | Lista completa, set actual destacado (refinamiento de lo de hoy) | |
| Híbrido | Cabecera con chips de progreso + tarjeta grande del set abajo | |
| Otra | Free-text alternative | |

**User's choice:** Focus mode
**Notes:** Coherente con principio "sudado, con una mano, móvil a 50 cm".

### Q1.2 — Indicadores siempre visibles

| Option | Description | Selected |
|--------|-------------|----------|
| Nombre del ejercicio actual | | ✓ |
| Progreso del ejercicio (sets hechos / planificados) | | ✓ |
| Progreso de la sesión (Ej. "Ejercicio 2 de 4") | | ✓ |
| Tiempo total de la sesión | | ✓ |
| Acceso a "Saltar ejercicio" | | ✓ |
| Acceso a "Abandonar sesión" | | ✓ |
| Indicador de auto-save | | ✓ |

**User's choice:** Todos (1–7)
**Notes:** Restricción real: cabecera/footer compactos en chips/iconos para no quitarle protagonismo a la tarjeta del set.

### Q1.3 — Mobile-first o desktop-equivalente

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-first explícito | Diseño optimizado para móvil vertical en mano | ✓ |
| Responsive equivalente | En desktop usar el espacio extra | |
| Tú decides (recomendaría mobile-first) | | |

**User's choice:** Mobile-first explícito

### Q1.4 — Salida de la sesión

| Option | Description | Selected |
|--------|-------------|----------|
| Solo al completar / cerrar pestaña | Sin botón "abandonar" explícito | |
| "Terminar antes" | Marca `completed` con sets restantes como `skipped` | |
| "Pausar / abandonar" → estado `paused` con prompt al volver | | ✓ |
| Tú decides | | |

**User's choice:** Pausar / abandonar con prompt "¿retomar o descartar?"

---

## Área 2 — Input rápido del set (SESS-02)

> A partir de aquí el usuario delegó: **"Decide las mejores decisiones por mí"**. Las opciones marcadas son las elegidas por defecto razonado y confirmadas con `"ok"` al final.

### Q2.1 — Mecanismo de entrada de reps y peso

| Option | Description | Selected |
|--------|-------------|----------|
| Steppers (+ / −) | ±1 reps / ±2.5 kg, long-press para acelerar | |
| Numpad nativo | `inputmode="numeric"`, foco automático | |
| Steppers + tap en número abre numpad | Combinado: rápido para ajustes pequeños, numpad para saltos grandes | ✓ |
| Otra | | |

**User's choice (delegated):** Steppers + tap → numpad
**Notes:** Mejor balance velocidad/precisión en mobile-first.

### Q2.2 — Pre-fill del set

| Option | Description | Selected |
|--------|-------------|----------|
| Desde set anterior del mismo ejercicio | Más típico, fluido para sets repetidos | ✓ |
| Desde "planned" | Solo reps planificadas, peso vacío | |
| Vacío | El usuario teclea cada vez | |
| Pre-fill + sugerencia de progresión | Cruza scope de Phase 4 | |

**User's choice (delegated):** Set anterior (primer set de cada ejercicio: pre-fill desde planned)
**Notes:** Evita scope creep a Phase 4 (PROG-02).

### Q2.3 — Métrica de esfuerzo: RIR vs RPE

| Option | Description | Selected |
|--------|-------------|----------|
| RIR (chips 0–4, "0 = fallo") | Más simple para target adulto no avanzado | |
| RPE (6–10 con medios pasos) | | |
| RIR por defecto, RPE como preferencia | | ✓ |
| Tú decides | | |

**User's choice (delegated):** RIR por defecto + toggle a RPE en preferencias
**Notes:** Future-proof sin complicar la UX por defecto.

### Q2.4 — Patrón de confirmación

| Option | Description | Selected |
|--------|-------------|----------|
| Inline | Edición en la tarjeta + botón "✓ Hecho" | ✓ |
| Bottom sheet | Modal con inputs, "Confirmar" cierra | |
| Inline con auto-confirma al iniciar descanso | Sin botón explícito | |

**User's choice (delegated):** Inline + botón "✓ Hecho"
**Notes:** Encaja con focus mode; evita modal innecesario.

### Q2.5 — Edge cases válidos

| Option | Description | Selected |
|--------|-------------|----------|
| reps = 0 con motivo "fallo" | Sin botón aparte | ✓ |
| Set "fallido" como botón aparte | | |
| Editar set ya completado | Tap en set previo reabre edición | ✓ |
| Notas opcionales por set | | |
| peso = 0 permitido | Para ejercicios de peso corporal | ✓ |

**User's choice (delegated):** 1, 3, 5
**Notes:** "Notas por set" → diferido a Phase 5.

---

## Área 3 — Rest timer (REST-01, REST-02)

### Q3.1 — Presentación del timer

| Option | Description | Selected |
|--------|-------------|----------|
| Takeover full-screen | Cuenta atrás grande sobre la sesión | |
| Strip persistente + expandible al tap | Cuenta atrás siempre visible, panel grande on demand | ✓ |
| Dial circular en la tarjeta | Integrado en el card del set | |

**User's choice (delegated):** Strip persistente + expandible
**Notes:** Takeover chocaría con los 7 indicadores siempre visibles (D-02).

### Q3.2 — Aviso al finalizar el descanso

**Decisión tomada:** Visual (flash + cambio de color del strip) + Sonido ON por defecto (toggle) + Vibración Web Vibration API ON por defecto si disponible (toggle). Todo in-app, respetando D-10 de Phase 1.

### Q3.3 — Controles del timer

**Decisión tomada:** "Saltar" / "+15s" / "+30s" disponibles en strip o panel expandido. Skip permitido en cualquier momento.

### Q3.4 — Origen del descanso prescrito

**Decisión tomada:** Default por `goalFocus` del wizard (strength: 180s, hypertrophy: 90s, fat_loss: 60s). Editable por sesión vía tap largo en el strip. La biblioteca de Phase 3 podrá refinar por ejercicio.

### Q3.5 — Desviación prescrito vs real (REST-02)

**Decisión tomada:** Persistir `rest_planned_s` y `rest_actual_s` por set. Indicador discreto en cada set hecho ("✓ 92s ↑+2s"). Desviación media en el resumen.

---

## Área 4 — Skip y multi-ejercicio (SESS-04)

### Q4.1 — Forma de la sesión

**Decisión tomada:** Mini-rutina **estática de 2–4 ejercicios seed-en-código**. Hace el guided flow real y testable sin esperar a Phase 3.

### Q4.2 — Control de skip ejercicio

**Decisión tomada:** Botón "Saltar" en la cabecera del ejercicio activo + accesible desde menú overflow (•••) en chips de la cinta superior.

### Q4.3 — Confirmación de skip

**Decisión tomada:** Sin modal. Toast "Saltado · Deshacer" (5s para deshacer).

### Q4.4 — Avance entre ejercicios

**Decisión tomada:** Auto-advance al completar último set, con pantalla hand-off de ~3s ("Siguiente: [Ejercicio]" + "Empezar ya" + "Saltar este"). Cumple "no folio en blanco" en transiciones.

---

## Área 5 — Resumen de fin de sesión

### Q5.1 — Alcance Phase 2

**Decisión tomada:** Mínimo viable: lista hechos/saltados, duración total, desviación media de descanso, chip "✓ N sets · Skipped: N". **NO** incluir tonelaje (HIST-02 / Phase 5).

### Q5.2 — Estilo

**Decisión tomada:** Misma single-page (D-13 Phase 1) pasa a estado "Resumen" con `session.status === 'completed'`. Tarjeta grande + "Iniciar nueva sesión" + "Cerrar resumen".

### Q5.3 — Tonelaje

**Decisión tomada:** Diferido a Phase 5 (HIST-02). Capturado en deferred ideas.

---

## Área 6 — Lenguaje visual y ergonomía

### Q6.1 — Sistema visual

**Decisión tomada:** Mantener dark glassmorphism + tokens CSS existentes. Refinar con principios "gym mode": tap targets ≥ 56×56px, tipografía gruesa XL en el set actual, contraste reforzado del set activo, mantener `--primary` (CTA) y `--primary-2` (hecho).

### Q6.2 — Stack

**Decisión tomada:** SIN Tailwind / Radix / Zustand en Phase 2. Seguir con CSS plano + `useState`. Diferir adopción hasta que la complejidad lo pida.
**Justificación:** Timer + multi-ejercicio + input UX es ya carga suficiente; añadir 3 deps + migrar tokens duplicaría riesgo sin valor neto.

### Q6.3 — Wake Lock

**Decisión tomada:** In-scope. `navigator.wakeLock.request('screen')` al `in_progress`, liberar en `paused`/`completed`. Fallback silencioso. Reactivar tras `visibilitychange`.

---

## Claude's Discretion

- Esquema de animaciones / transiciones (entrada del timer, hand-off entre ejercicios)
- Iconografía concreta (preferencia SVG inline ligeros)
- Microcopy (errors, toasts)
- Estructura interna de componentes / hooks (`useRestTimer`, `useSession`, `useWakeLock`)
- Detalles del refactor del schema y migración V2→V3
- Selección concreta de los 2–4 ejercicios seed (compound básicos)
- UX de inputs en escritorio (probablemente steppers + Enter, sin numpad nativo)

## Deferred Ideas

- Notas por set → Phase 5
- Tonelaje en resumen → Phase 5 / HIST-02
- Sugerencia de progresión en pre-fill → Phase 4 / PROG-02
- Configurar rutina por usuario → Phase 3 (biblioteca)
- Tailwind / Radix / Zustand → re-evaluar fin de v1
- Notificaciones del sistema → descartado en Phase 1 (D-10)
- RIR fraccional / RPE como métrica primaria → toggle opcional, no por defecto
- Editar peso/reps planificados antes de empezar el set → llega con la biblioteca
