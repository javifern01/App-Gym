# Roadmap: Buscador Personal Trainer

## Overview

Entregar una web “local-first” que guía una sesión de gimnasio paso a paso (sin pantallas en blanco), registra cada set con suficiente fidelidad para progresar, y se puede desplegar desde GitHub para abrirla en el navegador sin backend obligatorio.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Deploy** - App base lista para ejecutar desde GitHub Pages con datos locales persistentes.
- [ ] **Phase 2: Guided Session + Rest Timer** - Flujo de entreno guiado con registro por set y descansos medidos.
- [ ] **Phase 3: Exercise Library (Video + Cues)** - Biblioteca de ejercicios navegable y soporte técnico visible durante la sesión.
- [ ] **Phase 4: PRs + Progression (1RM & Overload)** - Progresión automática con PRs con contexto, 1RM histórico y sugerencias de sobrecarga.
- [ ] **Phase 5: History & Session Summary** - Historial con resumen ejecutivo y métricas base de volumen/duración/wellness.
- [ ] **Phase 6: Equipment Availability (Plan B)** - Sustituciones por disponibilidad y trazabilidad de su uso.
- [ ] **Phase 7: Retention Streak** - Racha de consistencia con “racha protegida” mensual.

## Phase Details

### Phase 1: Foundation + Deploy
**Goal**: La app se puede abrir en navegador desde un repo de GitHub (deploy estático) y conserva el estado local necesario para continuar un entreno tras recargar.
**Depends on**: Nothing (first phase)
**Requirements**: DEPL-01, DEPL-02, SESS-03
**Success Criteria** (what must be TRUE):
  1. Un usuario puede abrir la app desde GitHub Pages (o equivalente estático) y ver la interfaz inicial sin pasos manuales extra.
  2. Desde un repo limpio, el build/deploy es reproducible siguiendo los pasos documentados.
  3. Si un usuario inicia una sesión y recarga el navegador, puede continuar la misma sesión sin perder el progreso.
**Plans**: 3 plans
Plans:
- [ ] 01-PLAN.md — Greenfield Vite+React+TS, `base: './'`, Zod snapshot + Vitest roundtrip + Playwright smoke (Wave 1; DEPL-01/02 + SESS-03 foundation)
- [ ] 02-PLAN.md — Minimal wizard, empty state, session shell, auto-save + auto-resume, Playwright reload E2E (Wave 2; SESS-03)
- [ ] 03-PLAN.md — README reproducible build/deploy + GitHub Actions Pages workflow (Wave 2; DEPL-01/02)
**UI hint**: yes

### Phase 2: Guided Session + Rest Timer
**Goal**: El usuario puede completar una sesión guiada sin “folio en blanco”, registrando sets con fidelidad y descansos medidos.
**Depends on**: Phase 1
**Requirements**: SESS-01, SESS-02, SESS-04, REST-01, REST-02
**Success Criteria** (what must be TRUE):
  1. Durante el entreno, la app siempre muestra una “siguiente acción” clara (ejercicio actual → set actual) y el usuario no se queda en una pantalla vacía.
  2. El usuario puede registrar cada set con reps reales, peso usado, RIR (o RPE) y timestamp.
  3. Al completar un set, se inicia un descanso y al finalizar se avisa (visual + sonido opcional).
  4. El usuario puede omitir/realizar un ejercicio y el resumen de la sesión refleja el cambio.
  5. El usuario puede ver para una sesión la desviación media entre descanso prescrito y descanso real.
**Plans**: TBD
**UI hint**: yes

### Phase 3: Exercise Library (Video + Cues)
**Goal**: El usuario puede descubrir ejercicios y recibir apoyo de técnica (vídeo+cues) sin salir del flujo de sesión.
**Depends on**: Phase 2
**Requirements**: EXDB-01, EXDB-02
**Success Criteria** (what must be TRUE):
  1. El usuario puede navegar/buscar ejercicios y ver patrón de movimiento, músculos primario/secundario, equipamiento requerido y alternativas.
  2. En la sesión, el usuario puede ver un vídeo corto (~15s) y 2–3 cues de técnica del ejercicio actual.
**Plans**: TBD
**UI hint**: yes

### Phase 4: PRs + Progression (1RM & Overload)
**Goal**: El usuario puede ver y actualizar PRs con contexto y recibir sugerencias de progresión basadas en su historial real.
**Depends on**: Phase 2
**Requirements**: PR-01, PR-02, PROG-01, PROG-02
**Success Criteria** (what must be TRUE):
  1. El usuario puede ver sus PRs por ejercicio con contexto (variante, semana del bloque, RPE/RIR) y la métrica usada.
  2. Al registrar un set que supera la marca previa según la métrica del ejercicio, el PR se actualiza automáticamente.
  3. El usuario puede ver el histórico de 1RM estimado por ejercicio a lo largo del tiempo.
  4. Para el próximo entreno de un ejercicio, la app sugiere si subir reps o subir peso (doble progresión) basándose en las últimas sesiones y el margen (RIR) de la última serie.
**Plans**: TBD
**UI hint**: yes

### Phase 5: History & Session Summary
**Goal**: El usuario puede revisar sesiones pasadas rápidamente con un resumen útil para progresar y controlar variables.
**Depends on**: Phase 2
**Requirements**: HIST-01, HIST-02
**Success Criteria** (what must be TRUE):
  1. El usuario puede abrir un historial de sesiones y en ~10 segundos entender volumen total, duración, ejercicios clave y wellness pre/post.
  2. Para una sesión, el usuario puede ver el volumen total calculado al menos como tonelaje (kg × reps).
**Plans**: TBD
**UI hint**: yes

### Phase 6: Equipment Availability (Plan B)
**Goal**: El usuario puede adaptar el plan en el gimnasio cuando falta equipamiento sin perder la intención del día y con trazabilidad.
**Depends on**: Phase 3
**Requirements**: EQPT-01, EQPT-02
**Success Criteria** (what must be TRUE):
  1. El usuario puede declarar equipamiento disponible/ocupado y la app propone sustituciones coherentes con la intención del día.
  2. El usuario puede ver qué sustituciones usó (y con qué frecuencia) a lo largo del tiempo.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Retention Streak
**Goal**: El usuario puede ver y mantener una racha de consistencia con una penalización suave por fallar.
**Depends on**: Phase 5
**Requirements**: RET-01, RET-02
**Success Criteria** (what must be TRUE):
  1. El usuario puede ver su racha actual basada en sesiones completadas y cómo cambia al completar una sesión.
  2. Si el usuario falla, la “racha protegida” mensual evita que la racha se resetee completamente (según la regla definida).
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 2 → 2.1 → 2.2 → 3 → 3.1 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Deploy | 0/3 | Not started | - |
| 2. Guided Session + Rest Timer | 0/TBD | Not started | - |
| 3. Exercise Library (Video + Cues) | 0/TBD | Not started | - |
| 4. PRs + Progression (1RM & Overload) | 0/TBD | Not started | - |
| 5. History & Session Summary | 0/TBD | Not started | - |
| 6. Equipment Availability (Plan B) | 0/TBD | Not started | - |
| 7. Retention Streak | 0/TBD | Not started | - |

