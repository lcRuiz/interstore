import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Shell } from '@core/layout/shell/shell';

/** Componente raíz: solo monta el layout principal. */
@Component({
  selector: 'app-root',
  imports: [Shell],
  template: '<app-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
