import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function request(): Promise<unknown> {
    return new Promise((resolve) => http.get('/api/x').subscribe({ error: resolve }));
  }

  it('traduce el cuerpo de error del backend a ApiError', async () => {
    const result = request();
    httpTesting
      .expectOne('/api/x')
      .flush(
        { error: { code: 'OUT_OF_STOCK', message: 'Sin stock', details: { productId: 3 } } },
        { status: 409, statusText: 'Conflict' },
      );

    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'OUT_OF_STOCK',
      message: 'Sin stock',
      details: { productId: 3 },
    });
    expect(error.retryable).toBe(false);
  });

  it('error de red → NETWORK_ERROR reintentable', async () => {
    const result = request();
    httpTesting.expectOne('/api/x').error(new ProgressEvent('error'), { status: 0 });

    const error = (await result) as ApiError;
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.retryable).toBe(true);
  });

  it('respuesta sin el formato estándar → HTTP_ERROR', async () => {
    const result = request();
    httpTesting
      .expectOne('/api/x')
      .flush('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' });

    const error = (await result) as ApiError;
    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });
});
