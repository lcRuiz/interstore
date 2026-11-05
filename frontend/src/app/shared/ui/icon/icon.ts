import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

export type IconSize = 16 | 20 | 24;

/**
 * Ícono Lucide con las reglas del diseño: trazo 1.5, tamaños 16/20/24 y
 * siempre decorativo (`aria-hidden`). El texto accesible va en el control
 * que lo contiene (p. ej. `aria-label` del botón).
 *
 * @example
 * // import { ShoppingBag } from 'lucide-angular';
 * <button type="button" aria-label="Ver carrito">
 *   <app-icon [icon]="ShoppingBag" [size]="20" />
 * </button>
 */
@Component({
  selector: 'app-icon',
  imports: [LucideAngularModule],
  template: `<lucide-icon [img]="icon()" [size]="size()" [strokeWidth]="1.5" />`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  /** Datos del ícono, importados por nombre desde `lucide-angular`. */
  readonly icon = input.required<LucideIconData>();
  /** Lado en px; solo los tamaños del sistema de diseño. Por defecto 20. */
  readonly size = input<IconSize>(20);
}
