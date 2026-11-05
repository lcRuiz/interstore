import type { Routes } from '@angular/router';

/** Cada feature se carga de forma lazy con `loadComponent` (o `loadChildren` si tiene varias rutas). */
export const routes: Routes = [
  {
    path: '',
    title: 'Catálogo · Norte',
    loadComponent: () =>
      import('@features/catalog/pages/catalog-page/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: 'products/:id',
    title: 'Producto · Norte',
    loadComponent: () =>
      import('@features/catalog/pages/product-page/product-page').then((m) => m.ProductPage),
  },
  {
    path: 'cart',
    title: 'Carrito · Norte',
    loadComponent: () => import('@features/cart/pages/cart-page/cart-page').then((m) => m.CartPage),
  },
  { path: '**', redirectTo: '' },
];
