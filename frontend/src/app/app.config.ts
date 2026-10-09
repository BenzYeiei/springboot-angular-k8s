import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideKeycloak, includeBearerTokenInterceptor, INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG } from 'keycloak-angular';

import { routes } from './app.routes';

declare global {
  interface Window {
    env: { KEYCLOAK_URL: string; KEYCLOAK_REALM: string; KEYCLOAK_CLIENT_ID: string };
  }
}

const kcUrl = window.env?.KEYCLOAK_URL ?? 'http://localhost:8082';
const kcRealm = window.env?.KEYCLOAK_REALM ?? 'springbootAngularK8s';
const kcClientId = window.env?.KEYCLOAK_CLIENT_ID ?? 'shopping-car';

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
        url: kcUrl,
        realm: kcRealm,
        clientId: kcClientId
      },
      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false
      }
    })
  ]
};
