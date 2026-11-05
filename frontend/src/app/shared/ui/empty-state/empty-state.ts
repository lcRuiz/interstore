import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Estado vacío: mensaje contextual y, opcionalmente, una acción (p. ej. «Limpiar filtros»).
 *
 * @example
 * <app-empty-state message="No hay productos" actionLabel="Limpiar filtros" (action)="clear()" />
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  /** Mensaje principal, ya redactado para el usuario. */
  readonly message = input.required<string>();
  /** Texto de la acción; sin él no se renderiza el botón. */
  readonly actionLabel = input<string | undefined>(undefined);
  /** Se emite sin payload al pulsar la acción. */
  readonly action = output();
}
