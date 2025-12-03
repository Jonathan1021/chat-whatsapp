import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Signal para usuario autenticado (Angular 19 feature)
  currentUser = signal<User | null>(null);

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    const stored = sessionStorage.getItem('currentUser');
    const token = sessionStorage.getItem('token');
    
    if (stored && token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const storedUser = JSON.parse(stored);
        
        // Verificar que el userId coincida con el sub del token
        if (storedUser.id !== tokenPayload.sub) {
          // Token y usuario no coinciden, limpiar
          sessionStorage.removeItem('currentUser');
          sessionStorage.removeItem('token');
        } else {
          this.currentUser.set(storedUser);
        }
      } catch {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
      }
    }
  }

  /**
   * Login simulado
   * PRODUCCIÓN: Conectar con backend real (JWT, AWS Cognito, Auth0)
   * Ejemplo: return this.http.post<{token: string, user: User}>('/api/auth/login', {email, password})
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        this.storeTokens(response.token, response.refreshToken);
        
        const tokenPayload = JSON.parse(atob(response.token.split('.')[1]));
        const userId = tokenPayload.sub;
        const userName = tokenPayload.name || email.split('@')[0];
        
        const user: User = {
          id: userId,
          name: userName,
          email,
          avatar: this.getInitials(userName),
          online: true
        };
        this.currentUser.set(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  refreshToken(): Observable<any> {
    const refreshToken = sessionStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    return this.http.post<any>(`${this.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap(response => {
        this.storeTokens(response.token, response.refreshToken);
      })
    );
  }

  private storeTokens(token: string, refreshToken: string): void {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('refreshToken', refreshToken);
  }

  private getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  logout(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    const hasToken = !!sessionStorage.getItem('token');
    const hasUser = this.currentUser() !== null;
    return hasToken && hasUser;
  }
}
