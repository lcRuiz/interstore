# Guards, resolvers e interceptores funcionales

Todos son funciones que usan `inject()`. Se ejecutan dentro de un contexto de inyección: `TestBed.runInInjectionContext(() => fn(...))`.

## Interceptores (`HttpInterceptorFn`)
Prueba a través de `HttpClient`, no llamando a la función: así verificas el orden de la cadena y el contrato real.
```ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(withInterceptors([userIdInterceptor])), provideHttpClientTesting()],
});
http.get('/api/me').subscribe();
expect(httpTesting.expectOne('/api/me').request.headers.get('X-User-Id')).toBe('1');
```
Casos típicos:
- Aplica solo a las URLs que corresponde (y **no** a terceros: evita filtrar headers sensibles a otros orígenes).
- Transforma errores al tipo de dominio.
- Si hay varios interceptores, el orden importa: pruébalo con la cadena real de `app.config.ts`.

## Guards (`CanActivateFn`, `CanMatchFn`)
```ts
const result = TestBed.runInInjectionContext(() =>
  authGuard({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
);
expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: '/admin' } }));
```
- Prueba permitido, denegado (con el `UrlTree` exacto) y el caso asíncrono (`Observable`/`Promise`).
- Integración: `RouterTestingHarness` navegando a la ruta protegida.
- Recuerda en el reporte que un guard es UX, no seguridad: la autorización real la valida el backend (ver `angular-sec`).

## Resolvers (`ResolveFn`)
- Datos resueltos (petición correcta, valor devuelto).
- Error: qué hace (redirige, devuelve `null`, propaga) según el contrato.

## Validación de `returnUrl` y redirecciones
Si un guard o componente redirige con un parámetro del usuario, agrega un test que verifique que **rechaza URLs externas** (`https://evil.example`, `//evil.example`, `javascript:`). Es un caso de seguridad recurrente (open redirect).
