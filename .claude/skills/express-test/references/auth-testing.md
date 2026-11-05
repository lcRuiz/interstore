# Pruebas de autenticación y autorización

## Matriz mínima por endpoint protegido
| Caso | Esperado |
|---|---|
| Sin credenciales | 401 + código estable (`MISSING_USER`, `UNAUTHENTICATED`) |
| Credenciales mal formadas | 400 o 401 según el contrato |
| Credenciales inválidas, expiradas o revocadas | 401 |
| Autenticado sin el rol requerido | 403 |
| Autenticado, recurso **de otro usuario** (IDOR/BOLA) | 403 o 404 (decláralo en la matriz; 404 evita revelar existencia) |
| Autenticado con el rol o la propiedad correctos | 2xx |

## IDOR / BOLA (el más frecuente en APIs)
```ts
it('debe responder 404 cuando un usuario pide un pedido de otro usuario', async () => {
  const order = insertOrder(db, makeOrder({ userId: 2 }));
  const res = await request(app).get(`/api/orders/${order.id}`).set(authAs(1));
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
});
```
Aplica a lectura, actualización y borrado, y a rutas anidadas (`/api/orders/:id/items/:itemId`).

## Escalamiento de privilegios
- Un `customer` no puede cambiar su `role` (mass assignment) ni llamar endpoints de `admin`.
- El rol sale de la sesión o token verificado, **nunca** del body ni de un header controlable.

## Tokens (si hay JWT o sesiones)
- Firma inválida → 401; `alg: none` → 401; expirado (avanzar el reloj con fake timers) → 401.
- Logout o revocación: el token deja de servir si el diseño lo exige.
- Usa claves de prueba generadas en el test o en `.env.example`, nunca secretos reales.

## Fuerza bruta y enumeración (si hay login)
- Tras N intentos fallidos: 429 (con el reloj controlado).
- Mismo mensaje y status para "usuario no existe" y "contraseña incorrecta".

## Sesión simulada (este repo)
`X-User-Id` identifica al usuario sin verificar nada (supuesto de la prueba técnica). Los tests de autorización siguen aplicando: la regla de propiedad se valida en el servidor con el usuario resuelto. Que el header sea falsificable es un riesgo declarado, no un caso a "arreglar" con tests.
