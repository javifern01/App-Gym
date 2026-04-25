# Phase 1: Foundation + Deploy - Context

**Gathered:** 2026-04-25  
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar una **base web ejecutable desde GitHub** (deploy estático o apertura directa) que **persiste el estado local** suficiente para **reanudar una sesión en curso tras recargar** (DEPL-01, DEPL-02, SESS-03).  
No incluye todavía: biblioteca de ejercicios, PRs, progresión, historial completo, ni sustituciones (eso llega en fases posteriores).

</domain>

<decisions>
## Implementation Decisions

### Deploy (GitHub → navegador)
- **D-01:** Debe poder **abrirse también “directamente”** (p. ej., `index.html` local) además de publicarse en GitHub.
- **D-02:** En v1, la app será **single-page sin rutas** (evitar problemas de routing/404 en hosting estático).
- **D-03:** El repo será **privado**.
- **D-04:** Si se usa GitHub Pages, se asume despliegue bajo `/<repo>/` (no root-domain).

### Persistencia local (SESS-03)
- **D-05:** Persistencia durable en v1: **localStorage**.
- **D-06:** Reanudación de sesión tras refresh: **snapshot** del estado actual (no event-log).
- **D-07:** Persistir **en cada acción relevante** (auto-save continuo).
- **D-08:** En Phase 1 se define un **esqueleto de modelo** (estructura base) aunque la librería de ejercicios llegue en Phase 3.

### PWA / Offline
- **D-09:** En v1: **sin PWA** (web normal).
- **D-10:** Alertas del timer: **solo in-app** (visual/sonido), sin notificaciones del sistema.
- **D-11:** Sin límite explícito de cache/storage en v1 (por defecto del navegador).

### UI mínima
- **D-12:** Primera pantalla: **wizard/onboarding mínimo** (enfoque objetivo/equipo) antes de iniciar.
- **D-13:** Navegación: **una sola pantalla** (sin rutas; coherente con single-page).
- **D-14:** Empty state sin sesiones: **CTA claro** para iniciar primera sesión.
- **D-15:** Si hay sesión en curso y se recarga: **auto-resume** sin preguntar.

### Claude's Discretion
- Definir el detalle exacto del wizard (preguntas mínimas) siempre que no cree scope nuevo fuera de Phase 1.
- Definir la micro-UX de auto-guardado (indicadores “guardado” discretos vs silencioso).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + requisitos
- `.planning/ROADMAP.md` §Phase 1 — objetivo, requirements y success criteria
- `.planning/REQUIREMENTS.md` — DEPL-01, DEPL-02, SESS-03 y trazabilidad
- `.planning/PROJECT.md` — visión + constraints (deploy desde GitHub, UX “sin folio en blanco”)

### Research (stack/arquitectura)
- `.planning/research/SUMMARY.md` — recomendaciones globales y riesgos
- `.planning/research/STACK.md` — stack recomendado (aunque en esta fase se eligió localStorage)
- `.planning/research/ARCHITECTURE.md` — patrones sugeridos (state machine/event-log) para comparar con snapshot
- `.planning/research/PITFALLS.md` — riesgos de fricción y modelo/persistencia

### Reglas de proyecto
- `.cursor/rules/CLAUDE.md` — convenciones y guardrails de proyecto

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- (Greenfield) No hay código existente aún.

### Established Patterns
- (Greenfield) Por definir en Phase 1 al crear la base del proyecto.

### Integration Points
- `index.html` / entrada SPA (o single-page) será el punto de integración principal.

</code_context>

<specifics>
## Specific Ideas

- El requisito más importante de la fase es que **al recargar no se pierda la sesión** y se pueda continuar.
- Mantener el deploy/ejecución **lo más simple posible** (single-page, sin routing).

</specifics>

<deferred>
## Deferred Ideas

- Posible mejora futura (si localStorage se queda corto): mover persistencia a **IndexedDB/Dexie**.
- Posible mejora futura: **PWA instalable** para offline y mejor UX en el gym.

</deferred>

---
*Phase: 01-foundation-deploy*  
*Context gathered: 2026-04-25*
