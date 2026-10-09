import { inject } from '@angular/core';
import { createAuthGuard } from 'keycloak-angular';
import { RouterStateSnapshot } from '@angular/router';
import Keycloak from 'keycloak-js';

export const authGuard = createAuthGuard(async (route, state: RouterStateSnapshot) => {
  const keycloak = inject(Keycloak);

  if (keycloak.authenticated) {
    return true;
  }

  await keycloak.login({ redirectUri: window.location.origin + state.url });
  return false;
});
