# App Gym (Buscador Personal Trainer)

App web para registrar entrenamientos en el gimnasio con una experiencia guiada paso a paso.

## Requisitos

- **Node.js**: 20+ (recomendado **Node 22** para alinear local/CI)
- **npm**: incluido con Node

## Instalar (repo limpio)

```bash
npm ci
```

## Desarrollo

```bash
npm run dev
```

## Build (producción)

```bash
npm run build
```

## Preview (servir `dist/`)

```bash
npm run preview
```

## Tests

```bash
npx vitest run
```

### E2E (smoke)

```bash
npx playwright test
```

## Troubleshooting (estado persistido)

La app persiste un snapshot en `localStorage`. Si necesitas “resetear” el estado (por ejemplo tras cambiar el modelo), borra esta clave:

- `buscador_pt_snapshot_v1`

## Deploy (hosting estático)

### Opción A — GitHub Pages (recomendado)

**URL (project site):** `https://<owner>.github.io/<repo>/`  
Esto asume despliegue bajo subpath `/<repo>/` (GitHub Pages “Project site”).

**Pasos:**

1. Asegúrate de que el workflow de GitHub Actions está activo: `.github/workflows/deploy-pages.yml`.
2. En GitHub: **Repository Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Haz push a `main`. El workflow ejecuta `npm ci` → `npm run build` y despliega `dist/` a Pages.

**Nota importante (repo privado):** GitHub Pages para repos privados puede depender del plan (según cuenta/organización). Si en Settings → Pages no puedes habilitarlo, usa la Opción B.

### Opción B — Cloudflare Pages o Netlify (fallback)

Si GitHub Pages no está disponible en tu plan, Cloudflare Pages o Netlify suelen funcionar bien con repos privados.

- **Build command:** `npm run build`
- **Output directory:** `dist`

## Reproducibilidad (DEPL-02)

Desde un clone limpio:

```bash
npm ci
npm run build
npm run preview
```
