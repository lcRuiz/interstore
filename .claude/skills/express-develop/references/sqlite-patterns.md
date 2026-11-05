# Patrones de SQLite

Antes de usar una API del driver, confirma en su documentación oficial para la versión instalada:
- `node:sqlite`: `https://nodejs.org/api/sqlite.html` (estabilidad y nombres cambian entre versiones de Node; en versiones recientes `DatabaseSync` es alias de `Database`).
- `better-sqlite3`: `https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md`.
- Versión del motor: `SELECT sqlite_version()`.

## Tabla de contenidos
1. Conexión y PRAGMAs · 2. Consultas · 3. Transacciones · 4. Migraciones · 5. Índices y rendimiento · 6. Concurrencia

## 1. Conexión y PRAGMAs
```ts
const db = new DatabaseSync(path);
db.exec('PRAGMA foreign_keys = ON;');      // por conexión: SQLite lo trae desactivado por defecto
db.exec('PRAGMA journal_mode = WAL;');     // archivo (no :memory:): lectores no bloquean al escritor
db.exec('PRAGMA busy_timeout = 5000;');    // espera ante bloqueo en lugar de fallar al instante con SQLITE_BUSY
```
- `foreign_keys` va en **cada** conexión (no se persiste en el archivo).
- `journal_mode = WAL` se persiste; deja archivos `-wal`/`-shm` junto al `.db`.
- `synchronous = NORMAL` con WAL es un equilibrio habitual; decláralo si lo cambias.
- Algunos drivers lo exponen como opciones (`enableForeignKeyConstraints`, `timeout`): úsalas si la versión las soporta y documenta cuál.
- El archivo `.db` va fuera de cualquier directorio servido estáticamente, con permisos restringidos.

## 2. Consultas
**Siempre parametrizadas**:
```ts
// Incorrecto
db.prepare(`SELECT * FROM products WHERE name LIKE '%${q}%'`).all();
// Correcto
db.prepare(`SELECT * FROM products WHERE name LIKE ? ESCAPE '\\'`).all(`%${escapeLike(q)}%`);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
```
- **Columnas y orden dinámicos**: no se pueden parametrizar, así que se eligen de una lista blanca:
```ts
const SORT_COLUMNS = { name: 'name', price: 'price', newest: 'id DESC' } as const;
const orderBy = SORT_COLUMNS[query.sort]; // query.sort validado con z.enum(Object.keys(SORT_COLUMNS))
db.prepare(`SELECT … ORDER BY ${orderBy}, id LIMIT ? OFFSET ?`).all(limit, offset);
```
- **Una sentencia por llamada** (`prepare`/`run`); `exec` con varias sentencias solo para migraciones propias, nunca con datos externos.
- Prepara las sentencias una vez (en la fábrica del repositorio) y reutilízalas.
- Selecciona columnas explícitas, no `SELECT *`, y mapea a DTOs.
- Evita N+1: un `JOIN` o un `WHERE id IN (…)` con placeholders generados (`ids.map(() => '?').join(',')`).
- Paginación: `LIMIT ? OFFSET ?` con límite máximo; total con `COUNT(*)` usando el mismo `WHERE`. Para colecciones grandes, cursor (`WHERE id > ?`).

## 3. Transacciones
```ts
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE'); // toma el lock de escritura al inicio: evita lecturas obsoletas de stock
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
```
- Toda operación de varias sentencias que deba ser atómica (pedido + ítems + stock + puntos).
- SQLite no anida `BEGIN`; para anidar usa `SAVEPOINT`, o diseña los servicios para que una sola capa abra la transacción.
- Lee y escribe dentro de la misma transacción (chequear stock fuera y descontar dentro es una condición de carrera).

## 4. Migraciones
- **Versionadas y ordenadas**: `NNNN_<nombre>`, una lista en código (o archivos `.sql` copiados al build).
- Control de versión con `PRAGMA user_version` o una tabla `schema_migrations(version, applied_at)`.
- Cada migración en **una transacción**; si falla, no queda a medias.
- `up` obligatorio; `down` si el repo lo exige. Si es irreversible (pérdida de datos), decláralo en el PR con un plan de rollback (backup antes de aplicar).
- Cambios de columnas en SQLite: `ALTER TABLE` es limitado. Para cambios complejos: crear tabla nueva → copiar → borrar → renombrar, dentro de una transacción y con `foreign_keys` desactivado durante la operación (y verificado con `PRAGMA foreign_key_check` al final).
- Tablas **`STRICT`** (SQLite ≥ 3.37) para tipos estrictos: `CREATE TABLE … ( … ) STRICT;`. Verifica la versión del motor.
- Nunca edites una migración ya aplicada en otro entorno: crea una nueva.

```ts
const migrations: { version: number; name: string; up: string }[] = [
  { version: 1, name: 'init', up: `CREATE TABLE …;` },
  { version: 2, name: 'orders', up: `CREATE TABLE orders (…) STRICT; CREATE INDEX idx_orders_user ON orders(user_id);` },
];
export function migrate(db: Db) {
  const { user_version: current } = db.prepare('PRAGMA user_version').get() as { user_version: number };
  for (const m of migrations.filter((m) => m.version > current)) {
    transaction(db, () => { db.exec(m.up); db.exec(`PRAGMA user_version = ${m.version}`); });
  }
}
```
(`PRAGMA user_version` no acepta parámetros; `m.version` es una constante del código, no un dato externo.)

## 5. Índices y rendimiento
- Un índice por cada patrón de consulta real (`WHERE`, `JOIN`, `ORDER BY` frecuentes); justifícalo en la migración.
- Verifica con `EXPLAIN QUERY PLAN SELECT …` (buscar `SEARCH … USING INDEX`, no `SCAN`).
- `LIKE '%texto%'` no usa índices: para búsquedas grandes, FTS5 (decisión documentada).
- Índices compuestos en el orden de los filtros más selectivos.

## 6. Concurrencia
- SQLite admite **un escritor a la vez** por base. Con una conexión por proceso, las escrituras se serializan; con WAL, las lecturas no bloquean.
- Varios procesos o instancias sobre el mismo archivo: `SQLITE_BUSY` bajo carga (mitigado con `busy_timeout`, no eliminado). No hay escalado horizontal real.
- Señales para migrar de motor (PostgreSQL, etc.): varias instancias de la API, escrituras concurrentes sostenidas, necesidad de réplicas o de acceso en red. Documéntalo como limitación en la doc de la feature cuando aplique.
