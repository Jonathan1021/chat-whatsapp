import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Chat } from '../../../models';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-group-info-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Información del grupo</h2>
    <mat-dialog-content>
      <div class="group-info">
        <div class="group-header">
          <div class="group-avatar">{{ getGroupInitials() }}</div>
          @if (isEditingName) {
            <mat-form-field class="name-field">
              <input matInput [(ngModel)]="groupName" maxlength="50">
            </mat-form-field>
          } @else {
            <h3>{{ groupName }}</h3>
            @if (isAdmin) {
              <button mat-icon-button class="edit-name-btn" (click)="isEditingName = true">
                <mat-icon>edit</mat-icon>
              </button>
            }
          }
        </div>

        <div class="info-section">
          <div class="section-title">
            <mat-icon>description</mat-icon>
            <span>Descripción</span>
          </div>
          @if (isEditingDesc) {
            <mat-form-field class="full-width">
              <textarea 
                matInput 
                [(ngModel)]="description" 
                placeholder="Agrega una descripción del grupo"
                rows="3"
                maxlength="200"></textarea>
              <mat-hint align="end">{{ description.length }}/200</mat-hint>
            </mat-form-field>
          } @else {
            <p class="description-text">{{ description || 'Sin descripción' }}</p>
            @if (isAdmin) {
              <button mat-button color="primary" (click)="isEditingDesc = true">
                <mat-icon>edit</mat-icon>
                Editar descripción
              </button>
            }
          }
        </div>

        <div class="info-section">
          <div class="section-title">
            <mat-icon>group</mat-icon>
            <span>{{ data.chat.participants.length + 1 }} participantes</span>
          </div>
          <div class="members-list">
            @for (member of data.chat.participants; track member.id) {
              <div class="member-item">
                <div class="member-avatar">{{ member.avatar }}</div>
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  @if (isUserAdmin(member.id)) {
                    <span class="admin-badge">Admin</span>
                  } @else if (isAdmin) {
                    <button mat-icon-button class="promote-btn" (click)="promoteToAdmin(member.id)" matTooltip="Hacer administrador">
                      <mat-icon>admin_panel_settings</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (isEditingName || isEditingDesc) {
        <button mat-button (click)="cancelEdit()">Cancelar</button>
        <button mat-raised-button color="primary" (click)="saveChanges()">Guardar</button>
      } @else {
        <button mat-button (click)="dialogRef.close()">Cerrar</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      max-height: 600px;
    }

    .group-info {
      padding: 16px 0;
    }

    .group-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .group-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 500;
    }

    .group-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .edit-name-btn {
      width: 32px;
      height: 32px;
      color: #00a884;
    }

    .edit-name-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .name-field {
      width: 100%;
      font-size: 20px;
    }

    .info-section {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e9edef;
    }

    .info-section:last-child {
      border-bottom: none;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #00a884;
      font-weight: 500;
    }

    .section-title mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .description-text {
      color: #667781;
      margin: 8px 0;
      white-space: pre-wrap;
    }

    .full-width {
      width: 100%;
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
    }

    .member-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .member-name {
      flex: 1;
    }

    .admin-badge {
      background: #00a884;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 500;
    }

    .promote-btn {
      width: 32px;
      height: 32px;
      color: #00a884;
    }

    .promote-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .member-avatar {
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
    }
  `]
})
export class GroupInfoDialogComponent implements OnInit {
  groupName: string = '';
  description: string = '';
  isEditingName: boolean = false;
  isEditingDesc: boolean = false;
  isAdmin: boolean = false;
  private originalName: string = '';
  private originalDescription: string = '';

  constructor(
    public dialogRef: MatDialogRef<GroupInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { chat: Chat },
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.groupName = this.data.chat.groupName || '';
    this.description = this.data.chat.groupDescription || '';
    this.originalName = this.groupName;
    this.originalDescription = this.description;
    this.isAdmin = this.data.chat.role === 'admin';
  }

  getGroupInitials(): string {
    return (this.data.chat.groupName || '')
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  cancelEdit(): void {
    this.groupName = this.originalName;
    this.description = this.originalDescription;
    this.isEditingName = false;
    this.isEditingDesc = false;
  }

  saveChanges(): void {
    if (!this.isAdmin) return;
    
    const changes: any = {};
    if (this.groupName !== this.originalName) {
      changes.name = this.groupName;
    }
    if (this.description !== this.originalDescription) {
      changes.description = this.description;
    }
    this.dialogRef.close(changes);
  }

  isUserAdmin(userId: string): boolean {
    return this.data.chat.admins?.includes(userId) || false;
  }

  promoteToAdmin(memberId: string): void {
    if (!this.isAdmin) return;
    
    this.chatService.promoteToAdmin(this.data.chat.id, memberId).subscribe({
      next: () => {
        this.dialogRef.close({ reload: true });
      },
      error: (err) => console.error('Error promoting to admin:', err)
    });
  }
}
