# Domain Pitfalls: Guided Workout Tracking Apps

**Domain:** App web de registro de entrenamientos guiados (sets/reps/peso + lógica de progresión + fatiga/periodización)  
**Researched:** 2026-04-25  
**Overall confidence:** **MEDIUM** (bases de programación/auto-regulación bien establecidas; parte de “app/product UX” viene de fuentes menos académicas y requiere validación con usuarios)

## Phase model used in this doc (para mapear riesgos)

- **Phase 1 (v1 Core Logging):** sesión guiada, registro por set (reps/peso/RIR o RPE/timestamps), timer de descanso, local-first/offline, “undo/edit”.
- **Phase 2 (Exercise Canon + Substitutions):** base de ejercicios normalizada (IDs estables, variantes), búsqueda, vídeo+cues, sustituciones por equipamiento.
- **Phase 3 (History + PRs):** historial, resúmenes, PRs con contexto, vistas “coach-friendly”.
- **Phase 4 (Progression v1):** e1RM + doble progresión + reglas conservadoras (hold/deload), incrementos realistas, redondeo a discos.
- **Phase 5 (Fatigue/Periodization v2):** deloads, bloques/mesociclos, autoregulación por fatiga/wellness (y más adelante wearables si aplica).
- **Phase 6 (Analytics/Scale v2+):** tendencias 4–8 semanas, diagnóstico de estancamiento, dashboards, (opcional) social/sharing.

## Critical Pitfalls (causan reescrituras, pérdida de confianza o abandono)

### Pitfall 1: “Logging friction” (demasiados taps/campos → el usuario deja de registrar)
**What goes wrong:** el registro por set se siente como rellenar un formulario; en el gym real hay sudor, prisa y fatiga, y cualquier fricción mata el hábito.  
**Why it happens:** diseño pensado para “datos perfectos” en vez de “captura rápida + estructura fuerte”.  
**Consequences:** baja retención (especialmente Day-7/Day-30), datos incompletos, progresión imposible y el producto pierde su razón de ser.

**Warning signs:**
- Muchos sets quedan sin completar o con valores “por defecto” falsos (p. ej., todo igual).
- El usuario evita registrar accesorios o abandona a mitad de sesión.
- Ediciones frecuentes post-entreno (indicador de captura lenta / error-prone).

**Prevention:**
- **Una sola pantalla** para el set actual (registrar + deshacer + editar) y “siguiente acción” siempre visible.
- **Prefill agresivo** (última serie planificada / última ejecutada) + edición mínima.
- **Campos opcionales** (RIR/RPE/notas) con **progressive disclosure**.
- **Offline-first/local-first** y sync cuando haya red (gimnasios con mala cobertura son normales).

**Phase to address:** **Phase 1** (si esto falla, todo lo demás se derrumba).  
**Sources:**  
- `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/` (fricción, one-screen flow, offline, “exercise IDs”)  
- `https://www.forgelogbooks.com/blog/every-way-track-workouts-ranked` (fricción/distraction tax al usar móvil)

---

### Pitfall 2: Modelo de datos débil (ejercicios sin IDs estables, variantes mezcladas, sin sustituciones registradas)
**What goes wrong:** “Bench press”, “DB bench”, “incline bench” o “máquina X” se tratan como lo mismo (o como cosas distintas sin control), rompiendo PRs, progresión y analítica.  
**Why it happens:** se deja que el usuario “nombre” ejercicios libremente sin una entidad canónica; o no se guarda la variante/implementación real.  
**Consequences:** PRs falsos, progresión incorrecta, sustituciones invisibles (cambia el estímulo pero el sistema no lo sabe).

**Warning signs:**
- Historial fragmentado en múltiples nombres casi iguales.
- PRs “sorpresa” por mezclar variantes/equipos.
- Imposible agregar volumen por patrón/músculo/equipamiento con fiabilidad.

**Prevention:**
- **Catálogo normalizado**: `Exercise` con **ID estable**, metadatos (patrón, músculos, equipamiento) y **variantes** explícitas.
- Permitir **alias de display**, pero mantener el ID canónico.
- Registrar **sustitución** como dato de primera clase: `planned_exercise_id`, `performed_exercise_id`, motivo (ocupado/dolor/equipamiento).

**Phase to address:** **Phase 2** (diseño fundacional que habilita PRs/progresión).  
**Sources:**  
- `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/` (exercise naming/IDs, substitutions)

---

### Pitfall 3: PRs/progresión sin “contexto de ejecución” (descanso real, RIR/RPE, set order, timestamps)
**What goes wrong:** el sistema interpreta un set como comparable cuando cambió el descanso, el esfuerzo (RIR), la fatiga acumulada o incluso el orden del ejercicio.  
**Why it happens:** se guarda solo “peso y reps” y se ignoran variables que afectan rendimiento.  
**Consequences:** recomendaciones erróneas (“sube peso” cuando en realidad el descanso fue corto o el esfuerzo fue 0 RIR), pérdida de confianza.

**Warning signs:**
- El usuario reporta “la app me manda demasiado” o “no tiene sentido”.
- PRs que aparecen tras sesiones con descanso atípico o cambios de orden.
- Mucha varianza entre sesiones sin explicación visible.

**Prevention:**
- Guardar por set: **timestamp**, **RIR/RPE opcional**, **descanso prescrito vs real**, y flags (fallo técnico, dolor, equipo distinto).
- En PRs: mostrar el “por qué” y el contexto mínimo (variante, semana/bloque, RIR, descanso).

**Phase to address:** **Phase 1** (captura) + **Phase 3** (presentación/explicabilidad).  
**Sources:**  
- `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/` (contexto y review)

---

### Pitfall 4: Progresión demasiado agresiva (subir peso “porque sí”, saltos irreales, sin reglas de “hold/deload”)
**What goes wrong:** el motor de progresión incrementa carga sin respetar incrementos prácticos, calidad técnica o variación diaria; se acumulan fallos, frustración y riesgo de lesión.  
**Why it happens:** se implementa progresión lineal simplista (“+X cada semana”) o se sobreconfía en RPE/RIR sin calibración.  
**Consequences:** estancamiento temprano, sesiones fallidas, el usuario desactiva recomendaciones o abandona.

**Warning signs:**
- Muchas sesiones terminan con sets por debajo del mínimo de reps.
- RPE/RIR reportados “buenos” pero vídeos/realidad indican grinding (si hay verificación).
- Oscilaciones grandes de e1RM por saltos de carga o por estimación errática.

**Prevention:**
- Doble progresión conservadora: **subir reps dentro del rango** antes de subir peso; subir peso solo cuando se cumple criterio (p. ej., todas las series al “techo” del rango).  
- **Incrementos mínimos configurables** por ejercicio/equipamiento y **redondeo a discos**.
- Reglas explícitas: **hold** (repetir) y **deload/reset** con triggers (p. ej., 2 sesiones seguidas bajo el mínimo, o dificultad “muy alta”).  
- Tratar RPE/RIR como **señal ruidosa**: calibración y “buffer” (muchas personas subestiman su RIR ~1 rep).

**Phase to address:** **Phase 4** (motor de progresión v1) + parte en **Phase 1** (capturar RIR/RPE correctamente).  
**Sources:**  
- `https://rpetraining.com/progressive-overload-calculator` (double progression, incrementos prácticos, no forzar)  
- `https://rep-stack.com/calculators/progressive-overload/` (hold/deload rules, increments, plateau triggers)  
- `https://www.strongerbyscience.com/reps-in-reserve/` (RIR es imperfecto, subestimación típica ~1 rep, calibración segura)  
- `https://www.strongerbyscience.com/weekly-load-progression/` (riesgo de progresar demasiado por sets “atípicos” y variación día a día)

---

### Pitfall 5: No modelar la fatiga (o modelarla demasiado pronto) → periodización/deloads mal implementados
**What goes wrong:** o bien nunca se descarga (fatiga se acumula y el usuario “muere” en week 4–6), o bien el sistema ajusta cada sesión y se vuelve impredecible/irritante.  
**Why it happens:** confundir “fitness” con “performance diaria”; o usar deloads como parche tardío; o no definir triggers simples.  
**Consequences:** estancamiento, molestias articulares, pérdida de adherencia, recomendaciones inconsistentes.

**Warning signs:**
- Rendimiento cae en 2+ sesiones seguidas en el mismo patrón.
- Soreness persistente, sueño peor, motivación baja (si se registra wellness).
- El usuario siente que el plan “no tiene semanas fáciles” o “cada día cambia”.

**Prevention:**
- Implementar deloads con reglas **simples y explicables**: típicamente reducir **volumen 30–60%** y dejar **3–5 RIR** durante 5–7 días, manteniendo frecuencia/selección base.  
- Mezcla “programado + reactivo”: un intervalo base (p. ej., 4–8 semanas) pero permitir adelantar por marcadores de fatiga.  
- En v1, evitar “modelos complejos”; empezar con **triggers mínimos** (plateau + dificultad alta + reps bajo mínimo).

**Phase to address:** **Phase 5** (v2) pero dejando **hooks** desde Phase 1/4 (captura y reglas).  
**Sources:**  
- `https://mesostrength.com/blog/deload-weeks` (frecuencia, señales, estructura, RIR)  
- `https://www.mindtomusclefitness.com/periodized-deloading-strategies-to-prevent-overtraining/` (señales, recortes de volumen/intensidad, errores comunes)

---

### Pitfall 6: UX de “guía” que no es realmente guiada (pantallas en blanco, navegación confusa, se pierde el timer)
**What goes wrong:** el usuario deja de sentir “flujo” durante la sesión; se rompe la promesa de “siguiente acción clara”.  
**Why it happens:** IA/arquitectura de pantallas pensada como CRUD en vez de “state machine” de sesión.  
**Consequences:** errores (set registrado en ejercicio equivocado), abandono y mala percepción.

**Warning signs:**
- Usuarios preguntan “¿y ahora qué?” o vuelven atrás para encontrar el set.
- El timer se oculta o se resetea por navegación/refresh.
- Inconsistencias al recargar la página a mitad de sesión.

**Prevention:**
- Tratar la sesión como **flujo determinista** (estado: ejercicio actual, set actual, descanso, completado/omitido).
- Timer **persistente** y resistente a refresh; “resume session” siempre disponible.
- Botón **undo** y “edit last set” inmediatos.

**Phase to address:** **Phase 1** (core UX + resiliencia).  
**Sources:**  
- `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/` (one-screen logging, undo/edit, timer persistente)

## Moderate Pitfalls (degradan resultados, pero se pueden corregir sin reescribir todo)

### Pitfall 7: Métricas de progreso que incentivan trampas (solo tonelaje o solo e1RM sin calidad)
**What goes wrong:** el usuario aprende a “ganar” la métrica (cheat reps, ROM corto, descanso infinito) y el sistema refuerza malos hábitos.  
**Prevention:** usar métricas con guardrails (rangos de reps, RIR/RPE objetivo, descanso razonable) y mostrar “calidad del set” como criterio de PR/progresión.

**Phase to address:** **Phase 3–4**.

---

### Pitfall 8: RIR/RPE como requisito (en vez de opcional) o sin calibración
**What goes wrong:** pedir RIR/RPE cada set añade fricción y datos poco fiables; para novatos es especialmente difícil.  
**Prevention:** hacerlo opcional, con defaults y ayudas; calibración segura ocasional (en ejercicios seguros) y permitir estrategias alternativas (rep-range/double progression sin RIR).

**Phase to address:** **Phase 1** (UX) + **Phase 4** (progresión).  
**Sources:**  
- `https://www.strongerbyscience.com/reps-in-reserve/` (error humano, recomendaciones para mejorar)

---

### Pitfall 9: Sustituciones “que cambian el estímulo” sin control (misma progresión para movimientos distintos)
**What goes wrong:** se aplica la progresión de barra a una máquina distinta o a mancuernas sin equivalencia; PRs y recomendaciones quedan rotas.  
**Prevention:** motor de sustituciones que mapea “intención” (patrón/músculo/equipamiento) y guarda el performed ID; reglas de progresión específicas por implemento (p. ej., incrementos distintos).

**Phase to address:** **Phase 2** (sustituciones) + **Phase 4** (progresión por implemento).

---

### Pitfall 10: “Feature overload” antes de validar captura y guía
**What goes wrong:** se invierte en gráficas, social o IA avanzada cuando el log base aún es inconsistente.  
**Prevention:** gating por calidad de datos (completitud de sets, tasa de undo/edit, estabilidad de IDs) antes de construir analytics.

**Phase to address:** **Phase 6** (ponerlo explícitamente después).

## Minor Pitfalls (molestos, pero con mitigaciones claras)

### Pitfall 11: No considerar distracciones del móvil (notificaciones, multitarea) en entorno gym
**What goes wrong:** aunque el UX sea bueno, el “phone tax” rompe el foco entre sets.  
**Prevention:** modo “gym focus” (pantalla siempre activa, UI minimal, grandes targets), opciones de sonido/vibración, quick logging; (más adelante) wearables o atajos.

**Phase to address:** **Phase 1** (modo sesión) + **Phase 6** (integraciones).  
**Sources:**  
- `https://www.forgelogbooks.com/blog/every-way-track-workouts-ranked`

## Phase-Specific Warnings (resumen accionable para roadmap)

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Guided session + set logging | Fricción alta, pérdida de timer, sin offline, sin undo | One-screen logging, prefill, offline-first, undo/edit inmediato, timer persistente |
| Phase 2: Exercise canon + substitutions | IDs inestables, variantes mezcladas, sustituciones invisibles | Catálogo normalizado + performed/planned IDs + sustitución como entidad |
| Phase 3: History + PRs | PRs sin contexto, métricas que incentivan trampas | Guardar descanso/RIR/timestamps; PRs con contexto; guardrails |
| Phase 4: Progression v1 | Progresión agresiva, incrementos irreales, sobreconfianza en RIR | Doble progresión conservadora + hold/deload triggers + incrementos configurables |
| Phase 5: Fatigue/periodization | Deloads tarde o sistema errático por “sobre-ajuste” | Reglas simples, explicables; programado+reactivo; recortes de volumen/RIR claros |
| Phase 6: Analytics/scale | Construir dashboards sobre datos sucios | Gating por calidad/consistencia de datos antes de analytics |

## Sources (quick list)

- Workout logging UX & data model: `https://workoutapi.com/blog/how-to-create-a-good-workout-log-to-make-real-progress/`
- Phone distraction friction: `https://www.forgelogbooks.com/blog/every-way-track-workouts-ranked`
- Progressive overload rules & increments: `https://rpetraining.com/progressive-overload-calculator`, `https://rep-stack.com/calculators/progressive-overload/`
- RIR accuracy & calibration: `https://www.strongerbyscience.com/reps-in-reserve/`
- Load progression pitfalls (atypical sets, day-to-day variation): `https://www.strongerbyscience.com/weekly-load-progression/`
- Deload structure & signals: `https://mesostrength.com/blog/deload-weeks`, `https://www.mindtomusclefitness.com/periodized-deloading-strategies-to-prevent-overtraining/`

