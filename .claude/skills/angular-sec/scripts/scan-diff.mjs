#!/usr/bin/env node
/**
 * Barrido de patrones de riesgo (OWASP Top 10:2025, frontend Angular) limitado
 * a las líneas AÑADIDAS del diff contra una base, más los archivos nuevos sin trackear.
 * El motor (diff, alcance, salida) es compartido: .claude/workflow/shared/scripts/scan-diff-core.mjs.
 *
 * Es un punto de partida para la revisión manual de angular-sec, no un veredicto.
 *
 * Uso:
 *   node .claude/skills/angular-sec/scripts/scan-diff.mjs [--base main] [--json]
 *
 * Código de salida: 0 si el análisis corre (las coincidencias no son errores); 2 si git falla.
 */
import { newDependencyCheck, runScan } from '../../../workflow/shared/scripts/scan-diff-core.mjs';

/** Reglas: id, categoría OWASP, severidad sugerida, regex sobre la línea añadida. */
const RULES = [
  { id: 'xss-bypass', owasp: 'A05:2025 Injection', sev: 'alta', re: /bypassSecurityTrust(Html|Script|Style|Url|ResourceUrl)/, hint: 'Desactiva el sanitizador. Revisión manual obligatoria (SR-001).' },
  { id: 'xss-innerhtml', owasp: 'A05:2025 Injection', sev: 'media', re: /\[(innerHTML|outerHTML)\]|\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write\(/, hint: 'Sink de HTML: rastrear el origen del valor (SR-001).' },
  { id: 'xss-dynamic-url', owasp: 'A05:2025 Injection', sev: 'media', re: /\[(attr\.)?(href|src)\]\s*=|href\s*=\s*["']javascript:/i, hint: 'URL dinámica: validar el esquema (SR-002).' },
  { id: 'code-eval', owasp: 'A05:2025 Injection', sev: 'alta', re: /\beval\(|new Function\(|setTimeout\(\s*['"`]/, hint: 'Ejecución de código desde un string.' },
  { id: 'dom-native', owasp: 'A05:2025 Injection', sev: 'baja', re: /nativeElement\.(innerHTML|outerHTML|setAttribute)/, hint: 'Manipulación directa del DOM: preferir bindings.' },
  { id: 'open-redirect', owasp: 'A01:2025 Broken Access Control', sev: 'media', re: /window\.location(\.href)?\s*=|location\.(assign|replace)\(|navigateByUrl\([^)]*(returnUrl|redirect|next)/i, hint: 'Redirección: validar que sea una ruta interna (SR-005).' },
  { id: 'client-authz', owasp: 'A01:2025 Broken Access Control', sev: 'informativa', re: /\b(isAdmin|role|permissions?)\b\s*[:=]/, hint: 'Autorización en el cliente: confirmar validación en el backend (SR-003).' },
  { id: 'storage-token', owasp: 'A04:2025 Cryptographic Failures', sev: 'alta', re: /(local|session)Storage\.setItem\(\s*['"`][^'"`]*(token|jwt|auth|session|password)/i, hint: 'Token o credencial en storage del navegador (SR-004).' },
  { id: 'storage-generic', owasp: 'A04:2025 Cryptographic Failures', sev: 'informativa', re: /(local|session)Storage\.setItem\(/, hint: 'Confirmar que no guarda datos sensibles.' },
  { id: 'hardcoded-secret', owasp: 'A04:2025 Cryptographic Failures', sev: 'critica', re: /(api[_-]?key|secret|passw(or)?d|bearer|private[_-]?key)\s*[:=]\s*['"`][^'"`\s]{8,}/i, hint: 'Posible secreto en el código o el bundle (SR-004).' },
  { id: 'insecure-http', owasp: 'A04:2025 Cryptographic Failures', sev: 'media', re: /['"`]http:\/\/(?!localhost|127\.0\.0\.1|\[::1\]|www\.w3\.org)/, hint: 'Transporte sin TLS hacia un host no local.' },
  { id: 'with-credentials', owasp: 'A02:2025 Security Misconfiguration', sev: 'media', re: /withCredentials\s*:\s*true/, hint: 'Credenciales cross-origin: confirmar origen y CORS (SR-006).' },
  { id: 'identity-header', owasp: 'A02:2025 Security Misconfiguration', sev: 'informativa', re: /setHeaders|['"`](Authorization|X-User-Id)['"`]/i, hint: 'Header de identidad: confirmar que solo va a API_BASE_URL (SR-006).' },
  { id: 'csp-change', owasp: 'A02:2025 Security Misconfiguration', sev: 'media', re: /Content-Security-Policy|unsafe-inline|unsafe-eval/i, hint: 'Cambio de CSP.' },
  { id: 'source-maps-prod', owasp: 'A02:2025 Security Misconfiguration', sev: 'baja', re: /"sourceMap"\s*:\s*true/, hint: 'Source maps: confirmar que no aplica a producción.' },
  { id: 'blank-target', owasp: 'A02:2025 Security Misconfiguration', sev: 'informativa', re: /target\s*=\s*["']_blank["'](?![^>]*noopener)/, hint: 'target=_blank sin rel=noopener.' },
  { id: 'external-script', owasp: 'A03:2025 Software Supply Chain Failures', sev: 'media', re: /<script[^>]+src\s*=\s*["']https?:\/\/(?![^>]*integrity=)/i, hint: 'Script externo sin SRI (SR-008).' },
  { id: 'npm-config', owasp: 'A03:2025 Software Supply Chain Failures', sev: 'media', re: /"(pre|post)install"\s*:|registry\s*=/, hint: 'Script de instalación o registro alternativo.' },
  { id: 'json-parse', owasp: 'A08:2025 Software or Data Integrity Failures', sev: 'baja', re: /JSON\.parse\(/, hint: 'Deserialización: validar forma y origen.' },
  { id: 'no-verify', owasp: 'A08:2025 Software or Data Integrity Failures', sev: 'media', re: /--no-verify|continue-on-error:\s*true/, hint: 'Se salta controles de integridad.' },
  { id: 'console-log', owasp: 'A09:2025 Security Logging and Alerting Failures', sev: 'baja', re: /console\.(log|debug|info|trace)\(/, hint: 'Log en el cliente: confirmar que no expone datos (SR-007).' },
  { id: 'error-leak', owasp: 'A09:2025 Security Logging and Alerting Failures', sev: 'baja', re: /\{\{[^}]*\b(stack|error\.error)\b[^}]*\}\}/, hint: 'Detalle técnico del error mostrado al usuario.' },
  { id: 'empty-catch', owasp: 'A10:2025 Mishandling of Exceptional Conditions', sev: 'media', re: /catch\s*(\([^)]*\))?\s*\{\s*\}|error\s*:\s*\(\s*\)\s*=>\s*\{\s*\}|\.catch\(\s*\(\s*\)\s*=>\s*(undefined|null|\{\s*\})\s*\)/, hint: 'Error silenciado (SR-009).' },
];

runScan({
  title: 'scan-diff (angular)',
  rules: RULES,
  scanned: /\.(ts|html|json|scss|css|js|mjs|yml|yaml)$|(^|\/)\.npmrc$/,
  // El frontend está en frontend/: no analiza backend ni las propias skills.
  ignored: /^backend\//,
  extraChecks: newDependencyCheck(
    'A03:2025 Software Supply Chain Failures',
    'Dependencia nueva o actualizada: justificar y ejecutar npm audit --omit=dev (SR-008).',
  ),
});
