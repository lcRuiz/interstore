import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';
import { Store } from 'lucide-angular';

/** Layout principal: header fijo + contenido enrutado. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly StoreIcon = Store;
}
