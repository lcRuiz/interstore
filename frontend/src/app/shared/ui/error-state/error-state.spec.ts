import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/api/api-error';
import { ErrorState } from './error-state';

async function render(error: ApiError) {
  const fixture = TestBed.createComponent(ErrorState);
  fixture.componentRef.setInput('error', error);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, retryButton: root.querySelector('button') };
}

describe('ErrorState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ErrorState] }).compileComponents();
  });

  it('debe anunciar el error con role alert', async () => {
    const { root } = await render(new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar'));

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('debe mostrar el mensaje propio del cliente cuando no hay red', async () => {
    const { root } = await render(
      new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor'),
    );

    expect(root.textContent).toContain('No se pudo conectar con el servidor');
  });

  it('debe mostrar «Reintentar» y emitir retry cuando el error es reintentable', async () => {
    const { fixture, retryButton } = await render(
      new ApiError(503, 'INTERNAL_ERROR', 'Servicio caído'),
    );
    let emitted = 0;
    fixture.componentInstance.retry.subscribe(() => emitted++);

    expect(retryButton?.textContent.trim()).toBe('Reintentar');
    retryButton?.click();

    expect(emitted).toBe(1);
  });

  it('no debe mostrar «Reintentar» cuando el error no es reintentable', async () => {
    const { root, retryButton } = await render(
      new ApiError(400, 'VALIDATION_ERROR', 'Datos inválidos'),
    );

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(retryButton).toBeNull();
  });

  it('no debe mostrar el mensaje que envía el servidor', async () => {
    const { root } = await render(
      new ApiError(500, 'INTERNAL_ERROR', 'SQLITE_ERROR en /srv/app/db.js:42'),
    );

    expect(root.textContent).not.toContain('SQLITE_ERROR');
    expect(root.textContent.trim().length).toBeGreaterThan(0);
  });

  // SEC-catalog-web-01: un cuerpo de error del servidor puede traer code NETWORK_ERROR.
  it('no debe mostrar el mensaje del servidor aunque su code sea NETWORK_ERROR', async () => {
    const { root } = await render(
      new ApiError(502, 'NETWORK_ERROR', 'Fallo interno en /srv/app/db.js:42'),
    );

    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.textContent).not.toContain('/srv/app');
  });
});
