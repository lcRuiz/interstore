/** Borra la base local y la recrea con datos de demo: `npm run db:reset`. */
import { rmSync } from 'node:fs';
import { config } from '../config.js';
import { openDatabase } from './connection.js';
import { seed } from './seed.js';

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(`${config.DB_PATH}${suffix}`, { force: true });
}

const db = openDatabase(config.DB_PATH);
seed(db);
db.close();
console.log(`Base de datos recreada en ${config.DB_PATH}`);
