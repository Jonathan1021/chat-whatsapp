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
    const stored = localStorage.getItem('currentUser');
    if (stored) this.currentUser.set(JSON.parse(stored));
  }

  /**
   * Login simulado
   * PRODUCCIÓN: Conectar con backend real (JWT, AWS Cognito, Auth0)
   * Ejemplo: return this.http.post<{token: string, user: User}>('/api/auth/login', {email, password})
   */
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        const user: User = {
          id: response.userId || '1',
          name: response.name || email,
          email,
          avatar: '👨',
          online: true
        };
        this.currentUser.set(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }
}
