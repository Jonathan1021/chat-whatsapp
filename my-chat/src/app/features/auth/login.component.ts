import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="login-container">
      <div class="login-header">
        <div class="whatsapp-logo">
          <svg viewBox="0 0 39 39" height="39" width="39">
            <path fill="currentColor" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"></path>
            <path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-4.4-7.1-2.3-16.5 4.9-20.9s16.5-2.3 20.9 4.9 2.3 16.5-4.9 20.9c-2.3 1.5-5.1 2.3-7.9 2.3zm8.8-11.1l-1.1-.5s-1.6-.7-2.6-1.2c-.1 0-.2-.1-.3-.1-.3 0-.5.1-.7.2 0 0-.1.1-1.5 1.7-.1.2-.3.3-.5.3h-.1c-.1 0-.3-.1-.4-.2l-.5-.2c-1.1-.5-2.1-1.1-2.9-1.9-.2-.2-.5-.4-.7-.6-.7-.7-1.4-1.5-1.9-2.4l-.1-.2c-.1-.1-.1-.2-.2-.4 0-.2 0-.4.1-.5 0 0 .4-.5.7-.8.2-.2.3-.5.5-.7.2-.3.3-.7.2-1-.1-.5-1.3-3.2-1.6-3.8-.2-.3-.4-.4-.7-.5h-1.1c-.2 0-.4.1-.6.1l-.1.1c-.2.1-.4.3-.6.4-.2.2-.3.4-.5.6-.7.9-1.1 2-1.1 3.1 0 .8.2 1.6.5 2.3l.1.3c.9 1.9 2.1 3.6 3.7 5.1l.4.4c.3.3.6.5.8.8 2.1 1.8 4.5 3.1 7.2 3.8.3.1.7.1 1 .2h1c.5 0 1.1-.2 1.5-.4.3-.2.5-.2.7-.4l.2-.2c.2-.2.4-.3.6-.5s.4-.4.5-.6c.2-.4.3-.9.4-1.4v-.7s-.1-.1-.3-.2z"></path>
          </svg>
        </div>
        <h1>WHATSAPP WEB</h1>
      </div>

      <div class="login-card">
        <div class="card-content">
          <h2>Iniciar sesión en WhatsApp</h2>
          <p class="subtitle">Ingresa tus credenciales para continuar</p>

          <form (ngSubmit)="onLogin()" class="login-form">
            <div class="input-group">
              <mat-form-field appearance="outline" class="full-width">
                <mat-icon matIconPrefix>email</mat-icon>
                <mat-label>Correo electrónico</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required>
              </mat-form-field>
            </div>

            <div class="input-group">
              <mat-form-field appearance="outline" class="full-width">
                <mat-icon matIconPrefix>lock</mat-icon>
                <mat-label>Contraseña</mat-label>
                <input matInput type="password" [(ngModel)]="password" name="password" required>
              </mat-form-field>
            </div>

            <button mat-raised-button class="login-button" type="submit" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20" class="spinner"></mat-spinner>
              } @else {
                Iniciar Sesión
              }
            </button>
          </form>


        </div>
      </div>

      <div class="login-footer">
        <p>🔒 Tus mensajes personales están protegidos con cifrado de extremo a extremo</p>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      background: linear-gradient(to bottom, #00a884 0%, #00a884 220px, #d9dbd5 220px, #d9dbd5 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }

    .login-header {
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      margin-top: 40px;
      margin-bottom: 40px;
    }

    .whatsapp-logo {
      width: 39px;
      height: 39px;
      color: white;
    }

    .login-header h1 {
      font-size: 14px;
      font-weight: 400;
      letter-spacing: 0.5px;
      margin: 0;
    }

    .login-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 480px;
      overflow: hidden;
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

    .login-form {
      margin-bottom: 32px;
    }

    .input-group {
      margin-bottom: 20px;
    }

    .full-width {
      width: 100%;
    }

    ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    ::ng-deep .mat-mdc-text-field-wrapper {
      background: #f0f2f5;
    }

    ::ng-deep .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__leading,
    ::ng-deep .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__notch,
    ::ng-deep .mdc-text-field--outlined .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: #e9edef;
    }

    .login-button {
      width: 100%;
      height: 48px;
      background: #00a884;
      color: white;
      font-size: 16px;
      font-weight: 500;
      border-radius: 8px;
      text-transform: none;
      letter-spacing: 0.5px;
      box-shadow: none;
    }

    .login-button:hover:not([disabled]) {
      background: #008069;
    }

    .login-button:disabled {
      background: #e9edef;
      color: #8696a0;
    }

    .spinner {
      display: inline-block;
      margin: 0;
    }

    ::ng-deep .spinner circle {
      stroke: white;
    }



    .login-footer {
      margin-top: 32px;
      text-align: center;
      max-width: 480px;
    }

    .login-footer p {
      color: #667781;
      font-size: 13px;
      line-height: 1.5;
    }

    @media (max-width: 600px) {
      .card-content {
        padding: 32px 24px;
      }

      h2 {
        font-size: 24px;
      }

      .login-header {
        margin-top: 20px;
        margin-bottom: 20px;
      }
    }
  `]
})
export class LoginComponent {
  email = 'juan@test.com';
  password = 'password';
  loading = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    this.loading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/chats']);
      },
      error: () => this.loading.set(false)
    });
  }
}
