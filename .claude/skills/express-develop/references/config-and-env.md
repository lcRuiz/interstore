# Configuración y variables de entorno

## Validar al arrancar (falla rápido)
```ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('data/store.db'),
  CORS_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(32).optional(), // obligatorio si hay JWT
  TRUST_PROXY: z.string().default('false'),
});
export const config = envSchema.parse(process.env);
```
- Si falta o es inválida una variable, el proceso no arranca y el error dice cuál (sin imprimir su valor).
- Carga de `.env`: `process.loadEnvFile()` (Node ≥ 21.7) o la librería que use el repo. En tests, no dependas de `.env`: pasa la config o las dependencias a `createApp`.

## Reglas
- **`.env.example`** versionado con todas las claves y valores de ejemplo seguros; `.env` en `.gitignore`.
- Nunca leas, imprimas ni commitees `.env`. Para conocer las claves, lee `.env.example` y el esquema.
- Secretos: largos y aleatorios (JWT ≥ 256 bits); nunca un valor por defecto para un secreto en producción.
- Defaults seguros: `trust proxy` desactivado, CORS restringido, logs sin bodies.
- `NODE_ENV=production`: sin mensajes de error detallados ni endpoints de depuración.
- Config inmutable y centralizada; los módulos la reciben (o la importan desde `config.ts`), no leen `process.env` sueltos.

## Cambios de configuración en una feature
Variable nueva → actualizar el esquema, `.env.example`, el README del backend y la doc de la feature, en el mismo commit.
