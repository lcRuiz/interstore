# Revisión del PR (backend)

## Mentalidad
Revisa como si fueras a operar este código en producción. Busca lo que el autor no pudo ver: requerimientos sin test, rutas sin autorización, migraciones que no se pueden revertir, consultas que no escalan, contratos rotos. Cada comentario dice **qué**, **por qué** y **qué propones**.

## Insumos
```bash
gh pr view <n> --json title,body,files,commits
gh pr diff <n>
```
Más: la matriz, el reporte GREEN, el informe de seguridad, `openapi.yaml` y `express-develop/references/pr-checklist.md`.

## Ejes y preguntas
| Eje | Preguntas |
|---|---|
| Correctitud | ¿Cumple cada criterio de aceptación? ¿Casos borde (vacío, límites, concurrencia)? |
| Pruebas | ¿Casos obligatorios por endpoint (400/401/403-IDOR/404/409/campos extra/paginación/500)? ¿Tests de datos (FK, rollback, migración)? ¿Algún test relajado? |
| Seguridad | ¿SQL parametrizado? ¿Filtro por dueño? ¿DTO explícito? ¿El informe cubre el diff final? |
| Migraciones | ¿Versionada y en transacción? ¿Reversible o con plan de rollback creíble? ¿Edita una migración existente? ¿Pierde datos? ¿Bloquea mucho tiempo? ¿Compatible con la versión anterior del código? |
| Índices y rendimiento | ¿Cada consulta nueva tiene el índice que necesita (`EXPLAIN QUERY PLAN`)? ¿N+1? ¿`LIKE '%…%'` sobre tablas grandes? ¿Listados sin límite? |
| Contrato | ¿OpenAPI coincide con las respuestas y los tests? ¿Cambios incompatibles marcados como `BREAKING CHANGE`? ¿Los `code` de error son estables y están documentados? |
| Errores | ¿Errores de SQLite traducidos? ¿Sin fugas en el 500? ¿Transacciones que se revierten bien? |
| Legibilidad | ¿Responsabilidades por capa? ¿Nombres claros? ¿Abstracciones innecesarias? |
| Documentación | ¿La doc de la feature refleja el código final? ¿Limitaciones de SQLite declaradas? |
| Commits | ¿Convención? ¿Migración separada o identificada? ¿Atómicos? |

## Clasificación
| Nivel | Significado | Efecto |
|---|---|---|
| **Bloqueante** | Bug, requerimiento sin cubrir, vulnerabilidad, migración irreversible sin plan, contrato roto sin `BREAKING CHANGE`, test inválido | Impide el merge; dispara el ciclo de ajustes |
| **Sugerencia** | Mejora con beneficio claro (índice, test adicional, legibilidad) | Se acepta (ajuste) o se rechaza con justificación |
| **Nit** | Preferencia menor | Opcional |

## Ejemplo de comentario
```markdown
**[bloqueante]** `backend/src/db/migrations/0003_orders.ts:12`
La migración agrega `orders.status TEXT NOT NULL` sin valor por defecto: en una base con pedidos existentes falla, y el PR no trae plan de rollback.
Propuesta: `DEFAULT 'pending'` + test de migración sobre una base con datos sintéticos de la versión 2; documentar el rollback en el PR.
```

## Publicación y documento
- `gh pr review <n> --comment --body-file docs/reviews/<feature>-pr-<n>.md` (en un PR propio solo `--comment`; el estado va en el cuerpo).
- Comentarios en línea opcionales: `gh api repos/{owner}/{repo}/pulls/<n>/comments` (`path`, `line`, `side`, `commit_id`).
- El documento acumula rondas; no se sobrescribe.
