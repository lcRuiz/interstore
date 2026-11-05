# Plantilla de regla de codificación segura

Antes de agregar una regla, busca en `security-rules.md` una existente sobre el mismo tema (mismo sink, API o categoría). Si existe, **refínala**: precisa el texto, agrega un ejemplo y suma el origen. No dupliques.

```markdown
### SR-NNN · A0X:2025 <Categoría> · <tema corto>
**Regla:** haz <acción concreta>; evita <práctica insegura>, porque <consecuencia concreta>.
```ts
// Incorrecto
<mínimo, sin secretos ni datos reales>
// Correcto
<mínimo>
```
**Origen:** <feature>, AAAA-MM-DD (SEC-<feature>-NN). Refinada: <feature>, AAAA-MM-DD.
```

Criterios de una buena regla:
- **Accionable**: un desarrollador sabe qué escribir en lugar de qué.
- **Específica para Angular**: nombra la API (`DomSanitizer`, `HttpInterceptorFn`, `routerLink`).
- **Con porqué**: la consecuencia, no solo la prohibición.
- **Mínima**: ejemplos de 1–3 líneas.
- **Verificable**: idealmente, detectable por una regla de lint o un patrón de `scan-diff.mjs` (si lo es, menciónalo).

Al agregar o refinar, actualiza el índice al inicio de `security-rules.md`.
