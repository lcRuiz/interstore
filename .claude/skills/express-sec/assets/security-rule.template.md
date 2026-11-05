# Plantilla de regla de codificación segura (backend)

Antes de agregarla, busca en `express-develop/references/security-rules.md` una regla sobre el mismo sink o tema. Si existe, **refínala** (texto más preciso, ejemplo nuevo, origen adicional). No dupliques.

```markdown
### SRB-NNN · A0X:2025 <Categoría> · <tema corto>
**Regla:** haz <acción concreta>; evita <práctica insegura>, porque <consecuencia concreta>.
```ts
// Incorrecto
<mínimo, sin secretos ni datos reales>
// Correcto
<mínimo>
```
**Origen:** <feature>, AAAA-MM-DD (SEC-<feature>-NN). Refinada: <feature>, AAAA-MM-DD.
```

Una buena regla es:
- **Accionable**: dice qué escribir en lugar de qué.
- **Específica del stack**: nombra la API (`db.prepare`, `express.json`, `z.enum`, `res.cookie`).
- **Con porqué**: la consecuencia, no solo la prohibición.
- **Mínima**: ejemplos de 1–3 líneas.
- **Verificable**: si la detecta un patrón de `scan-diff.mjs` o un test, menciónalo.

Actualiza el índice al inicio de `security-rules.md`.
