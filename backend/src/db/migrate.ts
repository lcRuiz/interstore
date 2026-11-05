import { transaction, type Db } from './connection.js';
import { initial } from './migrations/0001_initial.js';

export interface Migration {
  /** Entero consecutivo desde 1; se guarda en `PRAGMA user_version`. */
  version: number;
  name: string;
  /** SQL de la migración (varias sentencias). Constante del código, nunca datos externos. */
  sql: string;
}

/** Migraciones en orden. Para agregar una: nuevo archivo `NNNN_nombre.ts` y una entrada aquí. */
export const migrations: readonly Migration[] = [initial];

function readUserVersion(db: Db): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

/**
 * Aplica las migraciones pendientes, en orden, cada una en su propia transacción.
 *
 * El control de versión es `PRAGMA user_version`, que SQLite guarda en la
 * cabecera del archivo y revierte junto con la transacción: si una migración
 * falla, ni sus sentencias ni el número de versión quedan aplicados.
 * Es idempotente: sobre una base al día no hace nada.
 *
 * @param db base abierta (con `foreign_keys` ya activado por `openDatabase`).
 * @param list lista de migraciones; por defecto las del repositorio (se inyecta en tests).
 * @throws si las versiones no son consecutivas desde 1, o si la base está en una
 *   versión posterior a la última conocida (la aplicación es más vieja que la base).
 */
export function migrate(db: Db, list: readonly Migration[] = migrations): void {
  if (!list.every((migration, index) => migration.version === index + 1)) {
    throw new Error('Las versiones de las migraciones deben ser consecutivas y empezar en 1');
  }

  const current = readUserVersion(db);
  const latest = list.length;
  if (current > latest) {
    throw new Error(`La base tiene user_version=${current}, mayor que la última migración conocida (${latest})`);
  }

  for (const migration of list) {
    if (migration.version <= current) continue;
    transaction(db, () => {
      db.exec(migration.sql);
      // Entero validado arriba (índice + 1): PRAGMA no admite parámetros enlazados.
      db.exec(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
