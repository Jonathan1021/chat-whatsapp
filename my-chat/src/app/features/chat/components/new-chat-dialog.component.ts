import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../../core/services/chat.service';

interface User {
  userId: string;
  name: string;
  email: string;
}

@Component({
  selector: 'app-new-chat-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Nuevo chat</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="action-buttons">
        <button mat-button class="action-btn" (click)="openGroupDialog()">
          <mat-icon>group_add</mat-icon>
          Crear grupo
        </button>
      </div>

      <div class="dialog-content">
        @if (loading) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Cargando usuarios...</p>
          </div>
        } @else if (users.length === 0) {
          <div class="empty-state">
            <mat-icon>person_off</mat-icon>
            <p>No hay usuarios disponibles</p>
          </div>
        } @else {
          <div class="users-list">
            @for (user of users; track user.userId) {
              <div class="user-item" (click)="selectUser(user)">
                <div class="avatar">{{ getInitials(user.name) }}</div>
                <div class="user-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-email">{{ user.email }}</div>
                </div>
                <mat-icon class="arrow-icon">chevron_right</mat-icon>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 400px;
      max-height: 600px;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e9edef;
      background: #00a884;
      color: white;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 500;
    }

    .dialog-header button {
      color: white;
    }

    .action-buttons {
      padding: 12px 20px;
      border-bottom: 1px solid #e9edef;
      background: #f0f2f5;
    }

    .action-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #00a884 !important;
      font-weight: 500 !important;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      min-height: 300px;
    }

    .loading, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #667781;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .users-list {
      padding: 8px 0;
    }

    .user-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      cursor: pointer;
      transition: background-color 0.15s;
      gap: 12px;
    }

    .user-item:hover {
      background: #f5f6f6;
    }

    .avatar {
      width: 49px;
      height: 49px;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 16px;
      color: #111b21;
      font-weight: 400;
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 14px;
      color: #667781;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .arrow-icon {
      color: #8696a0;
      flex-shrink: 0;
    }
  `]
})
export class NewChatDialogComponent implements OnInit {
  users: User[] = [];
  loading = true;

  constructor(
    private dialogRef: MatDialogRef<NewChatDialogComponent>,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.chatService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectUser(user: User): void {
    this.dialogRef.close(user);
  }

  close(): void {
    this.dialogRef.close();
  }

  openGroupDialog(): void {
    this.dialogRef.close({ openGroup: true });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
}
