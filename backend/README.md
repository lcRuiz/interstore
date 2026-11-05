# Store — Backend

API REST del catálogo con sistema de recompensas.
Stack: **Node.js + Express 5 + TypeScript + SQLite** (`node:sqlite`) + **Zod**.

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | **22.13 o superior** (probado con 24.x) — incluye `node:sqlite`, no requiere compilar binarios nativos |
| npm | 10 o superior |

```bash
node --version
```

## Puesta en marcha

Desde la carpeta `backend/`:

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **(Opcional) Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Sin `.env` se usan los valores por defecto:

   | Variable | Por defecto | Descripción |
   |---|---|---|
   | `PORT` | `3000` | Puerto HTTP de la API |
   | `DB_PATH` | `data/store.db` | Ruta del archivo SQLite (`:memory:` para una base volátil) |
   | `CORS_ORIGIN` | `http://localhost:4200` | Origen permitido (frontend Angular) |

3. **Levantar en modo desarrollo** (recarga automática)

   ```bash
   npm run dev
   ```

   La API queda en `http://localhost:3000`. Al arrancar se crea la base de datos y, si está vacía, se cargan los datos de demo (40 productos en 5 categorías y 2 usuarios).

4. **Verificar**

   ```bash
   curl http://localhost:3000/api/health
   ```

   ```bash
   curl -H "X-User-Id: 1" http://localhost:3000/api/me
   ```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con `tsx watch` |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada (requiere `npm run build`) |
| `npm test` | Ejecuta la suite de tests (Vitest + supertest, base en memoria) |
| `npm run test:watch` | Tests en modo watch |
| `npm run typecheck` | Verificación de tipos sin emitir archivos |
| `npm run db:reset` | Borra la base local y la recrea con los datos de demo |

## Usuarios de demo

La prueba no exige autenticación, así que se simula con el header `X-User-Id`:

| `X-User-Id` | Usuario |
|---|---|
| `1` | Ana Demo |
| `2` | Carlos Demo |

Las rutas que requieren usuario responden `401` si el header falta o el usuario no existe.

## Endpoints disponibles

| Método | Ruta | Usuario | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | No | Estado de la API |
| `GET` | `/api/me` | Sí | Perfil y saldo de puntos del usuario actual |

Todas las respuestas exitosas usan `{ "data": ... }`. Los errores siempre tienen la forma:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos", "details": [] } }
```

## Estructura

```
src/
├── app.ts            createApp({ db }): construye la app (inyectable en tests)
├── server.ts         arranque: abre la base, carga datos de demo y escucha
├── config.ts         variables de entorno validadas con Zod
├── db/               esquema, conexión, transacciones, seed y reset
├── errors/           AppError y manejador centralizado de errores
├── middleware/       validación (withValidation) y usuario actual (X-User-Id)
└── modules/          un módulo por recurso: repository + routes
tests/                tests de integración con base en memoria
```

## Problemas comunes

- **`Error: listen EADDRINUSE :::3000`** — el puerto está ocupado. Define otro en `.env` (`PORT=3001`) o detén el proceso que lo usa.
- **`Cannot find module 'node:sqlite'`** — la versión de Node es anterior a 22.13. Actualiza Node.
- **Datos inconsistentes tras probar** — ejecuta `npm run db:reset` (con el servidor detenido).
- **Imágenes de productos no cargan** — se sirven desde `picsum.photos`; requieren conexión a internet.
