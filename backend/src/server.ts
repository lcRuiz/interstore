import { createApp } from './app.js';
import { config } from './config.js';
import { openDatabase } from './db/connection.js';
import { seed } from './db/seed.js';

const db = openDatabase(config.DB_PATH);
seed(db);

const app = createApp({ db, corsOrigin: config.CORS_ORIGIN });
const server = app.listen(config.PORT, () => {
  console.log(`API escuchando en http://localhost:${config.PORT}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
