# Buscador Personal Trainer

## What This Is

Una app web para registrar entrenamientos en el gimnasio con una experiencia guiada paso a paso: te indica el ejercicio, series/reps, peso sugerido y descanso, y te ayuda a ejecutar bien con vídeos cortos y cues. Está pensada para adultos que quieren progresar (fuerza/hipertrofia/pérdida de grasa) sin fricción ni “parálisis de decisión”.

## Core Value

El usuario puede completar una sesión de gimnasio guiada sin pensar “qué toca ahora”, registrando cada set con contexto suficiente para progresar con seguridad.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Registro de sesión guiado paso a paso (sets, reps reales, peso, RIR/RPE, timestamps)
- [ ] Base de datos de movimientos con vídeo corto + cues + músculos/equipamiento/alternativas
- [ ] Seguimiento de PRs con contexto (variante, semana del bloque, RPE/RIR)
- [ ] Timer de descanso con alertas y comparación prescrito vs real
- [ ] Historial de sesiones con resumen ejecutivo (volumen, duración, wellness)
- [ ] Personalización v1: rutinas/sustituciones por disponibilidad de equipamiento
- [ ] Inteligencia v1: estimador 1RM + sugerencia de sobrecarga (doble progresión)
- [ ] Retención v1: racha de consistencia con penalización suave (“racha protegida”)
- [ ] Publicación en GitHub y ejecución en navegador (deploy estático tipo GitHub Pages)

### Out of Scope

- App móvil nativa (iOS/Android) — primero web
- Social completo (leaderboards, tarjetas compartibles, “entreno con alguien”) — diferenciar tras validar core
- Integración con wearables (Apple Watch/Garmin/Whoop) — alta complejidad, dependencia externa
- Pagos/suscripciones — no necesarios para validar el core

## Context

- El PRD enfatiza eliminar fricción en el gym: guía explícita por ejercicio/serie, con descansos controlados, y con soporte visual para técnica (vídeo + cues).
- Los datos clave se orientan a: seguimiento de progresión (1RM estimado, doble progresión), consistencia (racha), y control de variables (descanso prescrito vs real, wellness).
- La “personalización” más crítica para v1 es el motor de sustituciones por equipamiento disponible, para no romper la intención del día.

## Constraints

- **Deployment**: La aplicación debe poder subirse a GitHub y ejecutarse desde el navegador al abrirla desde el repositorio (objetivo: hosting estático, sin backend obligatorio en v1).
- **UX**: En ningún momento el usuario “llega a un folio en blanco” durante la sesión; siempre hay una siguiente acción clara.
- **Data fidelity**: El registro por set debe soportar timestamps y valores reales (no solo “planificados”).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-first (deploy estático) | Publicación simple desde GitHub y acceso inmediato desde navegador | — Pending |
| Experiencia “guided workout” como navegación principal | Elimina parálisis de decisión y reduce fricción en el gym | — Pending |
| Modelo de datos centrado en “set” | Permite progresión, PRs con contexto y análisis posterior | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after initialization*
