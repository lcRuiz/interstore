# Documentación de lo implementado

Las convenciones del repo mandan (en este repo: `frontend/CLAUDE.md` §12, que ESLint verifica con `eslint-plugin-jsdoc`). Esta guía cubre cómo aplicarlas al cerrar una feature.

## Principio
Documenta lo que **existe** después de GREEN y refactor. Un documento que describe lo planeado y no lo construido es peor que no tener documento: engaña al siguiente desarrollador y al reviewer.

## 1. TSDoc en la API pública
| Elemento | Contenido mínimo |
|---|---|
| Componente | Responsabilidad en una línea; en `shared/ui`, `@example` con el selector |
| `input()` / `model()` | Qué representa, unidades y restricciones, default no obvio |
| `output()` | Cuándo se emite y qué payload lleva |
| Store | Qué estado gestiona, fuente de verdad; en cada acción, sus efectos (HTTP, optimista, puntos) |
| API client | Endpoint por método y `@throws` con los `code` de `ApiError` que puede producir |
| Tipos del contrato | Endpoint que los usa; campos con semántica no obvia |

Sin tipos en las etiquetas, sin narrar el código, comentarios `//` solo para explicar un porqué.

## 2. `docs/features/<feature>.md`
Usa `assets/feature-doc.template.md`. Rellénalo leyendo el código final, no la matriz:
- **API pública**: cópiala de las firmas reales (selector, inputs, outputs, métodos).
- **Estructura de archivos**: `git diff --name-only <base>...HEAD` filtrado a la feature.
- **Flujos**: secuencia usuario → componente → store → API → estado, incluido el camino de error.
- **Decisiones**: solo las que tuvieron alternativas reales, con el porqué.
- **Cómo probar**: comandos y un recorrido manual corto.

## 3. Marcadores en el código
`SUPUESTO:`, `RECORTE:`, `NOTA:`, `TODO(<feature>):`. Cada `SUPUESTO:` y `RECORTE:` nuevo se lista también en el doc de la feature y, si afecta al producto, en el README raíz.

## 4. Verificación
- `npm run lint` debe pasar (incluye las reglas de jsdoc).
- Relee el doc con el diff al lado: cada afirmación debe poder señalarse en el código.
