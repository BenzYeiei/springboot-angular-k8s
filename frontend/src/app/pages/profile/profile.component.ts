import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';

interface UserProfile {
  id: string;
  keycloakId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-profile',
  template: `
    <div class="container">
      <h1>Profile</h1>

      @if (loading()) {
        <p>Loading...</p>
      } @else if (user()) {
        <div class="card">
          <p><strong>Username:</strong> {{ user()!.username }}</p>
          <p><strong>Email:</strong> {{ user()!.email }}</p>
          <p><strong>Name:</strong> {{ user()!.firstName }} {{ user()!.lastName }}</p>
        </div>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <button (click)="goHome()">Back to Home</button>
      <button (click)="logout()">Logout</button>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 80px auto; font-family: sans-serif; }
    .card { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .error { color: red; }
    button { margin: 8px; padding: 10px 24px; cursor: pointer; border: none; border-radius: 4px; font-size: 14px; }
    button:first-of-type { background: #e0e0e0; color: #333; }
    button:last-of-type { background: #d32f2f; color: white; }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly keycloak = inject(Keycloak);

  user = signal<UserProfile | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.http.get<UserProfile>('/api/user/me').subscribe({
      next: (data) => {
        this.user.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load profile');
        this.loading.set(false);
      }
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  logout() {
    this.keycloak.logout({ redirectUri: window.location.origin });
  }
}
