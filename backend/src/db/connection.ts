import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { schema } from './schema.js';

export type Db = DatabaseSync;

const IN_MEMORY = ':memory:';

/**
 * Abre (o crea) la base SQLite y aplica el esquema.
 *
 * Se usa `node:sqlite` (incluido en Node >= 22.13) en lugar de better-sqlite3
 * para evitar compilar binarios nativos, algo frágil en Windows. Su API es
 * síncrona, lo que simplifica las transacciones.
 */
export function openDatabase(path: string): Db {
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  if (path !== IN_MEMORY) db.exec('PRAGMA journal_mode = WAL;');
  db.exec(schema);
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
