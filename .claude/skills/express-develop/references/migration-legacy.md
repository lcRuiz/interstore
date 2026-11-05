# Código Express legado

Objetivo: mejorar el diseño sin cambiar comportamiento, con red de seguridad de tests.

## Orden recomendado
1. **Caracterización** (`express-test`): tests HTTP con supertest que fijan el comportamiento actual de los endpoints a tocar. Deben pasar.
2. **Testabilidad**: extraer `createApp(deps)` de `app.listen` e inyectar la conexión (base `:memory:` en tests). Commit `refactor`.
3. **Capas**: mover SQL a repositorios y reglas a servicios, un módulo por commit, con la caracterización en verde.
4. **SQL seguro**: reemplazar concatenaciones por placeholders (si hay inyección real, es un hallazgo de seguridad: test de regresión primero).
5. **Errores**: middleware central + `AppError`; en Express 4, `asyncHandler` o migración a Express 5 (guía oficial: `https://expressjs.com/en/guide/migrating-5.html`) en un PR aparte.
6. **Esquema**: de `CREATE TABLE IF NOT EXISTS` sueltos a migraciones versionadas:
   - Migración 1 = el esquema actual exacto (idempotente para bases existentes: detecta tablas existentes o fija `user_version` = 1 si ya están).
   - Cambios posteriores como migraciones nuevas.
   - Probar contra una copia sintética de una base existente (nunca contra datos reales sin la puerta humana).
7. **Config** validada al arrancar.

## Reglas
- Un tipo de cambio por commit (`refactor(<scope>): …`), sin mezclar refactor con cambios de comportamiento.
- Si la caracterización revela un bug, no lo corrijas en silencio: es un cambio de requerimiento (decisión del usuario).
- Express 4 → 5: revisa rutas con comodines, `req.query` mutado, `res.send(status)` y otros cambios incompatibles de la guía oficial.

## Este repo
El esquema actual (`backend/src/db/schema.ts`) es idempotente (`CREATE TABLE IF NOT EXISTS`) y se aplica en cada arranque. La primera feature que necesite cambiar una tabla existente debe introducir migraciones versionadas (paso 6) como decisión documentada, en su propio commit `feat(db)`/`refactor(db)`.
