# Observabilidad

## Logging estructurado
- JSON por línea con `level`, `time`, `msg`, `requestId`, `method`, `path`, `status`, `durationMs`, `userId` (si hay).
- Usa el logger del repo; si no hay ninguno, `console.error`/`console.warn` con objetos es aceptable en un proyecto pequeño. Agregar una librería (pino, etc.) es una dependencia nueva: puerta humana.
- Inyecta el logger en `createApp(deps)` para poder verificarlo en tests.

## Id de correlación
Middleware que toma `X-Request-Id` (si es un formato válido y corto) o genera uno (`crypto.randomUUID()`), lo devuelve en la respuesta y lo incluye en cada log y en los 500 (para que soporte pueda buscarlo).

## Redacción (obligatoria)
Nunca se registran: contraseñas, tokens, `Authorization`, cookies, `X-User-Id` en claro si identifica a una persona, bodies completos, PII (emails, teléfonos, documentos), cadenas de conexión ni valores de `.env`.
```ts
const REDACT = new Set(['password', 'token', 'authorization', 'cookie', 'secret']);
const redact = (obj: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, REDACT.has(k.toLowerCase()) ? '[REDACTED]' : v]));
```

## Inyección en logs
Los valores del usuario van como campos estructurados, no concatenados en el mensaje. Si se escriben en texto, elimina los saltos de línea (`\r\n`) para impedir la falsificación de entradas.

## Eventos de seguridad a registrar
Logins fallidos y exitosos, 401/403 repetidos desde el mismo origen, cambios de rol, rate limit alcanzado, errores de validación masivos, 500. Con nivel adecuado y sin datos sensibles.

## Métricas mínimas (si aplica)
Latencia por ruta, tasa de 5xx, `SQLITE_BUSY` por minuto (señal de contención de escritura).
