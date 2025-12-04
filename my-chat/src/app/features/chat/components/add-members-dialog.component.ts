import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Agregar participantes</h2>
    <mat-dialog-content>
      <div class="members-list">
        @for (user of availableUsers; track user.userId) {
          <label class="member-item">
            <mat-checkbox [(ngModel)]="user.selected">
              <div class="user-info">
                <div class="user-avatar">{{ user.avatar }}</div>
                <div class="user-details">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-email">{{ user.email }}</span>
                </div>
              </div>
            </mat-checkbox>
          </label>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="addMembers()" [disabled]="!hasSelection()">
        Agregar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
      max-height: 500px;
      padding: 20px 24px;
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .member-item {
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .member-item:hover {
      background: #f5f6f6;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
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

    .user-details {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: #111b21;
    }

    .user-email {
      font-size: 12px;
      color: #667781;
    }
  `]
})
export class AddMembersDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AddMembersDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);
  private chatService = inject(ChatService);

  availableUsers: any[] = [];

  ngOnInit(): void {
    this.chatService.getUsers().subscribe(users => {
      const currentUserId = this.chatService.getCurrentUserId();
      const existingMemberIds = this.data.existingMembers || [];
      
      this.availableUsers = users
        .filter(user => user.userId !== currentUserId && !existingMemberIds.includes(user.userId))
        .map(user => ({
          ...user,
          avatar: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
          selected: false
        }));
    });
  }

  hasSelection(): boolean {
    return this.availableUsers.some(user => user.selected);
  }

  addMembers(): void {
    const selectedIds = this.availableUsers
      .filter(user => user.selected)
      .map(user => user.userId);
    
    this.dialogRef.close(selectedIds);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
