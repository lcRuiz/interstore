import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Rewards } from '@features/cart/data-access/cart.types';
import { RewardsApi } from './rewards-api';

/**
 * Saldo de puntos del usuario y último premio. El cliente nunca calcula puntos:
 * solo refleja lo que reporta el servidor (`GET /api/me` y `rewards` de las mutaciones).
 */
@Injectable({ providedIn: 'root' })
export class RewardsStore {
  private readonly api = inject(RewardsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly balanceState = signal<number | null>(null);
  private readonly awardState = signal(0);

  /** Saldo de puntos; `null` hasta que responda el servidor. */
  readonly balance = this.balanceState.asReadonly();
  /** Puntos otorgados por la última operación (0 si no hubo premio). */
  readonly lastAward = this.awardState.asReadonly();

  /** Carga el saldo (`GET /api/me`). Si falla, el saldo queda como estaba (el indicador se oculta). */
  load(): void {
    this.api
      .getMe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          this.balanceState.set(me.pointsBalance);
        },
        error: () => undefined,
      });
  }

  /** Reemplaza el saldo por el que reportó el servidor. */
  applyBalance(balance: number): void {
    this.balanceState.set(balance);
  }

  /** Aplica `rewards` de una respuesta: saldo y último premio (0 si la operación no premió). */
  applyRewards(rewards: Rewards): void {
    this.applyBalance(rewards.balance);
    this.awardState.set(rewards.awarded);
  }
}
