import { Component, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatListComponent } from './components/chat-list.component';
import { ChatDetailComponent } from './components/chat-detail.component';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { ChatService } from '../../core/services/chat.service';
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
    MatProgressSpinnerModule,
    ChatListComponent,
    ChatDetailComponent
  ],
  template: `
    @if (loading()) {
      <div class="loading-container">
        <div class="loading-content">
          <div class="whatsapp-logo">
            <svg viewBox="0 0 303 172" width="200" height="120">
              <path fill="#00a884" d="M229.5 101.5c0 28.995-23.505 52.5-52.5 52.5s-52.5-23.505-52.5-52.5S147.005 49 176 49s53.5 23.505 53.5 52.5z"></path>
              <path fill="#FFF" d="M176 154c-28.995 0-52.5-23.505-52.5-52.5S147.005 49 176 49s52.5 23.505 52.5 52.5-23.505 52.5-52.5 52.5zm0-103c-27.89 0-50.5 22.61-50.5 50.5S148.11 152 176 152s50.5-22.61 50.5-50.5S203.89 51 176 51z"></path>
              <path fill="#00a884" d="M176 138.5c-20.678 0-37.5-16.822-37.5-37.5S155.322 63.5 176 63.5s37.5 16.822 37.5 37.5-16.822 37.5-37.5 37.5z"></path>
            </svg>
          </div>
          <h1 class="loading-title">WhatsApp Web</h1>
          <div class="spinner-wrapper">
            <mat-spinner diameter="40" color="accent"></mat-spinner>
          </div>
          <p class="loading-text">Cargando tus conversaciones...</p>
          <p class="loading-subtext">🔒 Cifrado de extremo a extremo</p>
        </div>
      </div>
    } @else {
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
            <button mat-icon-button aria-label="Nuevo chat" (click)="openNewChat()">
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
        <app-chat-list [activeChatId]="selectedChatId()" (chatSelected)="onChatSelected($event)"></app-chat-list>
      </div>

      <!-- Main Chat Area -->
      <div class="main-content">
        <app-chat-detail [chatId]="selectedChatId()"></app-chat-detail>
      </div>
    </div>
    }
  `,
  styles: [`
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: linear-gradient(135deg, #00a884 0%, #008069 100%);
      position: relative;
      overflow: hidden;
    }

    .loading-container::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }

    .loading-content {
      text-align: center;
      z-index: 1;
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .whatsapp-logo {
      margin-bottom: 24px;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .whatsapp-logo svg {
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
    }

    .loading-title {
      color: white;
      font-size: 32px;
      font-weight: 300;
      margin: 0 0 32px 0;
      letter-spacing: 0.5px;
    }

    .spinner-wrapper {
      margin: 0 auto 24px;
      display: flex;
      justify-content: center;
    }

    .spinner-wrapper ::ng-deep .mat-mdc-progress-spinner circle {
      stroke: white !important;
    }

    .loading-text {
      color: rgba(255, 255, 255, 0.95);
      font-size: 16px;
      margin: 0 0 12px 0;
      font-weight: 400;
    }

    .loading-subtext {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

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
export class ChatContainerComponent implements OnInit, OnDestroy {
  @ViewChild(ChatListComponent) chatListComponent!: ChatListComponent;
  
  selectedChatId = signal('');
  currentUser = signal<User | null>(null);
  loading = signal(true);
  private wsConnected = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private wsService: WebSocketService,
    private chatService: ChatService
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user?.id) {
      Promise.all([
        this.chatService.getUsers().toPromise(),
        this.chatService.getChats().toPromise()
      ]).then(([users, chats]) => {
        if (chats && chats.length === 0) {
          this.loading.set(false);
          if (!this.wsConnected) {
            this.wsConnected = true;
            this.wsService.connect(user.id);
          }
          return;
        }
        
        const messageRequests = (chats || []).map(chat => 
          this.chatService.getMessages(chat.id).toPromise().then(() => {})
        );
        
        Promise.all(messageRequests).then(() => {
          if (chats && chats.length > 0) {
            this.selectedChatId.set(chats[0].id);
          }
          this.loading.set(false);
          if (!this.wsConnected) {
            this.wsConnected = true;
            this.wsService.connect(user.id);
          }
        }).catch(() => {
          this.loading.set(false);
          if (!this.wsConnected) {
            this.wsConnected = true;
            this.wsService.connect(user.id);
          }
        });
      }).catch(() => {
        this.loading.set(false);
      });
    }
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  onChatSelected(chatId: string): void {
    this.selectedChatId.set(chatId);
  }

  openNewChat(): void {
    this.chatListComponent?.openNewChatDialog();
  }

  openNewGroup(): void {
    this.chatListComponent?.openNewGroupDialog();
  }

  logout(): void {
    this.wsService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
