# Bucle de remediación

```
hallazgo accionable
  → angular-test: test de regresión en ROJO (ID SEC-<feature>-NN)
  → angular-develop: fix mínimo en la causa raíz
  → suite completa en VERDE
  → angular-sec: re-auditoría SOLO del delta del fix
  → ¿limpio? sí: hallazgo resuelto · no: iteración +1 (máx. 3) → BLOQUEADO y escalar
```

## Cómo testear cada tipo de hallazgo
| Tipo | Test de regresión (unitario) |
|---|---|
| XSS por `innerHTML`/bypass | Renderizar el componente con `'<img src=x onerror="window.__xss=1">'` y afirmar que no existe `img[onerror]` en el DOM, que `window.__xss` es `undefined` y que el texto aparece escapado |
| URL dinámica | Input con `javascript:alert(1)` → afirmar que el `href` renderizado no empieza con `javascript:` (o que el enlace no se renderiza) |
| Open redirect | Llamar al guard o handler con `returnUrl` `https://evil.example`, `//evil.example` y `/\evil.example` → afirmar navegación a `/` |
| Header a terceros | `http.get('https://third.example/x')` → afirmar que no lleva `X-User-Id`/`Authorization` |
| Token en storage | Espiar `Storage.prototype.setItem` y afirmar que no se llama con claves de token tras el login |
| Datos sensibles en logs | `vi.spyOn(console, 'error')` y afirmar que los argumentos no contienen headers ni body |
| Error no manejado | Simular un error HTTP y afirmar estado `error`/rollback (no `loading` indefinido) |
| Regla de negocio en el cliente (A06) | Afirmar que el body de la petición no incluye `points`/`total` calculados |

## Hallazgos no testeables unitariamente
Configuración del build, CSP, dependencias o CI:
- La "prueba" es un **comando verificable**: `npm audit --omit=dev`, `npm run build -- --configuration production` y comprobar que no hay `*.map` en `dist/`, `grep` de la CSP en `index.html`.
- Documenta el comando y su salida real en el informe como evidencia de cierre.

## Re-auditoría del delta
```bash
git diff <commit-antes-del-fix>..HEAD          # si el fix ya está commiteado
git diff -- <archivos del fix>                 # si no
node .claude/skills/angular-sec/scripts/scan-diff.mjs --base <commit-antes-del-fix>
```
Revisa también que el fix no haya desactivado una protección (p. ej. quitar el sanitizador para "simplificar").

## Riesgo aceptado
Solo para medios o bajos, con una justificación concreta (p. ej. "dato que solo escribe el equipo interno, mitigado por la CSP"). Requiere confirmación explícita del usuario: registra quién y cuándo en `state.md` y en el informe.
