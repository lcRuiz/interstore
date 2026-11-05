#!/usr/bin/env node
/**
 * Barrido de patrones de riesgo (OWASP Top 10:2025, API Express + SQLite) limitado a las
 * líneas AÑADIDAS del diff contra una base, más los archivos nuevos sin trackear.
 * El motor (diff, alcance, salida) es compartido: .claude/workflow/shared/scripts/scan-diff-core.mjs.
 *
 * Es un punto de partida para la revisión manual de express-sec, no un veredicto.
 *
 * Uso:
 *   node .claude/skills/express-sec/scripts/scan-diff.mjs [--base main] [--json]
 *
 * Código de salida: 0 si el análisis corre (las coincidencias no son errores); 2 si git falla.
 */
import { newDependencyCheck, runScan } from '../../../workflow/shared/scripts/scan-diff-core.mjs';

const A01 = 'A01:2025 Broken Access Control';
const A02 = 'A02:2025 Security Misconfiguration';
const A03 = 'A03:2025 Software Supply Chain Failures';
const A04 = 'A04:2025 Cryptographic Failures';
const A05 = 'A05:2025 Injection';
const A06 = 'A06:2025 Insecure Design';
const A07 = 'A07:2025 Authentication Failures';
const A08 = 'A08:2025 Software or Data Integrity Failures';
const A09 = 'A09:2025 Security Logging and Alerting Failures';
const A10 = 'A10:2025 Mishandling of Exceptional Conditions';

/** Reglas: id, categoría OWASP, severidad sugerida, regex sobre la línea añadida. */
const RULES = [
  // A05 Injection
  { id: 'sql-template-interpolation', owasp: A05, sev: 'alta', re: /`[^`]*\b(SELECT|INSERT|UPDATE|DELETE|WHERE|ORDER BY|GROUP BY|LIMIT|VALUES)\b[^`]*\$\{/i, hint: 'SQL con interpolación: solo válido para identificadores de una lista blanca o placeholders generados (SRB-001/002).' },
  { id: 'sql-concatenation', owasp: A05, sev: 'alta', re: /['"`]\s*\b(SELECT|INSERT|UPDATE|DELETE)\b[^'"`]*['"`]\s*\+|\b(WHERE|ORDER BY|AND|OR)\b[^'"`]*['"`]\s*\+\s*\w/i, hint: 'SQL concatenado (SRB-001).' },
  { id: 'sql-exec-dynamic', owasp: A05, sev: 'alta', re: /\.exec\(\s*`[^`]*\$\{/, hint: 'exec con SQL dinámico: permite sentencias apiladas (SRB-001).' },
  { id: 'sql-like-unescaped', owasp: A05, sev: 'baja', re: /\bLIKE\b(?![^`'"]*ESCAPE)/i, hint: 'LIKE sin ESCAPE: el usuario controla los comodines (SRB-002).' },
  { id: 'sql-order-from-request', owasp: A05, sev: 'alta', re: /ORDER BY[^`'"]*\$\{[^}]*(req\.|query\.|params\.|body\.)/i, hint: 'ORDER BY desde la petición: exigir lista blanca (SRB-002).' },
  { id: 'command-exec', owasp: A05, sev: 'alta', re: /from\s+['"](node:)?child_process['"]|require\(['"](node:)?child_process['"]\)|\bexecSync\(|\bspawn\([^)]*shell\s*:\s*true/, hint: 'Ejecución de comandos: execFile con args en array, sin shell (SRB-009).' },
  { id: 'code-eval', owasp: A05, sev: 'alta', re: /\beval\(|new Function\(/, hint: 'Ejecución de código desde un string.' },
  { id: 'regex-from-input', owasp: A05, sev: 'media', re: /new RegExp\([^)]*(req\.|query|params|body)/, hint: 'Regex construida con entrada del usuario: ReDoS/inyección.' },
  { id: 'prototype-pollution', owasp: A05, sev: 'media', re: /__proto__|Object\.assign\([^)]*req\.(body|query)|(merge|defaultsDeep|extend)\([^)]*req\.(body|query)/, hint: 'Posible prototype pollution / mass assignment (SRB-004/009).' },
  // A01 Broken Access Control
  { id: 'mass-assignment-spread', owasp: A01, sev: 'media', re: /\.\.\.req\.(body|query)\b|\.run\(\s*req\.body\b|Object\.values\(req\.body\)/, hint: 'Body completo hacia la persistencia: usar DTO explícito (SRB-004).' },
  { id: 'identity-from-client', owasp: A01, sev: 'alta', re: /req\.(body|query)\.(user_?id|userId|owner_?id|role|isAdmin)\b/i, hint: 'Identidad o rol tomados del cliente (SRB-003/012).' },
  { id: 'id-from-route', owasp: A01, sev: 'informativa', re: /req\.params\.\w*[iI]d\b/, hint: 'Acceso por id: confirmar el filtro por dueño en la consulta (IDOR, SRB-003).' },
  { id: 'path-traversal', owasp: A01, sev: 'alta', re: /(sendFile|download|createReadStream|readFile(Sync)?|writeFile(Sync)?)\([^)]*req\./, hint: 'Ruta de archivo con entrada del usuario (SRB-009).' },
  { id: 'open-redirect', owasp: A01, sev: 'media', re: /res\.redirect\([^)]*req\./, hint: 'Redirección con entrada del usuario: lista blanca.' },
  { id: 'ssrf', owasp: A01, sev: 'alta', re: /\b(fetch|axios(\.\w+)?|got|http\.get|https\.get|request)\(\s*[^)]*req\.(body|query|params)/, hint: 'Petición saliente con URL del usuario (SSRF).' },
  { id: 'cors-wildcard', owasp: A01, sev: 'media', re: /origin\s*:\s*['"`]\*['"`]|origin\s*:\s*true|cors\(\s*\)/, hint: 'CORS permisivo; crítico si además credentials: true.' },
  // A02 Misconfiguration
  { id: 'error-leak', owasp: A02, sev: 'media', re: /res\.(status\([^)]*\)\.)?(json|send)\([^)]*\b(stack|err\.message|error\.message)\b/, hint: 'Detalles internos en la respuesta (SRB-005).' },
  { id: 'trust-proxy-true', owasp: A02, sev: 'media', re: /trust proxy['"]\s*,\s*true/, hint: 'trust proxy en true: req.ip falsificable.' },
  { id: 'powered-by', owasp: A02, sev: 'baja', re: /enable\(['"]x-powered-by['"]\)/, hint: 'Revela la tecnología.' },
  { id: 'cookie-flags', owasp: A02, sev: 'informativa', re: /res\.cookie\(/, hint: 'Confirmar httpOnly, secure, sameSite y expiración.' },
  { id: 'json-no-limit', owasp: A02, sev: 'baja', re: /express\.json\(\s*\)/, hint: 'Sin límite explícito de body (SRB-007).' },
  { id: 'static-serving', owasp: A02, sev: 'informativa', re: /express\.static\(/, hint: 'Confirmar que no sirve la base ni backups.' },
  // A03 Supply chain
  { id: 'npm-config', owasp: A03, sev: 'media', re: /"(pre|post)install"\s*:|registry\s*=|"(github:|git\+)/, hint: 'Script de instalación, registro alternativo o dependencia desde git (SRB-010).' },
  // A04 Crypto
  { id: 'hardcoded-secret', owasp: A04, sev: 'critica', re: /(api[_-]?key|secret|passw(or)?d|private[_-]?key|jwt[_-]?secret)\s*[:=]\s*['"`][^'"`\s]{8,}/i, hint: 'Posible secreto hardcodeado (SRB-006).' },
  { id: 'weak-hash', owasp: A04, sev: 'media', re: /createHash\(\s*['"](md5|sha1)['"]/i, hint: 'Hash débil; para contraseñas usar argon2id/bcrypt/scrypt.' },
  { id: 'non-constant-compare', owasp: A04, sev: 'baja', re: /\b\w*(token|signature|hmac|apiKey)\w*\s*[!=]==?\s*\w/i, hint: 'Comparación no constante de secretos: crypto.timingSafeEqual.' },
  // A06 Insecure design
  { id: 'unbounded-query', owasp: A06, sev: 'baja', re: /SELECT\b(?![^`'"]*\bLIMIT\b)[^`'"]*\bFROM\b[^`'"]*(`|'|")\s*\)\s*\.all\(/i, hint: 'Listado sin LIMIT: confirmar que la tabla es acotada (SRB-007).' },
  // A07 Authentication
  { id: 'jwt-decode', owasp: A07, sev: 'alta', re: /jwt\.decode\(|algorithms?\s*:\s*\[?\s*['"]none['"]/i, hint: 'JWT sin verificar firma o alg none.' },
  // A08 Integrity
  { id: 'fk-off', owasp: A08, sev: 'media', re: /foreign_keys\s*=\s*(OFF|0)\b/i, hint: 'FK desactivadas: exigir foreign_key_check y reactivación.' },
  { id: 'destructive-sql', owasp: A08, sev: 'media', re: /\bDROP\s+(TABLE|INDEX)\b|\bDELETE\s+FROM\s+\w+\s*(;|`|'|"|$)/i, hint: 'Operación destructiva: plan de rollback y backup.' },
  { id: 'unsafe-deserialize', owasp: A08, sev: 'alta', re: /node-serialize|\bunserialize\(/, hint: 'Deserialización insegura.' },
  { id: 'no-verify', owasp: A08, sev: 'media', re: /--no-verify|continue-on-error:\s*true/, hint: 'Se salta controles de integridad.' },
  // A09 Logging
  { id: 'log-request-data', owasp: A09, sev: 'media', re: /(log|info|debug|warn|error)\([^)]*req\.(body|headers|cookies)/, hint: 'Datos de la petición en logs: redactar (SRB-008).' },
  { id: 'console-log', owasp: A09, sev: 'baja', re: /console\.(log|debug|info|trace)\(/, hint: 'Confirmar que no registra datos sensibles (SRB-008).' },
  // A10 Exceptional conditions
  { id: 'empty-catch', owasp: A10, sev: 'media', re: /catch\s*(\([^)]*\))?\s*\{\s*\}|\.catch\(\s*\(\s*\)\s*=>\s*(undefined|null|\{\s*\})\s*\)/, hint: 'Error silenciado (SRB-011).' },
];

runScan({
  title: 'scan-diff (express)',
  rules: RULES,
  scanned: /\.(ts|js|mjs|cjs|json|sql|yml|yaml)$|(^|\/)\.npmrc$/,
  // El backend está en backend/: no analiza el frontend.
  ignored: /^frontend\//,
  extraChecks: newDependencyCheck(A03, 'Dependencia nueva o actualizada: justificar y ejecutar npm audit --omit=dev (SRB-010).'),
});
