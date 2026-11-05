import type { ApiError } from '@core/api/api-error';

/**
 * Estado de cualquier dato remoto. Toda vista que consuma la API lo modela y
 * renderiza explícitamente cada caso con `@switch (state.status)`.
 */
export type LoadState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly error: ApiError };

/**
 * Constructores de `LoadState`.
 *
 * @example
 * this.state.set(LoadState.loading);
 * this.state.set(LoadState.from(page.data));
 * this.state.set(LoadState.error(toApiError(err)));
 */
export const LoadState = {
  idle: { status: 'idle' } as const,
  loading: { status: 'loading' } as const,
  empty: { status: 'empty' } as const,

  /** Estado de error con el `ApiError` normalizado. */
  error(error: ApiError): LoadState<never> {
    return { status: 'error', error };
  },

  /** `success`, o `empty` si `isEmpty(data)` (por defecto: arreglo vacío). */
  from<T>(data: T, isEmpty: (data: T) => boolean = defaultIsEmpty): LoadState<T> {
    return isEmpty(data) ? { status: 'empty' } : { status: 'success', data };
  },
};

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}
