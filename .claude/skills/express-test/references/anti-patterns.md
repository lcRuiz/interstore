# Antipatrones de prueba (backend)

| Antipatrón | Por qué es malo | Alternativa |
|---|---|---|
| Mockear la base de datos | Oculta errores de SQL, constraints y migraciones | SQLite `:memory:` con las migraciones reales |
| Base compartida entre tests | Orden dependiente, fallos intermitentes | Base nueva por test o transacción revertida |
| Usar la base de desarrollo o un `.sqlite` real | Destruye datos y depende del estado local | `:memory:` o archivo temporal borrado al final |
| `app.listen()` en los tests | Puertos en uso, procesos colgados | `supertest` sobre `createApp(deps)` |
| Ruta sin registrar como esqueleto | Falla con 404 (razón incorrecta) | Registrar la ruta y responder 501 |
| `sleep`/`setTimeout` para esperar | Lento e intermitente | Fake timers o reloj inyectado |
| Afirmar el SQL generado | Frágil ante refactors | Afirmar el resultado en la base y la respuesta |
| Afirmar mensajes humanos exactos | Cambian sin cambiar el contrato | Afirmar `code` y status |
| Solo el camino feliz | Los bugs de seguridad viven en los 4xx | Casos obligatorios: 400, 401, 403/IDOR, 404, 409, mass assignment |
| Test de IDOR con el mismo usuario | No prueba nada | Recurso del usuario B pedido por el usuario A |
| Fixtures gigantes compartidos | Acoplamiento y tests opacos | Factories mínimas por test |
| Datos reales (emails, nombres de clientes) | Riesgo de privacidad | Datos sintéticos (`@example.test`) |
| Relajar una aserción para pasar | Pierde el contrato | Corregir el código o el esqueleto |
| Ignorar el typecheck en RED | Errores de tipos invisibles con Vitest | `npm run typecheck` antes de la suite |
| Probar el 500 lanzando desde el test sin pasar por la app | No prueba el error handler | Inyectar un doble que lanza y llamar al endpoint |

## Checklist de revisión de pruebas
- [ ] Cada requerimiento de la matriz tiene ≥ 1 test y cada test apunta a un requerimiento.
- [ ] Por endpoint: feliz, 400, 401, 403/IDOR, 404, 409, campos extra, paginación, límites y 500 sin fugas.
- [ ] Datos: FK activas, `UNIQUE`/`NOT NULL`/`CHECK`, rollback de transacciones, migraciones desde cero.
- [ ] Aislamiento: base por test, sin estado global, sin `listen`.
- [ ] Tiempo e IDs controlados; sin `sleep`.
- [ ] Factories con datos sintéticos.
- [ ] Typecheck y suite ejecutados; reporte RED con la salida real y todos los fallos ✅.
