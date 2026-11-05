import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Session } from './session';
import { userIdInterceptor } from './user-id.interceptor';

describe('userIdInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([userIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('agrega X-User-Id del usuario actual a las rutas /api', () => {
    TestBed.inject(Session).switchUser(2);
    http.get('/api/me').subscribe();
    expect(httpTesting.expectOne('/api/me').request.headers.get('X-User-Id')).toBe('2');
  });

  it('no agrega el header a otros orígenes', () => {
    http.get('https://example.com/data').subscribe();
    expect(httpTesting.expectOne('https://example.com/data').request.headers.has('X-User-Id')).toBe(
      false,
    );
  });
});
