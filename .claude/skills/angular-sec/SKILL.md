---
name: angular-sec
description: Audita la seguridad de los cambios de un frontend Angular contra el OWASP Top 10 vigente, solo sobre el diff actual (no todo el repo). Detecta XSS (innerHTML, bypassSecurityTrust*, URLs dinámicas), control de acceso solo en cliente, tokens y secretos en el navegador o el bundle, open redirects, configuración insegura, dependencias nuevas, fugas en logs y errores mal manejados. Clasifica hallazgos por severidad, dirige el bucle test de regresión → fix → re-auditoría del delta, registra reglas de codificación segura para angular-develop y emite un veredicto (APROBADO / APROBADO CON RIESGO ACEPTADO / BLOQUEADO). Úsala siempre antes de commitear o abrir un PR de código Angular, cuando pidan una revisión de seguridad, OWASP o AppSec de un cambio, o ante código sospechoso como bypassSecurityTrustHtml, aunque solo digan "revisa si esto es seguro". No implementa ni revisa estilo (angular-develop / angular-git).
---

# angular-sec — auditoría OWASP del diff

Auditas **solo lo que cambió**. Auditar todo el repo en cada feature produce ruido, es lento y diluye la responsabilidad. El objetivo es que nada nuevo entre con una vulnerabilidad y que cada lección se convierta en una regla que `angular-develop` aplique la próxima vez.

Contratos y estado: `.claude/workflow/handoff-contracts.md`, `.workflow/<feature>/state.md`.

## 1. Edición de OWASP (verificar, no asumir)

Antes de auditar, confirma la edición vigente en `https://owasp.org/Top10/` (redirige a `top10.owasp.org`) y **declárala en el informe**. A la fecha de esta skill (2026-11-05) es **OWASP Top 10:2025**:

| ID | Categoría |
|---|---|
| A01:2025 | Broken Access Control |
| A02:2025 | Security Misconfiguration |
| A03:2025 | Software Supply Chain Failures |
| A04:2025 | Cryptographic Failures |
| A05:2025 | Injection |
| A06:2025 | Insecure Design |
| A07:2025 | Authentication Failures |
| A08:2025 | Software or Data Integrity Failures |
| A09:2025 | Security Logging and Alerting Failures |
| A10:2025 | Mishandling of Exceptional Conditions |

Si la web muestra otra edición, usa esa, adapta los IDs del checklist y anótalo en el informe y en `references/owasp-frontend-checklist.md`. Si no tienes acceso a la red, usa esta tabla y decláralo como supuesto.

## 2. Alcance: el diff

1. Rama base: la del estado (`main` por defecto). Si no la hay, `git merge-base HEAD main`.
2. Archivos en alcance:
   ```bash
   git diff --name-only $(git merge-base HEAD <base>)   # modificados (incluye cambios sin commitear)
   git ls-files --others --exclude-standard            # nuevos sin trackear
   ```
3. Barrido automático de patrones sobre **las líneas añadidas** (punto de partida, no veredicto):
   ```bash
   node .claude/skills/angular-sec/scripts/scan-diff.mjs --base <base>
   ```
   Sin Node, entrega el comando y pide la salida, o haz el barrido con `git diff -U0` + Grep usando los patrones de `references/owasp-frontend-checklist.md`.
4. **Revisión manual** de cada archivo en alcance con el checklist por categoría. El script no entiende el contexto: los flujos (de dónde viene un dato, quién decide un permiso) se revisan leyendo el código.
5. Fuera del diff solo miras lo necesario para entender un flujo (p. ej. el interceptor que procesa una petición nueva). Un problema preexistente fuera del diff se reporta como **informativo** ("preexistente, fuera de alcance"), no bloquea.

## 3. Clasificación

Por cada hallazgo, según `references/findings-and-severity.md`:
- ID `SEC-<feature>-NN`, categoría OWASP, severidad (crítica / alta / media / baja / informativa).
- Archivo y línea, evidencia (fragmento mínimo), impacto concreto en esta app, remediación concreta.
- Probabilidad de falso positivo (baja/media/alta) con el motivo. Un hallazgo del script descartado tras la revisión manual se lista como falso positivo, para que quede trazado.

Contexto del backend: si el riesgo real depende del servidor (p. ej. autorización), anótalo como **riesgo del backend** con la recomendación, aunque el fix no sea del frontend.

## 4. Bucle de remediación (máx. 3 iteraciones)

Para cada hallazgo **accionable** (crítico, alto o medio; los bajos, a criterio con justificación):
1. **Test de regresión en rojo** vía `angular-test` (modo regresión): reproduce el hallazgo y falla con el código actual. Nombre o comentario con el ID `SEC-<feature>-NN`.
2. **Fix** vía `angular-develop` (modo remediación), con el cambio mínimo en la causa raíz.
3. Suite completa en **verde**.
4. **Re-auditoría solo del delta del fix** (`git diff` de esos commits o archivos), por si el fix introdujo algo nuevo.

Detalles y casos (hallazgos no testeables unitariamente, como configuración del build) en `references/remediation-loop.md`. Si al tercer intento no está resuelto: veredicto `BLOQUEADO` y escala con evidencia.

## 5. Retroalimentación a desarrollo

Tras la auditoría, actualiza `.claude/skills/angular-develop/references/security-rules.md` (si la skill fuera de solo lectura: `docs/security/secure-coding-rules.md` + un puntero en `angular-develop`):
- Formato: `assets/security-rule.template.md` (ID `SR-NNN`, categoría, regla "haz X, evita Y porque Z", ejemplo incorrecto/correcto mínimo, origen feature/fecha).
- **Deduplica**: busca primero una regla existente sobre el mismo tema. Si existe, **refínala** (más precisa, nuevo ejemplo, origen adicional) en lugar de crear otra. Agrega una regla nueva solo para un patrón realmente nuevo.
- Registra reglas de hallazgos reales o de riesgos generalizables, no de falsos positivos.
- Nunca incluyas secretos, tokens, URLs internas ni datos reales en los ejemplos.
- Actualiza el índice del archivo.

## 6. Veredicto

| Veredicto | Condición |
|---|---|
| **APROBADO** | Sin hallazgos abiertos de severidad media o superior |
| **APROBADO CON RIESGO ACEPTADO** | Sin críticos ni altos abiertos; medios/bajos abiertos con riesgo aceptado **por escrito por el usuario** (registrado en el estado) |
| **BLOQUEADO** | Algún crítico o alto abierto, o la remediación agotó las iteraciones |

Con `BLOQUEADO`, el flujo **no** avanza a `angular-git`.

## Salida

1. `docs/security/<feature>-audit.md` con `assets/audit-report.template.md`: alcance (base, archivos, commits), edición OWASP usada, metodología (script + manual), hallazgos, estado de cada uno, riesgo residual, reglas registradas y veredicto.
2. `security-rules.md` actualizado (o la lista de reglas refinadas).
3. `state.md` (fase 3: iteraciones, veredicto).

**Criterio de salida hacia angular-git**: veredicto emitido y sin críticos ni altos abiertos.

## Referencias
| Archivo | Para qué |
|---|---|
| `references/owasp-frontend-checklist.md` | Qué buscar en Angular por cada categoría, con patrones de búsqueda |
| `references/findings-and-severity.md` | Rúbrica de severidad, falsos positivos frecuentes y formato de hallazgo |
| `references/remediation-loop.md` | Cómo testear y corregir cada tipo de hallazgo |
| `scripts/scan-diff.mjs` | Barrido de patrones en las líneas añadidas del diff |
