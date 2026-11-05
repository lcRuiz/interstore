# Pruebas de componentes (standalone, zoneless, OnPush)

## Setup base
```ts
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [ProductCard], // standalone: se importa, no se declara
    providers: [provideRouter([])], // solo lo que el componente necesita
  }).compileComponents();
});
```

En una app zoneless (Angular 21 por defecto) **no hay detección de cambios automática por zone.js**:
- Después de cambiar inputs o estado, usa `await fixture.whenStable()`. Es la forma recomendada y funciona igual con o sin zone.
- `fixture.detectChanges()` sigue existiendo, pero no lo uses como sustituto de esperar tareas asíncronas.
- `fakeAsync`/`tick` dependen de zone.js: en zoneless usa `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()`.

## Inputs con signals
```ts
const fixture = TestBed.createComponent(ProductCard);
fixture.componentRef.setInput('product', productFixture); // input() o input.required()
await fixture.whenStable();
```
`setInput` es el único camino correcto: los `input()` son de solo lectura desde fuera.

## Outputs
```ts
const emitted: number[] = [];
fixture.componentInstance.addToCart.subscribe((id) => emitted.push(id));
click(fixture, 'button[data-testid="add"]');
expect(emitted).toEqual([42]);
```

## Componentes contenedores (pages)
- Provee el store real con su API mockeada vía HTTP (`HttpTestingController`). Así pruebas la integración página↔store↔contrato sin acoplarte a la implementación interna del store.
- Alternativa (store complejo o de otra feature): un stub con signals controlables.
```ts
const items = signal<Product[]>([]);
providers: [{ provide: CatalogStore, useValue: { items, state: signal(LoadState.loading), load: vi.fn() } }]
```

## Estados de UI (obligatorio por cada vista con datos remotos)
Un test por estado: **carga** (skeleton visible), **error** (mensaje y botón reintentar si `retryable`), **vacío** (mensaje contextual), **éxito** (contenido). Además, el reintento llama de nuevo a la carga.

## Rutas y query params
```ts
const harness = await RouterTestingHarness.create();
const page = await harness.navigateByUrl('/?category=Libros&page=2', CatalogPage);
```
Con `withComponentInputBinding()`, los query params llegan como inputs: pruébalo navegando, no seteando el input a mano.

## `@defer`
Usa `fixture.getDeferBlocks()` y `deferBlock.render(DeferBlockState.Complete)` para probar cada estado del bloque.

## Accesibilidad mínima verificable
- Botones de solo ícono tienen `aria-label`.
- Regiones con `aria-live` presentes para cambios dinámicos (puntos, carrito).
- Inputs con `<label>` asociado (`getByLabel` equivalente: `querySelector('label[for=…]')`).

## Helpers sugeridos (en el spec o en un `testing/` del feature)
```ts
const q = (f: ComponentFixture<unknown>, sel: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLElement>(sel);
const text = (f: ComponentFixture<unknown>, sel: string) => q(f, sel)?.textContent?.trim() ?? '';
const click = (f: ComponentFixture<unknown>, sel: string) => q(f, sel)?.click();
```
