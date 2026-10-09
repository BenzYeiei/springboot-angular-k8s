import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideKeycloak, includeBearerTokenInterceptor } from 'keycloak-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),
    provideKeycloak({
      config: {
        url: 'http://localhost:8082',
        realm: 'springbootAngularK8s',
        clientId: 'shopping-car'
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false
      }
    })
  ]
};
