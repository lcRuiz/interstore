# Store — Frontend

Aplicación Angular 21 (standalone, zoneless, signals) del catálogo con sistema de recompensas.
Las reglas de arquitectura y estilo están en [CLAUDE.md](CLAUDE.md).

## Requisitos

- Node.js **22.13 o superior** (probado con 24.x) y npm 10 o superior.
- El backend corriendo en `http://localhost:3000` (ver [../backend/README.md](../backend/README.md)).

## Puesta en marcha

Desde `frontend/`:

```bash
npm install
```

```bash
npm start
```

Abrir `http://localhost:4200`. Las peticiones a `/api` se envían al backend mediante [proxy.conf.json](proxy.conf.json), así que en desarrollo no hace falta configurar CORS ni URLs.

Orden recomendado (dos terminales):

```bash
cd backend && npm run dev
```

```bash
cd frontend && npm start
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo con recarga (puerto 4200, proxy a la API) |
| `npm run build` | Build de producción en `dist/store-frontend` |
| `npm test` | Tests unitarios con Vitest (modo watch) |
| `npx ng test --watch=false` | Una sola corrida de tests |
| `npm run lint` | ESLint sobre TypeScript y templates (reglas en [eslint.config.js](eslint.config.js)) |
| `npm run lint:fix` | ESLint con autocorrección |
| `npm run format` / `format:check` | Prettier: formatear / verificar formato |

## Estructura

```
src/
├── app/
│   ├── core/       api (contrato y errores), session (X-User-Id), layout (shell)
│   ├── shared/     ui genérica (icon…) y utilidades (load-state)
│   └── features/   catalog, cart, rewards — cada una con data-access / ui / pages
└── styles/         tokens del sistema de diseño NORTE, breakpoints y base
```

## Usuario de demo

La app usa el usuario `1` (Ana Demo) por defecto, enviado en el header `X-User-Id` por un interceptor. No hay autenticación real (supuesto de la prueba).
