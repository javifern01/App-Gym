# Phase 1: Foundation + Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.  
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25  
**Phase:** 1 - Foundation + Deploy  
**Areas discussed:** Deploy GitHub Pages, Persistencia local, PWA/Offline, Estructura UI mínima

---

## Deploy GitHub Pages

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Pages (Actions) | Build `dist/` + deploy automático | |
| Pages + abrir `index.html` local | Funcionar también via `file://` | ✓ |
| Otro hosting estático | Netlify/Vercel/Cloudflare, repo en GitHub | |

**User's choice:** Pages + abrir `index.html` local  
**Notes:** En v1 se prefiere minimizar complejidad de routing con **single-page sin rutas**; repo **privado**; si Pages, bajo `/<repo>/`.

---

## Persistencia local (SESS-03)

### Storage
| Option | Description | Selected |
|--------|-------------|----------|
| IndexedDB (Dexie) | Durable, escalable | |
| localStorage | Simple, limitado | ✓ |
| Híbrido | IndexedDB logs + localStorage settings | |

### Reanudación
| Option | Description | Selected |
|--------|-------------|----------|
| Event log + estado derivado | Más robusto/auditable | |
| Snapshot | Más simple | ✓ |
| Ambos | Event log + snapshots | |

### Auto-save
| Option | Description | Selected |
|--------|-------------|----------|
| En cada acción | Minimiza pérdida | ✓ |
| Debounced | Menos writes | |
| Manual | Botón Guardar | |

### Alcance de datos en Phase 1
| Option | Description | Selected |
|--------|-------------|----------|
| Mínimo | Solo sesión actual | |
| Esqueleto completo | Tablas/IDs base sin librería aún | ✓ |
| Seed demo | Sembrar ejercicios demo | |

**User's choice:** localStorage + snapshot + autosave por acción + esqueleto de modelo  
**Notes:** Prioridad absoluta: **reanudar sesión tras refresh** sin fricción.

---

## PWA / Offline

| Option | Description | Selected |
|--------|-------------|----------|
| Sin PWA | Web normal | ✓ |
| Instalable + offline shell | App shell cacheado | |
| Instalable + caching extra | Más complejo | |

**User's choice:** Sin PWA  
**Notes:** Timer con alertas **solo in-app**; sin límite explícito de storage en v1.

---

## Estructura UI mínima

### Pantalla inicial
| Option | Description | Selected |
|--------|-------------|----------|
| Start workout | CTA directo | |
| Dashboard | Última sesión + iniciar | |
| Wizard | Onboarding mínimo | ✓ |

### Navegación
| Option | Description | Selected |
|--------|-------------|----------|
| Single screen | Sin rutas | ✓ |
| Tabs internos | Sesión/Historial/Ajustes | |
| Rutas mínimas | / y /workout | |

### Empty state
| Option | Description | Selected |
|--------|-------------|----------|
| CTA | Iniciar primera sesión | ✓ |
| Sample | Demo de sesión | |
| Blank | Vacía | |

### Refresh en sesión
| Option | Description | Selected |
|--------|-------------|----------|
| Auto resume | Reanuda sin preguntar | ✓ |
| Prompt | Pregunta si reanudar | |
| Restart | Reinicia | |

**User's choice:** Wizard + single screen + CTA + auto-resume  
**Notes:** Mantener experiencia guiada; evitar “folio en blanco”.

---

## Claude's Discretion

- Detalle exacto del wizard (preguntas mínimas) dentro del scope.
- Detalles visuales de “auto-guardado” (si mostrar indicador).

## Deferred Ideas

- Migrar a IndexedDB/Dexie si los límites de localStorage impactan.
- PWA instalable y caching cuando el core esté validado.
