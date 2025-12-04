import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChatService } from '../../../core/services/chat.service';

interface User {
  userId: string;
  name: string;
  email: string;
  selected?: boolean;
}

@Component({
  selector: 'app-new-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2>Nuevo grupo</h2>
        <button mat-icon-button (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        @if (loading) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        } @else {
          <div class="group-name-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre del grupo</mat-label>
              <input matInput [(ngModel)]="groupName" placeholder="Ej: Familia, Trabajo...">
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción (opcional)</mat-label>
              <textarea matInput [(ngModel)]="groupDescription" 
                        placeholder="Agrega una descripción del grupo"
                        rows="2"
                        maxlength="200"></textarea>
              <mat-hint align="end">{{ groupDescription.length }}/200</mat-hint>
            </mat-form-field>
          </div>

          <div class="members-section">
            <h3>Seleccionar miembros</h3>
            @if (users.length === 0) {
              <p class="no-users">No hay usuarios disponibles</p>
            } @else {
              <div class="users-list">
                @for (user of users; track user.userId) {
                  <div class="user-item" (click)="toggleUser(user)">
                    <mat-checkbox [checked]="user.selected" (change)="toggleUser(user)"></mat-checkbox>
                    <div class="avatar">{{ getInitials(user.name) }}</div>
                    <div class="user-info">
                      <div class="user-name">{{ user.name }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="close()">Cancelar</button>
        <button mat-raised-button class="create-btn" (click)="createGroup()" 
                [disabled]="!canCreate()">
          Crear grupo
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 500px;
      max-height: 700px;
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

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .group-name-section {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    .members-section h3 {
      font-size: 16px;
      color: #111b21;
      margin: 0 0 16px 0;
    }

    .no-users {
      text-align: center;
      color: #667781;
      padding: 20px;
    }

    .users-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .user-item {
      display: flex;
      align-items: center;
      padding: 12px;
      cursor: pointer;
      border-radius: 8px;
      gap: 12px;
      transition: background 0.15s;
    }

    .user-item:hover {
      background: #f5f6f6;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
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
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 14px;
      color: #667781;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid #e9edef;
    }

    .create-btn {
      background: #00a884 !important;
      color: white !important;
    }

    .create-btn:disabled {
      background: #e9edef !important;
      color: #8696a0 !important;
    }
  `]
})
export class NewGroupDialogComponent implements OnInit {
  users: User[] = [];
  loading = true;
  groupName = '';
  groupDescription = '';

  constructor(
    private dialogRef: MatDialogRef<NewGroupDialogComponent>,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.chatService.getUsers().subscribe({
      next: (users) => {
        this.users = users.map(u => ({ ...u, selected: false }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleUser(user: User): void {
    user.selected = !user.selected;
  }

  canCreate(): boolean {
    return this.groupName.trim().length > 0 && 
           this.users.filter(u => u.selected).length > 0;
  }

  createGroup(): void {
    if (!this.canCreate()) return;

    const selectedUserIds = this.users.filter(u => u.selected).map(u => u.userId);
    this.dialogRef.close({ 
      name: this.groupName, 
      memberIds: selectedUserIds,
      description: this.groupDescription.trim() || undefined
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
