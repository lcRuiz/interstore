# Pruebas de servicios HTTP y clientes de API

## Setup
```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([apiErrorInterceptor])), // los interceptores reales que afectan al contrato
      provideHttpClientTesting(),
    ],
  });
  api = TestBed.inject(CatalogApi);
  httpTesting = TestBed.inject(HttpTestingController);
});
afterEach(() => httpTesting.verify()); // falla si quedó una petición sin atender o hubo una inesperada
```
Incluye los interceptores que transforman errores o headers si el servicio depende de ese contrato (p. ej. que los errores lleguen como `ApiError`).

## Qué verificar por endpoint
1. **Petición**: método, URL, query params (con `HttpParams` serializados), body y headers relevantes.
```ts
const req = httpTesting.expectOne((r) => r.url === '/api/products');
expect(req.request.method).toBe('GET');
expect(req.request.params.get('page')).toBe('2');
expect(req.request.params.has('category')).toBe(false); // no enviar filtros vacíos
```
2. **Respuesta feliz**: el mapeo de `{ data, meta }` al modelo de la app.
3. **Errores** (un test por clase):
   - 4xx con cuerpo estándar → `ApiError` con `status`, `code`, `message`, `details`.
   - Status 0 (red) → `NETWORK_ERROR`, `retryable: true`.
   - 5xx sin cuerpo estándar → `HTTP_ERROR`, `retryable: true`.
   - Errores de negocio específicos que la UI trata distinto (`OUT_OF_STOCK`, `VALIDATION_ERROR`).

## Observables → promesas en los tests
```ts
const result = firstValueFrom(api.list({ page: 1 }));
httpTesting.expectOne('/api/products?page=1').flush(page);
expect(await result).toEqual(expected);
```
Para errores:
```ts
const result = firstValueFrom(api.list({ page: 1 })).catch((e: unknown) => e);
httpTesting.expectOne(/\/api\/products/).flush(body, { status: 409, statusText: 'Conflict' });
expect(await result).toMatchObject({ code: 'OUT_OF_STOCK' });
```

## `httpResource` / `resource`
- Verifica su estado en Angular 21 en angular.dev antes de usarlos en pruebas (pueden estar en developer preview).
- Se prueban por sus signals públicos (`value()`, `status()`, `error()`), avanzando con `await TestBed.inject(ApplicationRef).whenStable()` o `fixture.whenStable()` después de `flush`.

## Cancelación y carreras (búsqueda con `switchMap`)
```ts
store.search('cam');
store.search('cami'); // debe cancelar la anterior
const [first, second] = httpTesting.match((r) => r.url === '/api/products');
expect(first.cancelled).toBe(true);
second.flush(page);
```
Con `debounceTime`, usa `vi.useFakeTimers()` y `await vi.advanceTimersByTimeAsync(300)`.

## Reintentos
Si el servicio reintenta, prueba el número exacto de peticiones y que no reintenta en 4xx.
