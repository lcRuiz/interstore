# Flujo de desarrollo Angular con agentes

Un agente orquestador (`angular-dev-agent`) encadena cuatro skills con criterios de salida, límite de iteraciones y puertas humanas:

```
Contexto/requerimiento
   ▼
[1] angular-test    → specs + esqueletos + reporte RED (fallo por la razón correcta)
   ▼
[2] angular-develop → GREEN + refactor + documentación
   ▼
[3] angular-sec     → auditoría OWASP Top 10:2025 SOLO del diff + reglas para develop
   │   (hallazgo → test de regresión rojo → fix → verde → re-auditar delta)
   ▼
[4] angular-git     → commit → PR → revisión → (ajustes: volver a 1/2)
```

| Pieza | Responsabilidad (sin solapamiento) |
|---|---|
| `angular-dev-agent` | Orquesta, verifica criterios de salida, mantiene el estado, pide confirmaciones |
| `angular-test` | Diseña y verifica pruebas (RED) |
| `angular-develop` | Implementa y documenta (GREEN) |
| `angular-sec` | Audita el diff y alimenta las reglas de seguridad |
| `angular-git` | Versiona, abre y revisa el PR |

## Uso

- Flujo completo: *"Usa angular-dev-agent para implementar <feature> en frontend"*. El agente detecta el entorno, crea `.workflow/<feature>/state.md` y avanza fase por fase.
- Una sola fase: las skills también funcionan solas (p. ej. *"escribe primero los tests de …"* → `angular-test`; *"revisa la seguridad de este cambio"* → `angular-sec`).
- Retomar: *"retoma el flujo de <feature>"*. El agente lee `state.md` y continúa desde la fase registrada.

Puertas humanas (siempre con confirmación explícita): `git push`, abrir el PR, publicar la revisión, cambiar un test existente por cambio de requerimiento, instalar dependencias y cualquier acción destructiva. El agente nunca hace merge, `--force` ni push a ramas protegidas.

## Árbol

```
.claude/
├── agents/
│   └── angular-dev-agent.md            orquestador (subagente de Claude Code)
├── skills/
│   ├── angular-test/
│   │   ├── SKILL.md
│   │   ├── references/  test-design · components · services-http · guards-interceptors
│   │   │                signals-zoneless · vitest-setup · anti-patterns
│   │   └── assets/      spec-templates · test-matrix.template · red-report.template
│   ├── angular-develop/
│   │   ├── SKILL.md
│   │   ├── references/  security-rules (lo escribe angular-sec) · angular21-guide · anti-patterns
│   │   │                pr-checklist · documentation · migration-legacy
│   │   └── assets/      feature-doc.template · green-report.template
│   ├── angular-sec/
│   │   ├── SKILL.md
│   │   ├── references/  owasp-frontend-checklist · findings-and-severity · remediation-loop
│   │   ├── assets/      audit-report.template · security-rule.template
│   │   └── scripts/     scan-diff.mjs (patrones de riesgo en las líneas añadidas)
│   └── angular-git/
│       ├── SKILL.md
│       ├── references/  pr-workflow · pr-review · adjustment-cycle
│       └── assets/      pr-body.template · pr-review.template
└── workflow/
    ├── shared/
    │   ├── git/                        commit-conventions · branching (agnósticos al stack)
    │   └── scripts/scan-diff-core.mjs  motor del escáner de diff (lo usan angular-sec y express-sec)
    └── angular/
        ├── README.md                   este archivo
        ├── handoff-contracts.md        contratos entre fases
        ├── state-template.md           formato de .workflow/<feature>/state.md
        └── evals/                      6 casos end-to-end (formato `claude plugin eval`)

Generado por el flujo (en la raíz del repo):
.workflow/<feature>/                    estado, matriz, reportes RED/GREEN (no versionado)
docs/features/<feature>.md              documentación de lo implementado
docs/security/<feature>-audit.md        informe OWASP del diff
docs/reviews/<feature>-pr-<n>.md        revisión del PR y rondas de ajustes
```

## Evals end-to-end

| Caso | Qué valida |
|---|---|
| `full-flow-new-feature` | Las cuatro fases en orden, con evidencia real y puerta humana antes del push/PR |
| `http-service-error-handling` | Tests de contrato HTTP y de los errores 400/red/5xx antes de implementar; reutiliza `ApiError` |
| `signals-component-states` | Store con signals y página con los estados carga/vacío/error/éxito y reintento; tests zoneless |
| `security-xss-bypass` | `bypassSecurityTrustHtml` detectado (A05:2025), test de regresión, fix, re-auditoría del delta y regla SR-001 refinada |
| `pr-review-adjustment-cycle` | Revisión con bloqueante y sugerencia → test rojo → fix → commits nuevos → ronda 2 documentada |
| `legacy-without-tests` | Caracterización en verde → migración en commits `refactor` → filtro nuevo con TDD |

Cada caso tiene `prompt.md`, `case.yaml` (resultado esperado) y `graders/` (un criterio verificable por archivo). Los casos `security-xss-bypass`, `pr-review-adjustment-cycle` y `legacy-without-tests` traen archivos de entrada en `files/` y un `place-files.sh` que los copia al entorno de prueba.

Requisitos de los casos: corren sobre una copia de este repositorio (con `frontend/` y `backend/`). `pr-review-adjustment-cycle` necesita además la rama `feat/12-cart-optimistic` con la feature del carrito, y no puede ejecutarse hasta que exista.

Ejecución (opcional, requiere Claude Code v2.1.269 o superior; son ejecuciones reales y facturadas):
```bash
cd .claude/workflow/angular && claude plugin eval . --allow-tools Write,Edit,Bash --scaffold
```
Si la CLI exige que los casos estén dentro de una skill, copia la carpeta del caso a `.claude/skills/<skill>/evals/` de la skill principal que valida (sec → `angular-sec`, ajustes → `angular-git`, el resto → `angular-test` o `angular-develop`).

## Mantenimiento

- `security-rules.md` crece con cada auditoría: se refina, no se duplica.
- Si cambia la edición del OWASP Top 10, actualiza `angular-sec/SKILL.md`, `owasp-frontend-checklist.md` y los IDs de `security-rules.md`.
- Si cambian las convenciones del repo (`frontend/CLAUDE.md`), las skills las respetan automáticamente, porque leen ese archivo; revisa solo las referencias que citen secciones concretas (§).
