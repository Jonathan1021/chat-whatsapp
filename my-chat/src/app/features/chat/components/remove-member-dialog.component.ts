import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-remove-member-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Eliminar participante</h2>
    <mat-dialog-content>
      <mat-list>
        @for (member of data.members; track member.id) {
          <mat-list-item (click)="selectMember(member.id)">
            <div class="member-item">
              <div class="member-avatar">{{ member.avatar }}</div>
              <span class="member-name">{{ member.name }}</span>
              <mat-icon class="remove-icon">remove_circle_outline</mat-icon>
            </div>
          </mat-list-item>
        }
      </mat-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
      max-height: 400px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 8px 0;
      cursor: pointer;
    }

    .member-item:hover {
      background: #f5f5f5;
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

    .member-name {
      flex: 1;
    }

    .remove-icon {
      color: #f44336;
    }
  `]
})
export class RemoveMemberDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<RemoveMemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { members: any[] }
  ) {}

  selectMember(memberId: string): void {
    this.dialogRef.close(memberId);
  }
}
