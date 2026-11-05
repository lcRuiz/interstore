# Stores con signals y pruebas zoneless

## Store con HTTP real mockeado
```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([apiErrorInterceptor])), provideHttpClientTesting()],
  });
  store = TestBed.inject(CartStore);
  httpTesting = TestBed.inject(HttpTestingController);
});
```
Prueba **solo los signals públicos** (`items()`, `total()`, `state()`). Si necesitas leer algo privado para afirmar, falta una API pública o el test está mirando la implementación.

## `computed`
Cambia la fuente con una acción pública y lee el `computed`: no hace falta esperar, es síncrono.

## `effect`
Los effects se ejecutan durante la detección de cambios. En tests:
- Con fixture: `await fixture.whenStable()`.
- Sin fixture (servicio): `TestBed.tick()` (Angular 20+; verifica en angular.dev si tu versión usa otro nombre, como el antiguo `flushEffects`).
Prueba el **efecto externo** (localStorage escrito, toast mostrado), no que el effect "corrió".

## Actualización optimista (patrón crítico)
Cada mutación optimista tiene al menos estos tests:
1. **Aplica de inmediato**: después de la acción, antes de `flush`, el estado ya refleja el cambio.
2. **Reconcilia**: después de `flush` exitoso, el estado es **el del servidor** (no el calculado en el cliente), p. ej. total y puntos devueltos por la API.
3. **Rollback**: con `flush` de error, el estado vuelve exactamente al snapshot anterior y se expone el error (para el toast).
4. **Serialización**: dos acciones rápidas sobre el mismo ítem generan peticiones en orden y el estado final es consistente.
5. **Los puntos no son optimistas**: antes de `flush` el saldo no cambia.

```ts
store.add(7);
expect(store.items().find((i) => i.productId === 7)?.quantity).toBe(1); // optimista
httpTesting.expectOne('/api/cart/items').flush(errorBody, { status: 409, statusText: 'Conflict' });
expect(store.items()).toEqual(snapshot); // rollback
expect(store.lastError()?.code).toBe('OUT_OF_STOCK');
```

## `toSignal` y RxJS en stores
- Si el store usa `debounceTime`, controla el tiempo con `vi.useFakeTimers()` y `await vi.advanceTimersByTimeAsync(ms)`; restaura con `vi.useRealTimers()` en `afterEach`.
- Para `switchMap`, verifica la cancelación (`req.cancelled`).

## Zoneless: reglas rápidas
- No uses `fakeAsync`, `tick`, `flush` de `@angular/core/testing` (requieren zone.js).
- `await fixture.whenStable()` después de cada cambio que deba reflejarse en el DOM.
- Si un test pasa con `detectChanges()` pero falla con `whenStable()`, probablemente hay un cambio de estado fuera de signals (un bug real en zoneless).
