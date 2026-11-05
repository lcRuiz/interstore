# Hallazgos: severidad, formato y falsos positivos

## Rúbrica de severidad (frontend)
La severidad combina **explotabilidad** (quién puede activarlo y cuán fácil es) e **impacto** (qué obtiene el atacante) en esta aplicación concreta.

| Severidad | Criterio | Ejemplos |
|---|---|---|
| **Crítica** | Explotable remotamente sin interacción especial y con compromiso de sesión, datos de otros usuarios o ejecución de código | Secreto de producción en el bundle; `bypassSecurityTrustHtml` sobre contenido que cualquier usuario puede publicar |
| **Alta** | Explotable con interacción mínima (un enlace) o datos de terceros, con impacto alto | XSS reflejado vía query param; open redirect en el login; token de sesión en `localStorage` junto a un sink de XSS |
| **Media** | Requiere condiciones adicionales o tiene impacto limitado | `[href]` dinámico sin validar con datos de la propia API; header de identidad enviado a un tercero; error sin manejar que deja datos inconsistentes |
| **Baja** | Defensa en profundidad o fuga menor | `console.log` con datos no sensibles; `target="_blank"` sin `rel` |
| **Informativa** | Buenas prácticas, preexistente fuera de alcance o riesgo del backend | Dependencia nueva sin vulnerabilidades conocidas; autorización que depende del servidor |

Ajusta según el contexto y **escribe el porqué** de la severidad elegida: un `innerHTML` con una constante del código es informativo; con texto de la API que escriben los usuarios, es alto o crítico.

## Formato de hallazgo
```markdown
### SEC-<feature>-NN · <título corto>
- **Categoría:** A05:2025 Injection
- **Severidad:** Alta. Porque: <explotabilidad + impacto en esta app>
- **Ubicación:** `frontend/src/app/features/x/ui/y/y.ts:42`
- **Evidencia:**
  ```ts
  this.html = this.sanitizer.bypassSecurityTrustHtml(product.description);
  ```
- **Impacto:** <qué puede hacer un atacante y a quién>
- **Remediación:** <cambio concreto y regla SR-NNN aplicable>
- **Falso positivo probable:** No / Sí (motivo)
- **Estado:** abierto · en remediación (iteración n/3) · resuelto (test `…` + commit `…`) · riesgo aceptado (por <usuario>, fecha) · falso positivo
```

## Falsos positivos frecuentes
| Patrón | Cuándo es falso positivo | Cómo confirmarlo |
|---|---|---|
| `innerHTML` | El valor es una constante del código o un SVG propio sin datos externos | Rastrear el origen del valor hasta su asignación |
| `localStorage.setItem` | Guarda preferencias no sensibles (tema, filtro) | Leer la clave y el valor |
| `token` en una constante | Es un `InjectionToken` de Angular o el nombre de un token CSS | Leer la declaración |
| `http://` | `localhost`, ejemplos en comentarios, namespaces XML/SVG (`http://www.w3.org/2000/svg`) | Contexto de la línea |
| `console.error` | Loguea solo `code`/`status` (permitido por la regla SR-007) | Leer los argumentos |
| `navigateByUrl(x)` | `x` es una constante o una ruta construida con segmentos internos | Rastrear `x` |
| `JSON.parse` | Parseo de datos propios ya validados por tipo | Ver la validación posterior |

## Riesgo residual
Al cerrar, resume lo que queda abierto (aceptado o fuera de alcance) y lo que depende del backend, con una recomendación por ítem. Un "riesgo residual: ninguno" solo es válido si no hay medios/bajos abiertos ni riesgos del backend detectados.
