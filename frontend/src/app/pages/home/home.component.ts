import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';

@Component({
  selector: 'app-home',
  template: `
    <div class="container">
      <h1>Welcome</h1>
      <p>Spring Boot + Angular + Keycloak</p>

      @if (keycloak.authenticated) {
        <p>Logged in as <strong>{{ keycloak.tokenParsed?.['preferred_username'] }}</strong></p>
        <button (click)="goToProfile()">Profile</button>
        <button (click)="logout()">Logout</button>
      } @else {
        <button (click)="login()">Login</button>
        <button (click)="register()">Register</button>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 80px auto; text-align: center; font-family: sans-serif; }
    button { margin: 8px; padding: 10px 24px; cursor: pointer; border: none; border-radius: 4px; font-size: 14px; }
    button:first-of-type { background: #1976d2; color: white; }
    button:last-of-type { background: #e0e0e0; color: #333; }
  `]
})
export class HomeComponent {
  readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);

  login() {
    this.keycloak.login({ redirectUri: window.location.origin + '/profile' });
  }

  register() {
    this.keycloak.register({ redirectUri: window.location.origin + '/profile' });
  }

  logout() {
    this.keycloak.logout({ redirectUri: window.location.origin });
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }
}
