import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CartStore } from '@features/cart/data-access/cart-store';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { Icon } from '@shared/ui/icon/icon';
import { ShoppingBag, Star, Store } from 'lucide-angular';

/**
 * Layout principal: header fijo + contenido enrutado.
 *
 * El header muestra el acceso al carrito con su contador de unidades y el saldo de puntos;
 * ambos se leen de `CartStore` y `RewardsStore` y se anuncian con `aria-live`. Al crearse
 * dispara la carga inicial de carrito y saldo.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly cart = inject(CartStore);
  private readonly rewards = inject(RewardsStore);

  protected readonly StoreIcon = Store;
  protected readonly BagIcon = ShoppingBag;
  protected readonly StarIcon = Star;

  protected readonly totalItems = this.cart.totalItems;
  protected readonly balance = this.rewards.balance;
  protected readonly lastAward = this.rewards.lastAward;

  constructor() {
    this.cart.load();
    this.rewards.load();
  }
}
