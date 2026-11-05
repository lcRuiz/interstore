# Documentación de lo implementado

Documenta lo que **existe** después de GREEN y refactor, leyendo el código final y no la matriz.

## 1. TSDoc
| Elemento | Contenido |
|---|---|
| Servicio (fábrica y métodos públicos) | Qué hace, reglas de negocio aplicadas, transacción sí/no, `@throws` con los `code` de `AppError` |
| Repositorio | Qué consulta, orden y límites; `undefined` vs excepción |
| Esquemas Zod / DTOs | Restricciones no evidentes (unidades, máximos) |
| Middlewares | Qué exigen y qué dejan en `req` |
Sin tipos en las etiquetas, en el idioma de comentarios del repo (este backend: español).

## 2. `docs/features/<feature>.md`
Plantilla `assets/feature-doc.template.md`. Rellena:
- **Endpoints**: método, ruta, auth, query/body, respuestas y errores (con `code`).
- **Modelo de datos**: tablas, columnas, constraints e índices (desde la migración real).
- **Migraciones**: nombre, qué cambia, reversibilidad y rollback.
- **Decisiones**: las que tuvieron alternativas (offset vs cursor, 403 vs 404 en IDOR…).
- **Limitaciones**: concurrencia de SQLite, recortes.
- **Cómo probar y ejecutar**: comandos y un `curl` de ejemplo con datos sintéticos.

## 3. OpenAPI (`openapi.yaml`)
- Si existe, actualízalo en el mismo cambio: paths, parámetros, `requestBody`, respuestas 2xx y de error con el esquema de error del repo, `securitySchemes` si hay auth.
- Si no existe, créalo **solo** con los endpoints de la feature (plantilla `assets/openapi-path.template.md`) y regístralo como supuesto: un contrato parcial y correcto es mejor que uno completo e inventado.
- Debe coincidir con los tests: cada status probado aparece en `responses`.
- Valídalo si hay una herramienta en el repo; si no, revisión manual (agregar un validador es una dependencia nueva).

## 4. Marcadores
`SUPUESTO:`, `RECORTE:`, `NOTA:`, `TODO(<feature>):`. Los supuestos y recortes nuevos también van a la doc de la feature y, si afectan al producto, al README raíz.
