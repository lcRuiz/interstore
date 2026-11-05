import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder de la ruta del catálogo; se reemplaza al implementar la feature. */
@Component({
  selector: 'app-catalog-page',
  template: `
    <h1 class="title">Catálogo</h1>
    <p class="subtitle">Próximamente: productos con filtros, búsqueda y paginación del servidor.</p>
  `,
  styles: `
    .title {
      font: var(--text-h2);
      letter-spacing: var(--tracking-h2);
    }
    .subtitle {
      margin-top: var(--space-2);
      color: var(--text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {}
