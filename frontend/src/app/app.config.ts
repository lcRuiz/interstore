import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localeEsCO from '@angular/common/locales/es-CO';
import {
  type ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import { userIdInterceptor } from '@core/session/user-id.interceptor';
import { routes } from './app.routes';

registerLocaleData(localeEsCO);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Orden: primero se agrega el header, luego se normalizan los errores de la respuesta.
    provideHttpClient(withFetch(), withInterceptors([userIdInterceptor, apiErrorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
  ],
};
