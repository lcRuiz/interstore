import { z } from 'zod';

// Carga .env si existe (API nativa de Node, sin dotenv).
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usan los valores por defecto.
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z.string().min(1).default('data/store.db'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:4200'),
});

/** Configuración validada al arrancar: si algo es inválido, falla rápido. */
export const config = envSchema.parse(process.env);
