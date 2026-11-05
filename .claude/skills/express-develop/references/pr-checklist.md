# Checklist de PR (backend Express + SQLite)

`express-develop` la usa antes de cerrar la fase 2 y `express-git` la usa para revisar el PR.

## Correctitud y pruebas
- [ ] Cada requerimiento de la matriz tiene tests y están en verde; la suite completa pasa.
- [ ] Casos obligatorios por endpoint (400/401/403-IDOR/404/409/campos extra/paginación/límites/500).
- [ ] Ningún test modificado, saltado o relajado sin justificación registrada.
- [ ] `npm run typecheck`, lint y build en verde.

## Arquitectura
- [ ] routes/controller sin SQL ni reglas; servicios sin `req/res`; repositorios sin HTTP.
- [ ] Dependencias inyectadas vía `createApp(deps)`/fábricas.
- [ ] Autorización por propiedad en el servicio o en la consulta.

## Datos y migraciones
- [ ] SQL 100 % parametrizado; columnas y orden desde una lista blanca; `LIKE` escapado.
- [ ] `foreign_keys = ON`; transacciones en operaciones multi-sentencia; lectura y escritura dentro de la misma transacción.
- [ ] Migraciones versionadas, en transacción, aplican desde cero; ninguna migración aplicada fue editada.
- [ ] Reversibilidad declarada (down o plan de rollback con backup) y riesgo de pérdida de datos evaluado.
- [ ] Índices justificados por consultas reales (`EXPLAIN QUERY PLAN` cuando importa); sin N+1.
- [ ] Tipos de columna explícitos (`STRICT` si aplica), dinero en enteros.

## API y contrato
- [ ] Códigos HTTP correctos; 201 + `Location`; 204 sin cuerpo.
- [ ] Paginación con máximo y orden estable.
- [ ] Formato de error único, `code` estables y documentados.
- [ ] OpenAPI actualizado y coincidente con los tests; cambios incompatibles marcados como `BREAKING CHANGE`.
- [ ] Idempotencia en operaciones críticas.

## Seguridad (ver `security-rules.md`)
- [ ] Validación de entrada en el borde con esquema; DTOs explícitos (sin mass assignment).
- [ ] Sin secretos en el código; config validada; `.env.example` actualizado.
- [ ] Sin stack traces ni SQL en las respuestas; logs sin datos sensibles.
- [ ] Límites de body y, si aplica, rate limiting.
- [ ] Dependencias nuevas justificadas y auditadas.

## Operación
- [ ] Apagado ordenado (servidor + conexión).
- [ ] Limitaciones de concurrencia de SQLite documentadas si la feature escribe mucho.
- [ ] Logs con id de correlación en errores.

## Documentación y commits
- [ ] `docs/features/<feature>.md` refleja lo implementado; TSDoc en la API pública.
- [ ] Migraciones en su propio commit o identificadas; Conventional Commits.
