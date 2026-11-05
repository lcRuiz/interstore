# Integración HTTP con supertest

## Requisito: `createApp(deps)` separado de `listen`
```ts
// src/app.ts
export function createApp(deps: AppDeps): Express { /* middlewares, rutas, error handler */ }
// src/server.ts
createApp({ db: openDatabase(config.DB_PATH) }).listen(config.PORT);
```
`supertest` recibe la app sin abrir puertos: no hay colisiones ni servidores colgados. Si el repo no tiene esta factoría, crearla es el primer refactor de testabilidad (legado).

## Helper de app de prueba
```ts
export function createTestApp(overrides: Partial<AppDeps> = {}) {
  const db = openDatabase(':memory:'); // aplica migraciones reales
  seedMinimal(db);                      // solo lo imprescindible; cada test agrega lo suyo
  return { app: createApp({ db, clock: fixedClock, ...overrides }), db };
}
```

## Patrones
```ts
const res = await request(app)
  .get('/api/products')
  .query({ page: 2, pageSize: 10, category: 'Libros' })
  .set('X-User-Id', '1'); // o Authorization: Bearer <token de prueba>

expect(res.status).toBe(200);
expect(res.headers['content-type']).toMatch(/application\/json/);
expect(res.body.meta).toEqual({ page: 2, pageSize: 10, total: 8, totalPages: 1 });
```
- **Body JSON**: `.send(obj)` agrega `Content-Type: application/json`.
- **JSON malformado**: `.set('Content-Type', 'application/json').send('{"a":')` → 400 con el formato de error del repo.
- **Payload grande**: `.send({ name: 'x'.repeat(200_000) })` → 413 (si hay límite) o 400.
- **Headers de seguridad** (si el repo usa helmet): `expect(res.headers['x-powered-by']).toBeUndefined()`.
- **201 + Location**: `expect(res.headers.location).toBe('/api/products/41')`.

## Paginación y orden
- Defaults (`page=1`, `pageSize` por defecto) y **límite máximo** (`pageSize=10000` → 400 o recorte documentado).
- Orden estable (desempate por `id`) y `sort` solo desde una **lista blanca** (`sort=name;DROP TABLE` → 400).
- Página fuera de rango → `data: []` con `meta` coherente.

## Mass assignment
```ts
const res = await request(app).post('/api/users').send({ name: 'Ana', role: 'admin', pointsBalance: 9999 });
const row = db.prepare('SELECT role, points_balance FROM users WHERE name = ?').get('Ana');
expect(row).toEqual({ role: 'customer', points_balance: 0 }); // o 400 si el esquema es strict
```

## Contrato (OpenAPI)
Si existe `openapi.yaml`, valida las respuestas contra el esquema. Opciones: un validador de esquemas sobre el componente de respuesta, o una librería de validación de OpenAPI ya presente en el repo. **No agregues una dependencia nueva sin pasar por la puerta humana**; si no hay validador, verifica a mano los campos clave y anótalo como recorte.

## Express 4 vs 5
- Express 5: un handler `async` que lanza llega al middleware de error. Prueba que un error inesperado devuelve 500 con el formato uniforme.
- Express 4: sin `asyncHandler`, el mismo caso deja la petición colgada → el test hace timeout (es un ❌ que revela un bug real del diseño, no del test).
