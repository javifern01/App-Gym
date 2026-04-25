# Requirements: Buscador Personal Trainer

**Defined:** 2026-04-25  
**Core Value:** El usuario puede completar una sesión de gimnasio guiada sin pensar “qué toca ahora”, registrando cada set con contexto suficiente para progresar con seguridad.

## v1 Requirements

Requisitos para la primera versión web (deploy estático) orientada a validar el “guided workout” + registro por set.

### Guided Session

- [ ] **SESS-01**: La app muestra una sesión guiada con una “siguiente acción” clara (ejercicio actual → set actual), evitando pantallas en blanco durante el entreno.
- [ ] **SESS-02**: El usuario puede registrar cada set con: reps reales, peso usado, RIR (o RPE), y timestamp del set.
- [ ] **SESS-03**: La sesión guarda series “completadas” vs “planificadas” y permite continuar tras recargar el navegador.
- [ ] **SESS-04**: El usuario puede marcar un ejercicio como realizado/omitido y la sesión refleja el cambio en el resumen.

### Rest Timer

- [ ] **REST-01**: La app inicia un timer de descanso al completar un set y avisa al finalizar (visual + sonido opcional).
- [ ] **REST-02**: El descanso prescrito y el descanso real quedan registrados por set (o por ejercicio) y se puede ver la desviación media de una sesión.

### Exercise Library (vídeo + cues)

- [ ] **EXDB-01**: Existe una base de datos navegable/buscable de ejercicios con: patrón de movimiento, músculos primario/secundario, equipamiento requerido, alternativas.
- [ ] **EXDB-02**: Cada ejercicio tiene un vídeo corto (≈15s) y 2–3 cues de técnica visibles durante la sesión.

### Personal Records (PR) con contexto

- [ ] **PR-01**: El usuario puede ver sus marcas personales por ejercicio (p. ej., peso para X reps o 1RM estimado) con contexto: variante, semana del bloque, RPE/RIR.
- [ ] **PR-02**: El PR se actualiza automáticamente cuando un set supera la marca previa según la métrica definida (configurable por ejercicio).

### Progressive Overload + 1RM

- [ ] **PROG-01**: La app estima 1RM dinámico por ejercicio a partir de peso+reps+RIR/RPE y conserva histórico.
- [ ] **PROG-02**: La app sugiere sobrecarga automática (doble progresión): decidir si subir reps o subir peso en el próximo entreno, basado en las últimas 3 sesiones del ejercicio y el margen (RIR) de la última serie.

### History & Summary

- [ ] **HIST-01**: El usuario puede ver un historial de sesiones con un resumen ejecutivo (en ~10s): volumen total, duración, ejercicios clave, wellness pre/post.
- [ ] **HIST-02**: La app calcula volumen total al menos como tonelaje \(kg \times reps\) y lo muestra por sesión.

### Equipment Availability (plan B)

- [ ] **EQPT-01**: El usuario puede declarar equipamiento disponible (o seleccionar “ocupado/no disponible”) y la app propone sustituciones sin perder la intención del día.
- [ ] **EQPT-02**: La app registra qué sustituciones se usaron y con qué frecuencia.

### Retention (streak)

- [ ] **RET-01**: La app mantiene una racha de consistencia basada en sesiones completadas.
- [ ] **RET-02**: La app incluye una “racha protegida” mensual para no resetear completamente tras un fallo.

### Deployment (GitHub → navegador)

- [x] **DEPL-01**: La aplicación se puede publicar en GitHub y ejecutarse en el navegador abriéndola desde el repositorio (objetivo: GitHub Pages u hosting estático equivalente).
- [x] **DEPL-02**: El build/deploy queda documentado (pasos reproducibles) y funciona desde un repo limpio.

## v2 Requirements

### Fatigue & Periodization

- **FATG-01**: El usuario registra wellness diario y la app ajusta volumen si baja varios días seguidos.
- **PERI-01**: La app soporta periodización por bloques (acumulación/intensificación/descarga) y semana de descarga.

### Analytics

- **ANLT-01**: Gráficas de volumen/tonelaje por grupo muscular con tendencias 4/8 semanas.
- **ANLT-02**: Detección de estancamiento con diagnóstico y propuesta de ajuste.
- **ANLT-03**: Análisis de simetría bilateral con alertas si supera umbral (>15%).

### Social & Sharing

- **SOC-01**: Desafíos semanales con leaderboard por grupo de pares (nivel similar).
- **SOC-02**: Tarjetas compartibles por hitos (PR, 30 sesiones, etc.).
- **SOC-03**: “Entreno con alguien” asíncrono (parejas/grupos).

### Wearables

- **WRBL-01**: Integración con wearables para HRV/sueño/recuperación y ajuste de intensidad.

## Out of Scope

| Feature | Reason |
|---------|--------|
| App móvil nativa | Web-first para validar rápido y publicar en GitHub |
| Backend multiusuario / cuentas | No imprescindible para validar el core (puede ser local-first en v1) |
| Pagos / suscripciones | No necesario para v1 |

## Traceability

Mapeado durante la creación del roadmap (cada requisito v1 aparece exactamente en una fase).

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPL-01 | Phase 1 | Complete |
| DEPL-02 | Phase 1 | Complete |
| SESS-03 | Phase 1 | Pending |
| SESS-01 | Phase 2 | Pending |
| SESS-02 | Phase 2 | Pending |
| SESS-04 | Phase 2 | Pending |
| REST-01 | Phase 2 | Pending |
| REST-02 | Phase 2 | Pending |
| EXDB-01 | Phase 3 | Pending |
| EXDB-02 | Phase 3 | Pending |
| PR-01 | Phase 4 | Pending |
| PR-02 | Phase 4 | Pending |
| PROG-01 | Phase 4 | Pending |
| PROG-02 | Phase 4 | Pending |
| HIST-01 | Phase 5 | Pending |
| HIST-02 | Phase 5 | Pending |
| EQPT-01 | Phase 6 | Pending |
| EQPT-02 | Phase 6 | Pending |
| RET-01 | Phase 7 | Pending |
| RET-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-25*  
*Last updated: 2026-04-25 after initial definition*
