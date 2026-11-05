# Diseño de pruebas

## Por qué test-first
El test escrito antes fija el **contrato observable** antes de que la implementación lo sesgue. Si el test se escribe después, tiende a describir lo que el código hace, no lo que debería hacer. El reporte RED es la prueba de que el test distingue ambos casos.

## Anatomía de un buen test
```ts
it('debe mostrar el estado vacío cuando la API devuelve una página sin productos', async () => {
  // Arrange: un escenario, el mínimo de datos
  const { fixture, http } = setup();
  // Act: una acción observable
  http.expectOne((r) => r.url === '/api/products').flush({ data: [], meta: emptyMeta });
  await fixture.whenStable();
  // Assert: un motivo de fallo
  expect(text(fixture, '[data-testid="empty-state"]')).toContain('No hay productos');
});
```

- **Nombre**: `debe <comportamiento> cuando <condición>`. Si no puedes nombrarlo así, el test prueba demasiadas cosas o ninguna.
- **Un motivo de fallo**: varias aserciones están bien si describen *un* comportamiento (p. ej. status y code de un mismo error). Dos comportamientos son dos tests.
- **Independencia**: cada test crea su propio `TestBed`/fixture (ya ocurre por `beforeEach`). Nada de variables mutables compartidas a nivel de módulo.
- **Determinismo**: sin `Date.now()`, `Math.random()` ni red real. Inyecta o controla el tiempo (`vi.useFakeTimers()`).

## Qué probar (y qué no)
| Probar | No probar |
|---|---|
| Lo que ve el usuario (texto, estados, accesibilidad básica: roles, labels) | Clases CSS concretas salvo que sean el contrato (p. ej. `[class.active]`) |
| Lo que sale por la red (método, URL, params, body, headers relevantes) | Que `HttpClient.get` fue llamado (detalle de implementación) |
| Estado público del store (signals de solo lectura) | Signals privados o métodos `private` |
| Eventos emitidos por `output()` y su payload | Cuántas veces se ejecutó un `computed` |
| Mapeo de errores a estados de UI | Mensajes de log |

## Dobles de prueba
- **HTTP**: siempre `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`. Termina con `httpTesting.verify()` en `afterEach`: detecta peticiones inesperadas.
- **Dependencias de otras features**: un objeto con la forma pública mínima, provisto con `{ provide: X, useValue: stub }`. Tipéalo con `Pick<X, 'a' | 'b'>` para no mentir sobre el contrato.
- **Router**: `provideRouter([])` y, para componentes enrutados, `RouterTestingHarness`.
- **Spies**: `vi.fn()` / `vi.spyOn()` solo para verificar efectos externos (navegación, toasts). No espíes el sujeto bajo prueba.

## Selectores en el DOM
Preferencia: rol/label accesible → `data-testid` → selector estructural. Agrega `data-testid` en el esqueleto si no hay un rol claro; es parte del contrato del componente con sus tests.

## Matriz de trazabilidad
Cada fila: requerimiento → casos → archivo de spec → estado (RED/GREEN). La revisión del PR la usa para verificar cobertura funcional, no de líneas.

## Legado (código sin pruebas)
1. **Caracterización**: escribe tests que capturen el comportamiento *actual*, incluso si parece incorrecto (anótalo). Deben pasar.
2. **Refactor de testabilidad** mínimo y separado (extraer una dependencia a `inject()`, exponer un estado), con los tests de caracterización en verde.
3. **Tests del cambio** en rojo → fase normal.
4. El reporte RED separa las tres secciones. Las correcciones de comportamiento "incorrecto" son un cambio de requerimiento: hacen falta la confirmación y la puerta humana.

## Prioridad cuando el tiempo es limitado
1. Reglas de negocio y cálculos.
2. Contrato HTTP y mapeo de errores.
3. Estados de UI (carga/error/vacío/éxito).
4. Interacciones (clics, formularios).
5. Presentación pura (solo si tiene lógica).
