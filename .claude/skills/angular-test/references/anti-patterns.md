# Antipatrones de prueba

| Antipatrón | Por qué es malo | Alternativa |
|---|---|---|
| Test que pasa sin implementación | No discrimina: dará verde aunque la feature esté rota | Afirmar el comportamiento esperado concreto; verificar que falla en RED |
| Fallo RED por compilación o import | Prueba el entorno, no el comportamiento | Esqueleto con la firma pública final |
| Espiar o mockear el sujeto bajo prueba | El test valida el mock, no el código | Mockear solo dependencias externas (HTTP, otras features) |
| Afirmar llamadas internas (`expect(service.privateMethod).toHaveBeenCalled()`) | Rompe con cualquier refactor | Afirmar el resultado observable (estado, DOM, petición) |
| `fakeAsync`/`tick` en una app zoneless | Depende de zone.js | `vi.useFakeTimers()` + `advanceTimersByTimeAsync` |
| `fixture.detectChanges()` en lugar de esperar | Oculta trabajo asíncrono pendiente | `await fixture.whenStable()` |
| Snapshots de HTML completos | Frágiles y no expresan intención | Afirmar los textos y atributos relevantes |
| Datos aleatorios o fecha actual | Tests no deterministas | Fixtures fijas, tiempo controlado |
| Estado compartido entre tests | Orden dependiente, fallos intermitentes | Setup en `beforeEach`, fábricas de fixtures |
| Un test con varios comportamientos | El nombre miente y el fallo es ambiguo | Un comportamiento por test |
| `setTimeout` reales para "esperar" | Lento e intermitente | Timers falsos o `whenStable()` |
| Seleccionar por clases CSS de estilo | Cambia con el diseño | Rol/label accesible o `data-testid` |
| Relajar la aserción para que pase (`toBeTruthy` en lugar del valor) | Pierde el contrato | Corregir el código o el esqueleto |
| Olvidar `httpTesting.verify()` | Peticiones inesperadas pasan inadvertidas | `afterEach(() => httpTesting.verify())` |
| Mock que no respeta el contrato (campos inventados) | Verde en tests, rojo en producción | Tipar los dobles con los tipos reales (`Pick<…>`, DTOs) |

## Checklist de revisión de pruebas
- [ ] Cada requerimiento de la matriz tiene ≥ 1 test; cada test apunta a un requerimiento.
- [ ] Nombres "debe … cuando …" y estructura AAA.
- [ ] Un motivo de fallo por test; sin dependencias entre tests.
- [ ] Solo comportamiento observable; nada privado.
- [ ] Estados carga/vacío/error/éxito cubiertos en cada vista con datos remotos.
- [ ] Errores HTTP: 4xx con cuerpo, red (0) y 5xx.
- [ ] Mutaciones optimistas: aplica, reconcilia, rollback, serialización.
- [ ] Sin `fakeAsync` en zoneless; timers controlados.
- [ ] `httpTesting.verify()` en specs con HTTP.
- [ ] Dobles tipados con los tipos reales del contrato.
- [ ] Reporte RED con salida real y todos los fallos ✅.
