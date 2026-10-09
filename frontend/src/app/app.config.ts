import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideKeycloak, includeBearerTokenInterceptor, INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG } from 'keycloak-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([includeBearerTokenInterceptor])),
    {
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [{ urlPattern: /^\/api\// }]
    },
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
