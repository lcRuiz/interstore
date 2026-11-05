---
name: express-sec
description: Audita la seguridad de los cambios de una API Node.js/Express con SQLite contra el OWASP Top 10 vigente, solo sobre el diff (código, migraciones, package.json y lockfile; no todo el repo). Detecta inyección SQL (concatenación, ORDER BY o LIKE dinámicos), IDOR/BOLA, mass assignment, endpoints sin autorización, secretos y hashing débil, JWT/sesiones inseguros, CORS y headers mal configurados, fugas en errores, falta de límites, SSRF, path traversal, prototype pollution, dependencias nuevas y datos sensibles en logs. Clasifica por severidad, dirige el bucle test de regresión → fix → re-auditoría del delta, registra reglas para express-develop y emite un veredicto (APROBADO / APROBADO CON RIESGO ACEPTADO / BLOQUEADO). Úsala siempre antes de commitear o abrir un PR del backend, al pedir una revisión de seguridad u OWASP de un endpoint o migración, o ante SQL armado con template strings, aunque solo digan "revisa si esto es seguro". No implementa ni revisa estilo.
---

# express-sec — auditoría OWASP del diff (backend)

Auditas **solo lo que cambió**: código, migraciones, `package.json` y lockfile. El objetivo es que nada nuevo entre con una vulnerabilidad y que cada lección se convierta en una regla que `express-develop` aplique la próxima vez.

Contratos y estado: `.claude/workflow/express/handoff-contracts.md`, `.workflow/<feature>/state.md`. Nunca leas `.env` ni bases reales: si una verificación lo requiere, pide al usuario una confirmación con datos sintéticos.

## 1. Edición de OWASP (verificar, no asumir)
Confirma la edición vigente en `https://owasp.org/Top10/` (redirige a `top10.owasp.org`) y **declárala en el informe**. Al 2026-11-05 es **OWASP Top 10:2025**: A01 Broken Access Control · A02 Security Misconfiguration · A03 Software Supply Chain Failures · A04 Cryptographic Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures · A08 Software or Data Integrity Failures · A09 Security Logging and Alerting Failures · A10 Mishandling of Exceptional Conditions. En la edición 2025, SSRF quedó dentro de A01 (verifícalo en la página de la categoría). Si la web muestra otra edición, usa esa y actualiza `references/owasp-mapping.md`. Sin red: usa esta lista y decláralo como supuesto.

## 2. Alcance: el diff
1. Base: la del estado (`main` por defecto).
2. Archivos en alcance:
   ```bash
   git diff --name-only $(git merge-base HEAD <base>)
   git ls-files --others --exclude-standard
   ```
   Incluye migraciones, `package.json`, `package-lock.json`, config (`.env.example`, `config.ts`) y `openapi.yaml`.
3. Barrido automático de las líneas añadidas (punto de partida, no veredicto):
   ```bash
   node .claude/skills/express-sec/scripts/scan-diff.mjs --base <base>
   ```
4. Si cambiaron dependencias: `cd backend && npm audit --omit=dev` (salida real en el informe).
5. **Revisión manual** de cada archivo con `references/express-checklist.md` y `references/sqlite-security.md`; para auth, `references/auth-jwt-sessions.md`. Sigue los flujos de datos de punta a punta: de dónde viene cada valor (`req.*`) y a dónde llega (SQL, archivo, red, log, respuesta).
6. Fuera del diff solo lees lo necesario para entender un flujo (middleware de auth, error handler). Un problema preexistente fuera de alcance se reporta como **informativo**.

## 3. Clasificación
Por hallazgo (`references/report-template.md` § Hallazgo): ID `SEC-<feature>-NN`, categoría OWASP, severidad (crítica / alta / media / baja / informativa) con el porqué, archivo:línea, evidencia mínima, impacto concreto en esta API, remediación concreta (con la regla `SRB-NNN` aplicable) y probabilidad de falso positivo.

Rúbrica rápida:
| Severidad | Ejemplos |
|---|---|
| Crítica | Inyección SQL explotable sin autenticación; secreto de producción en el repo; bypass total de autorización |
| Alta | IDOR sobre datos de otros usuarios; mass assignment de `role`; SQL dinámico con lista blanca rota; SSRF |
| Media | Falta de límite de paginación o de body; stack trace en el 500; CORS permisivo sin credenciales; `LIKE` sin escape |
| Baja | `console.log` sin datos sensibles; `x-powered-by` |
| Informativa | Riesgo del modelo de sesión simulada (`X-User-Id`); preexistente fuera de alcance |

## 4. Bucle de remediación (máx. 3 iteraciones)
Para cada hallazgo **accionable** (crítico, alto y medio; los bajos a criterio, justificado):
1. **Test de regresión en rojo** vía `express-test` (modo regresión): una petición con el payload de inyección (`' OR 1=1 --`, `sort=name;DROP TABLE products`), el acceso de un usuario a un recurso ajeno, un body con `role: 'admin'`… Debe fallar con el código actual. Nombre o comentario con `SEC-<feature>-NN`.
2. **Fix** vía `express-develop` (modo remediación) en la causa raíz.
3. Suite completa en **verde**.
4. **Re-auditoría solo del delta del fix** (`git diff` de esos cambios + `scan-diff.mjs --base <commit previo al fix>`).

Hallazgos no testeables unitariamente (dependencias, configuración del despliegue): la evidencia es un comando verificable (`npm audit --omit=dev`, un `curl -I` a la app local mostrando los headers). Si al tercer intento sigue abierto: `BLOQUEADO` y escala.

## 5. Retroalimentación a desarrollo
Actualiza `.claude/skills/express-develop/references/security-rules.md` (si las skills son de solo lectura: `docs/security/secure-coding-rules.md` + un puntero en `express-develop`):
- Formato `assets/security-rule.template.md` (ID `SRB-NNN`, categoría, regla "haz X, evita Y porque Z", ejemplo incorrecto/correcto mínimo, origen feature/fecha).
- **Deduplica**: si existe una regla sobre el mismo sink o tema, **refínala** (más precisa, nuevo ejemplo, origen adicional); crea una regla nueva solo para un patrón nuevo.
- Sin secretos, datos reales ni detalles de infraestructura en los ejemplos. Actualiza el índice.

## 6. Veredicto
| Veredicto | Condición |
|---|---|
| **APROBADO** | Sin hallazgos abiertos de severidad media o superior |
| **APROBADO CON RIESGO ACEPTADO** | Sin críticos ni altos; medios/bajos aceptados **por escrito por el usuario** (registrado en el estado) |
| **BLOQUEADO** | Algún crítico o alto abierto, o la remediación agotó las iteraciones |

Con `BLOQUEADO`, el flujo no avanza a `express-git`.

## Salida
1. `docs/security/<feature>-audit.md` (`references/report-template.md`): alcance (base, archivos, migraciones, dependencias), edición OWASP, metodología, hallazgos y estado, riesgos del despliegue, riesgo residual, reglas registradas, veredicto.
2. `security-rules.md` actualizado.
3. `state.md` (fase 3).

**Criterio de salida hacia express-git**: veredicto emitido y sin críticos ni altos abiertos.

## Referencias
| Archivo | Para qué |
|---|---|
| `references/owasp-mapping.md` | Qué buscar por categoría en Express + SQLite, con patrones |
| `references/express-checklist.md` | Checklist de middlewares, rutas, config y errores |
| `references/sqlite-security.md` | Inyección, PRAGMAs, migraciones y el archivo de la base |
| `references/auth-jwt-sessions.md` | Contraseñas, JWT, sesiones, cookies, fuerza bruta |
| `references/report-template.md` | Informe de auditoría y formato de hallazgo |
| `scripts/scan-diff.mjs` | Barrido de patrones en las líneas añadidas del diff |
