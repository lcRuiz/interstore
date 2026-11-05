import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from './migrate.js';

export type Db = DatabaseSync;

const IN_MEMORY = ':memory:';

/** Espera máxima por el lock de escritura antes de fallar con SQLITE_BUSY (solo archivo). */
const BUSY_TIMEOUT_MS = 5000;

/**
 * Abre (o crea) la base SQLite y aplica las migraciones pendientes.
 *
 * Se usa `node:sqlite` (incluido en Node >= 22.13) en lugar de better-sqlite3
 * para evitar compilar binarios nativos, algo frágil en Windows. Su API es
 * síncrona, lo que simplifica las transacciones. La opción `timeout` exige
 * Node >= 22.16.
 *
 * - `foreign_keys = ON` en cada conexión (SQLite lo desactiva por defecto).
 * - En archivo: WAL (lecturas concurrentes con un escritor) y `busy_timeout`.
 */
export function openDatabase(path: string): Db {
  const inMemory = path === IN_MEMORY;
  if (!inMemory) mkdirSync(dirname(path), { recursive: true });

  // `enableForeignKeyConstraints` y `PRAGMA foreign_keys = ON` son redundantes a propósito: el
  // PRAGMA deja explícito el requisito sin depender del valor por defecto del driver.
  const db = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
    ...(inMemory ? {} : { timeout: BUSY_TIMEOUT_MS }),
  });
  try {
    db.exec('PRAGMA foreign_keys = ON;');
    if (!inMemory) db.exec('PRAGMA journal_mode = WAL;');
    migrate(db);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

/**
 * Ejecuta `fn` dentro de una transacción. Hace rollback si lanza.
 *
 * BEGIN IMMEDIATE toma el lock de escritura al inicio: evita que dos checkouts
 * concurrentes lean el mismo stock y ambos lo descuenten.
 * No soporta anidamiento (no hace falta para este alcance).
 */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
