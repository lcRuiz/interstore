# Plantilla: OpenAPI mínimo para una feature

Úsala solo si el repo no tiene `openapi.yaml` (y regístralo como supuesto). Documenta únicamente los endpoints implementados.

```yaml
openapi: 3.1.0
info:
  title: Store API
  version: 0.1.0
servers:
  - url: http://localhost:3000
components:
  securitySchemes:
    demoUser:
      type: apiKey
      in: header
      name: X-User-Id
      description: Sesión simulada (supuesto de la prueba técnica). No es autenticación real.
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string, example: VALIDATION_ERROR }
            message: { type: string }
            details: {}
    PageMeta:
      type: object
      required: [page, pageSize, total, totalPages]
      properties:
        page: { type: integer, minimum: 1 }
        pageSize: { type: integer, minimum: 1 }
        total: { type: integer, minimum: 0 }
        totalPages: { type: integer, minimum: 0 }
  responses:
    ValidationError:
      description: Datos de entrada inválidos
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Unauthorized:
      description: Falta o es inválida la identidad
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
paths:
  /api/<recurso>:
    get:
      summary: Lista paginada de <recurso>
      security: [{ demoUser: [] }]
      parameters:
        - { name: page, in: query, schema: { type: integer, minimum: 1, default: 1 } }
        - { name: pageSize, in: query, schema: { type: integer, minimum: 1, maximum: 50, default: 12 } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data: { type: array, items: { $ref: '#/components/schemas/<Recurso>' } }
                  meta: { $ref: '#/components/schemas/PageMeta' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthorized' }
```
