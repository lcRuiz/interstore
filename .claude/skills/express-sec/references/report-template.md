# Plantilla: informe de auditoría (backend)

Ruta de salida: `docs/security/<feature>-audit.md`.

```markdown
# Auditoría de seguridad: <feature> (API)

| Campo | Valor |
|---|---|
| Fecha | AAAA-MM-DD |
| Edición OWASP | OWASP Top 10:2025 (verificada en top10.owasp.org el AAAA-MM-DD) |
| Rama / base | `<rama>` vs `<base>` (merge-base `<sha>`) |
| Commits en alcance | `<sha>..<sha>` (+ cambios sin commitear: sí/no) |
| Migraciones en alcance | 000N_<nombre> |
| Dependencias nuevas/modificadas | … (npm audit: N vulnerabilidades) |
| Iteraciones de remediación | n/3 |
| **Veredicto** | **APROBADO / APROBADO CON RIESGO ACEPTADO / BLOQUEADO** |

## Alcance
Archivos auditados:
```
<lista>
```
Consultados fuera de alcance (para entender flujos): …

## Metodología
1. `node .claude/skills/express-sec/scripts/scan-diff.mjs --base <base>` → N coincidencias (M falsos positivos).
2. Revisión manual: express-checklist, sqlite-security, auth-jwt-sessions.
3. `npm audit --omit=dev` (si cambiaron dependencias): salida resumida.

## Resumen
| Severidad | Abiertos | Resueltos | Aceptados | Falsos positivos |
|---|---|---|---|---|
| Crítica | | | — | |
| Alta | | | — | |
| Media | | | | |
| Baja | | | | |
| Informativa | | — | — | |

## Cobertura por categoría
| Categoría | Aplica | Resultado |
|---|---|---|
| A01:2025 Broken Access Control | | |
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
(formato de abajo)

## Remediaciones
| Hallazgo | Test de regresión | Fix | Re-auditoría del delta |
|---|---|---|---|

## Riesgos del despliegue (fuera del código)
- Permisos del archivo `.db`, TLS, proxy y `trust proxy`, backups…

## Riesgo residual
- …

## Reglas registradas en security-rules.md
| Regla | Nueva / refinada | Motivo |
|---|---|---|
```

## Hallazgo
```markdown
### SEC-<feature>-NN · <título corto>
- **Categoría:** A05:2025 Injection
- **Severidad:** Alta. Porque: <explotabilidad + impacto en esta API>
- **Ubicación:** `backend/src/modules/products/products.repository.ts:42`
- **Evidencia:**
  ```ts
  db.prepare(`SELECT … ORDER BY ${query.sort}`)
  ```
- **Impacto:** <qué obtiene un atacante y de quién>
- **Remediación:** <cambio concreto> (regla SRB-002)
- **Falso positivo probable:** No / Sí (motivo)
- **Estado:** abierto · en remediación (n/3) · resuelto (test `…`, commit `…`) · riesgo aceptado (por <usuario>, fecha) · falso positivo
```

## Falsos positivos frecuentes
| Patrón | Falso positivo cuando… |
|---|---|
| `${…}` en SQL | Es un identificador de una lista blanca constante o placeholders generados (`ids.map(() => '?')`) |
| `req.params.id` | La consulta filtra por dueño en el servicio o el repositorio |
| `db.exec(\`…\`)` | SQL constante de una migración propia |
| `console.error` | Registra solo `code`/`status`/`requestId` |
| `PRAGMA … = ${n}` | `n` es una constante numérica del código |
