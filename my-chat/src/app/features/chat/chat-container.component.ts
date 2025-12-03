import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { ChatListComponent } from './components/chat-list.component';
import { ChatDetailComponent } from './components/chat-detail.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../models';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    ChatListComponent,
    ChatDetailComponent
  ],
  template: `
    <div class="chat-container">
      <!-- Sidebar -->
      <div class="sidebar">
        <!-- Sidebar Header -->
        <div class="sidebar-header">
          <div class="user-info">
            <div class="user-avatar">{{ currentUser()?.avatar }}</div>
          </div>
          <div class="header-actions">
            <button mat-icon-button aria-label="Comunidades">
              <mat-icon>groups</mat-icon>
            </button>
            <button mat-icon-button aria-label="Estados">
              <mat-icon>donut_large</mat-icon>
            </button>
            <button mat-icon-button aria-label="Nuevo chat">
              <mat-icon>chat</mat-icon>
            </button>
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Menú">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item>
                <mat-icon>person</mat-icon>
                <span>Perfil</span>
              </button>
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Configuración</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Cerrar sesión</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Chat List -->
        <app-chat-list (chatSelected)="onChatSelected($event)"></app-chat-list>
      </div>

      <!-- Main Chat Area -->
      <div class="main-content">
        <app-chat-detail [chatId]="selectedChatId()"></app-chat-detail>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #f0f2f5;
    }

    /* Sidebar */
    .sidebar {
      width: 400px;
      display: flex;
      flex-direction: column;
      background: white;
      border-right: 1px solid #d1d7db;
    }

    /* Sidebar Header */
    .sidebar-header {
      background: #f0f2f5;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 60px;
    }

    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #dfe5e7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      user-select: none;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .header-actions button {
      color: #54656f;
      width: 40px;
      height: 40px;
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .sidebar {
        width: 350px;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        border-right: none;
      }

      .main-content {
        display: none;
      }

      .chat-container.chat-selected .sidebar {
        display: none;
      }

      .chat-container.chat-selected .main-content {
        display: flex;
      }
    }
  `]
})
export class ChatContainerComponent {
  selectedChatId = signal('');
  currentUser = signal<User | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUser;
  }

  onChatSelected(chatId: string): void {
    this.selectedChatId.set(chatId);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
