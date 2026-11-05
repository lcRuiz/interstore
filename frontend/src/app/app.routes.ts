import type { Routes } from '@angular/router';

/** Cada feature se carga de forma lazy con `loadComponent` (o `loadChildren` si tiene varias rutas). */
export const routes: Routes = [
  {
    path: '',
    title: 'Catálogo · Norte',
    loadComponent: () =>
      import('@features/catalog/pages/catalog-page/catalog-page').then((m) => m.CatalogPage),
  },
  { path: '**', redirectTo: '' },
];
