import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ApiError } from '@core/api/api-error';

/**
 * Estado de error con acción «Reintentar» solo si el error es reintentable.
 *
 * Nunca muestra el `message` que envía el servidor (puede filtrar detalles internos):
 * usa textos propios según el tipo de fallo.
 *
 * @example
 * <app-error-state [error]="state.error" (retry)="store.reload()" />
 */
@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  /** Error normalizado por `apiErrorInterceptor`; `retryable` decide si hay botón. */
  readonly error = input.required<ApiError>();
  /** Se emite sin payload al pulsar «Reintentar». */
  readonly retry = output();

  protected readonly message = computed(() => {
    const error = this.error();
    // NOTA: status 0 solo lo produce el cliente (sin respuesta); el `code` puede venir del
    // servidor, así que no sirve para decidir si el mensaje es propio (SEC-catalog-web-01).
    if (error.status === 0) return error.message;
    if (error.retryable) return 'El servidor tuvo un problema. Intenta de nuevo en unos instantes.';
    return 'No pudimos completar la solicitud. Revisa los filtros e inténtalo otra vez.';
  });
}
