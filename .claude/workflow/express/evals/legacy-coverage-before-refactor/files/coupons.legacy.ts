import express from 'express';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/store.db');
db.exec('CREATE TABLE IF NOT EXISTS coupons (code TEXT PRIMARY KEY, percent INTEGER, expires_at TEXT)');

export const couponsApp = express();
couponsApp.use(express.json());

couponsApp.get('/api/coupons/:code', (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM coupons WHERE code = '" + req.params.code + "'").get();
    if (!row) return res.status(404).send('not found');
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
