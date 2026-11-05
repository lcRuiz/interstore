# Diseño de pruebas (backend)

## Por qué test-first en una API
El test escrito antes fija el **contrato observable** (status, cuerpo, efectos en la base) antes de que la implementación lo sesgue. El reporte RED prueba que el test distingue lo correcto de lo incorrecto.

## Anatomía
```ts
it('debe devolver 409 PRODUCT_NAME_TAKEN cuando el nombre ya existe en la categoría', async () => {
  // Arrange
  const { app, db } = createTestApp();
  insertProduct(db, makeProduct({ name: 'Taza', category: 'Hogar' }));
  // Act
  const res = await request(app).post('/api/products').set(auth(admin)).send(makeProductInput({ name: 'Taza', category: 'Hogar' }));
  // Assert
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ error: { code: 'PRODUCT_NAME_TAKEN', message: expect.any(String) } });
});
```
- **Nombre**: `debe … cuando …`. Si no se puede nombrar así, prueba demasiado o nada.
- **Un motivo de fallo**: varias aserciones sobre un mismo comportamiento (status + código de error) están bien.
- **Aislamiento**: cada test crea su app y su BD `:memory:`. Es barato (milisegundos) y evita el orden dependiente.
- **Determinismo**: reloj controlado (`vi.useFakeTimers()` / `vi.setSystemTime()`), IDs y aleatorios inyectados, sin red real.

## Qué afirmar
| Afirmar | No afirmar |
|---|---|
| Status, cuerpo (forma y valores clave), headers relevantes (`Location`, `Content-Type`) | Llamadas internas entre capas |
| Estado de la base después de la operación (filas, totales) | SQL exacto generado |
| Formato de error y `code` estable | Texto exacto de mensajes para humanos (salvo que sea contrato) |
| Que **no** cambió nada en un error (rollback) | Orden de ejecución de middlewares |

## Dobles de prueba
- **Base de datos**: real en memoria. Mockearla oculta errores de SQL, constraints y migraciones.
- **Fronteras externas** (HTTP saliente, email, reloj, IDs): inyéctalas en `createApp(deps)` o en el servicio y pasa un doble.
- **Spies**: solo para efectos externos (email enviado, evento emitido), nunca sobre el sujeto bajo prueba.

## Factories de datos sintéticos
```ts
let seq = 0;
export const makeUser = (o: Partial<UserRow> = {}): UserRow => ({ id: ++seq, name: `User ${seq}`, role: 'customer', ...o });
```
- Datos mínimos válidos por defecto; cada test sobrescribe solo lo que le importa.
- Nada de datos reales, emails reales ni contraseñas reales (usa `user1@example.test`).

## Legado (sin pruebas)
1. **Caracterización**: tests HTTP que fijan el comportamiento actual de los endpoints a tocar (status, forma del cuerpo). Deben pasar. Si algo parece incorrecto, anótalo: corregirlo es un cambio de requerimiento.
2. **Refactor de testabilidad** mínimo (extraer `createApp(deps)` de `app.listen`, inyectar la conexión) con la caracterización en verde.
3. **Tests del cambio** en rojo → flujo normal.
4. El reporte RED separa caracterización (verde, excepción) y tests nuevos (rojo).

## Prioridad con poco tiempo
1. Reglas de negocio y autorización (IDOR).
2. Contrato HTTP y errores.
3. Integridad de datos (constraints, transacciones).
4. Validación y límites.
5. Casos cosméticos.
