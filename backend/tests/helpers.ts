import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

/** App con base en memoria y datos de demo, aislada por test. */
export function createTestApp() {
  const db = openDatabase(':memory:');
  seed(db);
  return { app: createApp({ db }), db };
}
