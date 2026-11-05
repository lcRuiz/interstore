# Arquitectura por capas

## Estructura de referencia (por módulo)
```
src/
├── app.ts                 createApp(deps): middlewares globales, montaje de módulos, 404 y error handler
├── server.ts              arranque: config → db → app.listen → apagado ordenado
├── config.ts              variables de entorno validadas
├── db/                    conexión, PRAGMAs, migraciones, seed de demo
├── errors/                AppError, error handler
├── middleware/            validación, usuario actual, rate limit…
└── modules/<recurso>/
    ├── <recurso>.routes.ts        router + middlewares + validación
    ├── <recurso>.controller.ts    req → DTO → servicio → respuesta (si el repo separa controller)
    ├── <recurso>.service.ts       reglas de negocio, transacciones
    ├── <recurso>.repository.ts    SQL parametrizado
    └── <recurso>.schemas.ts       Zod: params, query, body y DTOs
```
Respeta la estructura existente del repo. Si ya existe `modules/<recurso>/` con `repository` + `routes`, agrega `service` cuando haya reglas de negocio; no crees capas vacías.

## Responsabilidades
| Capa | Hace | No hace |
|---|---|---|
| Routes/controller | Validar entrada, mapear a DTO, llamar al servicio, elegir status y forma de respuesta | SQL, reglas de negocio, transacciones |
| Service | Reglas de negocio, autorización por propiedad, orquestar repositorios, transacciones, traducir errores de datos a errores de dominio | Conocer `req`/`res`, construir SQL |
| Repository | SQL parametrizado, mapear filas a objetos (`snake_case` → `camelCase`) | Decidir status HTTP, reglas de negocio |

## Inyección de dependencias simple
```ts
export interface AppDeps {
  db: Db;
  clock?: () => Date;
  logger?: Logger;
}

export function createApp(deps: AppDeps): Express {
  const repos = { products: createProductsRepository(deps.db) };
  const services = { products: createProductsService({ ...repos, clock: deps.clock ?? (() => new Date()) }) };
  // montar routers con sus servicios
}
```
- Fábricas (`createXRepository(db)`) en lugar de singletons importados: los tests inyectan una base `:memory:` o dobles.
- Sin contenedor de DI: para este tamaño es complejidad innecesaria.

## Autorización: dónde vive
- **Autenticación** (quién eres): middleware (`currentUser`), deja el usuario en `req`.
- **Autorización por rol**: middleware declarativo en la ruta (`requireRole('admin')`).
- **Autorización por propiedad (anti-IDOR)**: en el **servicio** o en la consulta del repositorio (`WHERE id = ? AND user_id = ?`). Nunca confiar en un `userId` del body o de la ruta para decidir propiedad.

## Transacciones
Las abre el servicio (sabe qué operaciones forman una unidad). El repositorio recibe la misma conexión. En SQLite con conexión única, `BEGIN IMMEDIATE … COMMIT/ROLLBACK` mediante un helper (`transaction(db, fn)`).
