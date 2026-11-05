# Reglas de codificación segura (backend Express + SQLite)

Archivo vivo. **`express-sec` lo escribe; `express-develop` lo lee antes de implementar.** Se refina en lugar de duplicarse.

Formato: ID · categoría OWASP (edición usada) · regla "haz X, evita Y porque Z" · ejemplo incorrecto/correcto mínimo · origen. Sin secretos ni datos reales.

| ID | Categoría | Tema |
|---|---|---|
| SRB-001 | A05:2025 Injection | SQL parametrizado |
| SRB-002 | A05:2025 Injection | Orden, columnas y `LIKE` dinámicos |
| SRB-003 | A01:2025 Broken Access Control | Propiedad de recursos (IDOR/BOLA) |
| SRB-004 | A01:2025 Broken Access Control | Mass assignment |
| SRB-005 | A02:2025 Security Misconfiguration | Errores sin fugas y headers |
| SRB-006 | A04:2025 Cryptographic Failures | Secretos y configuración |
| SRB-007 | A06:2025 Insecure Design | Límites de tamaño, paginación y abuso |
| SRB-008 | A09:2025 Security Logging and Alerting Failures | Logs sin datos sensibles |
| SRB-009 | A05:2025 Injection | Prototype pollution, comandos y rutas de archivo |
| SRB-010 | A03:2025 Software Supply Chain Failures | Dependencias nuevas |
| SRB-011 | A10:2025 Mishandling of Exceptional Conditions | Transacciones y fallos parciales |
| SRB-012 | A07:2025 Authentication Failures | Identidad desde la sesión, no del cliente |

---

### SRB-001 · A05:2025 Injection · SQL parametrizado
**Regla:** pasa todos los valores como parámetros (`?`, `:name`); evita interpolar o concatenar cualquier dato en el SQL (incluidos ids "numéricos" y valores ya validados), porque una sola excepción basta para una inyección.
```ts
// Incorrecto
db.prepare(`SELECT id, name FROM products WHERE category = '${category}'`).all();
// Correcto
db.prepare('SELECT id, name FROM products WHERE category = ?').all(category);
```
**Origen:** línea base, 2026-11-05.

### SRB-002 · A05:2025 Injection · Orden, columnas y LIKE
**Regla:** toma nombres de columna y dirección de orden solo de un mapa en lista blanca validado con `z.enum`, y escapa `%`, `_` y `\` en `LIKE` con `ESCAPE`; evita pasar `sort`/`order` del query al SQL, porque los identificadores no se pueden parametrizar.
```ts
const SORT = { name: 'name', price: 'price' } as const;
db.prepare(`SELECT … ORDER BY ${SORT[query.sort]}, id LIMIT ?`).all(limit);
```
Filtros opcionales: arma el `WHERE` uniendo solo fragmentos **constantes** con `?` (`'c.slug = ?'`, `"p.search_name LIKE ? ESCAPE '\'"`) y empuja los valores a un arreglo de parámetros; el texto del usuario nunca forma parte de la cadena SQL. Para búsquedas sin tildes ni mayúsculas, guarda una columna normalizada (`search_name`) con una única función compartida y normaliza `q` con ella (`LOWER()` de SQLite solo cubre ASCII). Ordena `name` por esa columna y desempata siempre por `id`.
```ts
const where: string[] = [];
const params: Array<string | number> = [];
if (category) { where.push('c.slug = ?'); params.push(category); }
if (needle) { where.push("p.search_name LIKE ? ESCAPE '\'"); params.push(`%${escapeLike(needle)}%`); }
db.prepare(`SELECT … ${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${ORDER_BY[sort]} LIMIT ? OFFSET ?`);
```
**Origen:** línea base, 2026-11-05; refinada en products-api, 2026-11-05 (`backend/src/modules/products/products.repository.ts`).

### SRB-003 · A01:2025 Broken Access Control · IDOR/BOLA
**Regla:** filtra cada acceso a un recurso de usuario por el dueño obtenido de la sesión (`WHERE id = ? AND user_id = ?`) y responde 404 si no coincide; evita buscar por id y comparar después, o aceptar `userId` del body, query o ruta, porque cualquier usuario podría leer o modificar recursos ajenos.
```ts
// Incorrecto
repo.findOrder(req.params.id);
// Correcto
repo.findOrderForUser(req.params.id, currentUser.id);
```
**Origen:** línea base, 2026-11-05.

### SRB-004 · A01:2025 Broken Access Control · Mass assignment
**Regla:** construye los `INSERT`/`UPDATE` a partir de un DTO con campos permitidos explícitos (esquema `strict()` o `pick`); evita volcar `req.body` en la consulta o en `Object.assign`, porque el cliente podría fijar `role`, `points_balance`, `id` o `user_id`.
```ts
const input = createProductSchema.parse(req.body); // { name, price, category, stock }
repo.insert(input);
```
**Origen:** línea base, 2026-11-05.

### SRB-005 · A02:2025 Security Misconfiguration · Errores y headers
**Regla:** responde los errores inesperados con un 500 genérico desde el error handler central y registra el detalle solo en el log; desactiva `x-powered-by`, configura `trust proxy` y CORS con valores explícitos; evita enviar `err.message`, stack o texto de SQLite al cliente, porque revelan el esquema y la tecnología.
**Origen:** línea base, 2026-11-05 (`backend/src/errors/error-handler.ts`).

### SRB-006 · A04:2025 Cryptographic Failures · Secretos y configuración
**Regla:** lee secretos solo de variables de entorno validadas al arrancar, sin valores por defecto en producción, y mantén `.env.example` con valores ficticios; evita secretos en el código, en tests o en el seed, y guarda contraseñas solo con argon2id/bcrypt/scrypt, porque el repo y los logs no son lugares seguros.
**Origen:** línea base, 2026-11-05.

### SRB-007 · A06:2025 Insecure Design · Límites
**Regla:** fija un límite de tamaño de body (`express.json({ limit })`), un `pageSize` máximo, longitudes máximas en los esquemas y rate limiting en endpoints sensibles; evita listados sin límite o acciones repetibles sin control (otorgar puntos, checkout), porque permiten DoS y abuso de reglas de negocio. Usa claves de idempotencia o `UNIQUE` en operaciones que no deben duplicarse.
Acota también `page` (tope explícito): `OFFSET = (page - 1) * pageSize` con `page` ~1e20 supera el rango entero de SQLite y acaba en 500. Valida ids de ruta con una regex decimal (`/^[1-9]\d{0,9}$/`) en lugar de `z.coerce.number()`, que acepta `1e3`, `0x10` y espacios.
```ts
page: z.coerce.number().int().min(1).max(1_000_000).default(1),
id: z.string().regex(/^[1-9]\d{0,9}$/).transform(Number),
```
**Origen:** línea base, 2026-11-05 (`points_ledger UNIQUE(user_id, action, ref_id)`); refinada en products-api, 2026-11-05 (`products.schemas.ts`).

### SRB-008 · A09:2025 Security Logging and Alerting Failures · Logs
**Regla:** registra eventos con campos estructurados, id de correlación y redacción de `password`, `token`, `authorization`, cookies y PII; evita registrar bodies o headers completos y concatenar entradas del usuario en el mensaje, porque filtran datos y permiten falsificar entradas.
**Origen:** línea base, 2026-11-05.

### SRB-009 · A05:2025 Injection · Prototype pollution, comandos y archivos
**Regla:** copia solo las claves permitidas de objetos de entrada (rechaza `__proto__`, `constructor`, `prototype`), usa `execFile` con argumentos en array y sin shell, y resuelve rutas de archivo con `path.resolve` verificando que queden dentro del directorio permitido; evita `merge` profundo con `req.body`, `exec` con strings y `path.join(base, userInput)` sin verificar.
**Origen:** línea base, 2026-11-05.

### SRB-010 · A03:2025 Software Supply Chain Failures · Dependencias
**Regla:** justifica cada dependencia nueva (¿la resuelve Node o Express?), revisa su mantenimiento y nombre (typosquatting), ejecuta `npm audit --omit=dev` y commitea el lockfile; evita scripts `postinstall` desconocidos y dependencias desde URLs o git.
**Origen:** línea base, 2026-11-05.

### SRB-011 · A10:2025 Mishandling of Exceptional Conditions · Fallos parciales
**Regla:** agrupa en una transacción (`BEGIN IMMEDIATE`) toda operación multi-sentencia y lee los datos de control (stock, saldo) dentro de ella; evita `catch` vacíos y continuar tras un error parcial, porque dejan la base inconsistente o permiten vender sin stock.
Migraciones: aplica cada una en su propia transacción **junto con** `PRAGMA user_version = N` (SQLite lo revierte con la transacción), valida que las versiones sean consecutivas, rechaza una base con `user_version` mayor que la última migración conocida y nunca edites una migración ya aplicada; cierra la conexión si `openDatabase` falla a mitad.
**Origen:** línea base, 2026-11-05 (`backend/src/db/connection.ts` → `transaction`); refinada en products-api, 2026-11-05 (`backend/src/db/migrate.ts`).

### SRB-012 · A07:2025 Authentication Failures · Identidad
**Regla:** obtén la identidad solo del middleware de autenticación (sesión o token verificado) y nunca de campos del body; mantén mensajes y tiempos iguales para "usuario inexistente" y "credencial inválida".
Nota del repo: `X-User-Id` es una **simulación sin seguridad** (supuesto de la prueba técnica): cualquier cliente puede suplantar a otro usuario. Es un riesgo aceptado y documentado; no lo presentes como autenticación ni lo uses como base para funciones sensibles sin sustituirlo.
**Origen:** línea base, 2026-11-05 (`backend/src/middleware/current-user.ts`).
