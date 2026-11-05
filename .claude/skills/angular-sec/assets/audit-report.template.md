# Auditoría de seguridad: <feature>

| Campo | Valor |
|---|---|
| Fecha | AAAA-MM-DD |
| Edición OWASP | OWASP Top 10:2025 (verificada en top10.owasp.org el AAAA-MM-DD) |
| Rama / base | `<rama>` vs `<base>` (merge-base `<sha>`) |
| Commits en alcance | `<sha>..<sha>` (+ cambios sin commitear: sí/no) |
| Iteraciones de remediación | n/3 |
| **Veredicto** | **APROBADO / APROBADO CON RIESGO ACEPTADO / BLOQUEADO** |

## Alcance
Archivos auditados (diff + nuevos):
```
<lista>
```
Fuera de alcance (consultados solo para entender flujos): …

## Metodología
1. Barrido automático: `node .claude/skills/angular-sec/scripts/scan-diff.mjs --base <base>` → N coincidencias.
2. Revisión manual con el checklist por categoría (A01–A10).
3. Verificaciones por comando: `npm audit --omit=dev` (si cambiaron dependencias), etc.

## Resumen
| Severidad | Abiertos | Resueltos | Aceptados | Falsos positivos |
|---|---|---|---|---|
| Crítica | 0 | 0 | — | 0 |
| Alta | 0 | 0 | — | 0 |
| Media | 0 | 0 | 0 | 0 |
| Baja | 0 | 0 | 0 | 0 |
| Informativa | 0 | — | — | 0 |

## Cobertura por categoría
| Categoría | Aplica | Resultado |
|---|---|---|
| A01:2025 Broken Access Control | sí/no | sin hallazgos / SEC-… |
| A02:2025 Security Misconfiguration | | |
| A03:2025 Software Supply Chain Failures | | |
| A04:2025 Cryptographic Failures | | |
| A05:2025 Injection | | |
| A06:2025 Insecure Design | | |
| A07:2025 Authentication Failures | | |
| A08:2025 Software or Data Integrity Failures | | |
| A09:2025 Security Logging and Alerting Failures | | |
| A10:2025 Mishandling of Exceptional Conditions | | |

## Hallazgos
<!-- Formato: references/findings-and-severity.md -->

## Remediaciones
| Hallazgo | Test de regresión | Fix (commit/archivo) | Re-auditoría del delta |
|---|---|---|---|

## Riesgos del backend (fuera del alcance del frontend)
- …

## Riesgo residual
- …

## Reglas registradas en security-rules.md
| Regla | Acción (nueva / refinada) | Motivo |
|---|---|---|
