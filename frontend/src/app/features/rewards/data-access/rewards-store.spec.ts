import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RewardsStore } from './rewards-store';

describe('RewardsStore', () => {
  let store: RewardsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(RewardsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe empezar sin saldo ni premio', () => {
    expect(store.balance()).toBeNull();
    expect(store.lastAward()).toBe(0);
  });

  it('debe cargar el saldo desde GET /api/me', () => {
    store.load();

    http.expectOne('/api/me').flush({ data: { id: 1, name: 'Ana Demo', pointsBalance: 40 } });

    expect(store.balance()).toBe(40);
  });

  it('debe reemplazar el saldo con applyBalance', () => {
    store.applyBalance(70);

    expect(store.balance()).toBe(70);
  });

  it('debe guardar saldo y premio con applyRewards', () => {
    store.applyRewards({ awarded: 10, balance: 50 });

    expect(store.balance()).toBe(50);
    expect(store.lastAward()).toBe(10);
  });

  it('debe limpiar el premio cuando la siguiente operación no otorga puntos', () => {
    store.applyRewards({ awarded: 10, balance: 50 });
    expect(store.lastAward()).toBe(10);
    store.applyRewards({ awarded: 0, balance: 50 });

    expect(store.lastAward()).toBe(0);
  });
});
