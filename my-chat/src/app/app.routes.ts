import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'chats',
    loadComponent: () => import('./features/chat/chat-container.component').then(m => m.ChatContainerComponent),
    canActivate: [authGuard]
  },
  {
    path: 'chats/:id',
    loadComponent: () => import('./features/chat/chat-container.component').then(m => m.ChatContainerComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
