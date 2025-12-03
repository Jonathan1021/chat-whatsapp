import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="register-container">
      <div class="register-card">
        <div class="card-content">
          <h2>Crear Cuenta</h2>
          <p class="subtitle">Regístrate para usar WhatsApp</p>

          <form (ngSubmit)="onRegister()" class="register-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-icon matIconPrefix>person</mat-icon>
              <mat-label>Nombre</mat-label>
              <input matInput [(ngModel)]="name" name="name" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-icon matIconPrefix>email</mat-icon>
              <mat-label>Correo electrónico</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-icon matIconPrefix>lock</mat-icon>
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required>
            </mat-form-field>

            <button mat-raised-button class="register-button" type="submit" [disabled]="loading()">
              {{ loading() ? 'Registrando...' : 'Registrarse' }}
            </button>
          </form>

          @if (error()) {
            <div class="error-message">{{ error() }}</div>
          }

          @if (success()) {
            <div class="success-message">¡Registro exitoso! Redirigiendo...</div>
          }

          <div class="login-link">
            <p>¿Ya tienes cuenta? <a (click)="goToLogin()">Inicia sesión</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      background: linear-gradient(to bottom, #00a884 0%, #00a884 220px, #d9dbd5 220px, #d9dbd5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .register-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 480px;
    }

    .card-content {
      padding: 48px 40px;
    }

    h2 {
      font-size: 28px;
      font-weight: 400;
      color: #111b21;
      margin: 0 0 8px 0;
      text-align: center;
    }

    .subtitle {
      color: #667781;
      font-size: 14px;
      text-align: center;
      margin: 0 0 32px 0;
    }

    .register-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .register-button {
      width: 100%;
      height: 48px;
      background: #00a884;
      color: white;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      text-transform: none;
      margin-top: 8px;
    }

    .register-button:hover:not([disabled]) {
      background: #008069;
    }

    .register-button:disabled {
      background: #e9edef;
      color: #8696a0;
    }

    .error-message {
      background: #fee;
      color: #c00;
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
      text-align: center;
    }

    .success-message {
      background: #efe;
      color: #0a0;
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
      text-align: center;
    }

    .login-link {
      text-align: center;
      margin-top: 24px;
    }

    .login-link p {
      color: #667781;
      font-size: 14px;
      margin: 0;
    }

    .login-link a {
      color: #00a884;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
    }

    .login-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  success = signal(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onRegister(): void {
    this.loading.set(true);
    this.error.set('');

    this.http.post(`${environment.apiUrl}/auth/register`, {
      name: this.name,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Error al registrar usuario');
        this.loading.set(false);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
