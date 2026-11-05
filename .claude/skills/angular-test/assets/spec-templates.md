# Plantillas de spec

Adapta nombres y rutas a las convenciones del repo. Los comentarios de código van en el idioma del repo (aquí, español).

## Store con signals + HTTP
```ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import { FeatureStore } from './feature-store';

describe('FeatureStore', () => {
  let store: FeatureStore;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(FeatureStore);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('debe <comportamiento> cuando <condición>', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Componente presentacional (`ui/`)
```ts
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Widget } from './widget';

describe('Widget', () => {
  let fixture: ComponentFixture<Widget>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Widget] }).compileComponents();
    fixture = TestBed.createComponent(Widget);
  });

  it('debe mostrar <dato> cuando recibe <input>', async () => {
    fixture.componentRef.setInput('item', itemFixture);
    await fixture.whenStable();
    expect(el().querySelector('[data-testid="name"]')?.textContent).toContain('…');
  });

  it('debe emitir <evento> cuando el usuario <acción>', async () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.selected.subscribe((v) => emitted.push(v));
    fixture.componentRef.setInput('item', itemFixture);
    await fixture.whenStable();
    el().querySelector<HTMLButtonElement>('button[data-testid="select"]')?.click();
    expect(emitted).toEqual([itemFixture.id]);
  });
});
```

## Página contenedora con estados de UI
```ts
describe('FeaturePage', () => {
  it('debe mostrar el skeleton mientras carga', async () => { /* sin flush */ });
  it('debe mostrar el estado vacío cuando la API devuelve una lista vacía', async () => { /* flush [] */ });
  it('debe mostrar el error con reintento cuando la API falla con 5xx', async () => { /* flush 500 */ });
  it('debe volver a cargar cuando el usuario pulsa reintentar', async () => { /* click → nueva petición */ });
  it('debe mostrar los elementos cuando la API responde con datos', async () => { /* flush data */ });
});
```

## Interceptor funcional
```ts
describe('xInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([xInterceptor])), provideHttpClientTesting()],
    });
  });
  it('debe <transformación> cuando la URL es de la API', () => { /* … */ });
  it('no debe modificar peticiones a otros orígenes', () => { /* … */ });
});
```

## Esqueleto mínimo (ejemplo)
```ts
/** Estado del carrito del usuario actual. */
@Injectable({ providedIn: 'root' })
export class CartStore {
  /** Ítems del carrito. */
  readonly items = signal<readonly CartItem[]>([]).asReadonly();

  /** Agrega una unidad del producto. */
  add(_productId: number): void {
    throw new Error('Not implemented');
  }
}
```
