import { Component, OnInit, OnDestroy, input, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { Observable } from 'rxjs';
import { Message, Chat } from '../../../models';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { MatDialog } from '@angular/material/dialog';
import { AddMembersDialogComponent } from './add-members-dialog.component';
import { RemoveMemberDialogComponent } from './remove-member-dialog.component';
import { GroupInfoDialogComponent } from './group-info-dialog.component';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    TimeAgoPipe
  ],
  template: `
    @if (chatId()) {
      <div class="chat-detail-container">
        <!-- Header (siempre arriba) -->
        <div class="chat-header" style="order: 1;">
          @if (currentChat && (currentChat.isGroup || currentChat.participants[0])) {
            <div class="header-left">
              <div class="avatar-container">
                <div class="avatar">
                  @if (currentChat.isGroup) {
                    {{ getGroupInitials(currentChat.groupName || '') }}
                  } @else {
                    {{ currentChat.participants[0].avatar }}
                  }
                </div>
                @if (!currentChat.isGroup && currentChat.participants[0]?.online) {
                  <span class="online-dot"></span>
                }
              </div>
              
              <div class="contact-info">
                <h2 class="contact-name">
                  @if (currentChat.isGroup) {
                    {{ currentChat.groupName }}
                  } @else {
                    {{ currentChat.participants[0].name }}
                  }
                </h2>
                <span class="contact-status">
                  @if (currentChat.isTyping) {
                    <span class="typing-status">escribiendo...</span>
                  } @else if (currentChat.participants[0]?.online) {
                    en línea
                  } @else if (currentChat.participants[0]?.lastSeen) {
                    última vez {{ currentChat.participants[0].lastSeen | timeAgo }}
                  }
                </span>
              </div>
            </div>

            <div class="header-actions">
              <button mat-icon-button aria-label="Buscar">
                <mat-icon>search</mat-icon>
              </button>
              <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Más opciones">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                @if (currentChat && currentChat.isGroup) {
                  <button mat-menu-item (click)="openGroupInfo()">
                    <mat-icon>info</mat-icon>
                    <span>Info del grupo</span>
                  </button>
                  @if (currentChat.role === 'admin') {
                    <button mat-menu-item (click)="addGroupMembers()">
                      <mat-icon>person_add</mat-icon>
                      <span>Agregar participantes</span>
                    </button>
                    <button mat-menu-item (click)="removeGroupMember()">
                      <mat-icon>person_remove</mat-icon>
                      <span>Eliminar participante</span>
                    </button>
                  }
                } @else {
                  <button mat-menu-item>
                    <mat-icon>info</mat-icon>
                    <span>Info del contacto</span>
                  </button>
                }
                <button mat-menu-item>
                  <mat-icon>volume_off</mat-icon>
                  <span>Silenciar notificaciones</span>
                </button>
                <button mat-menu-item>
                  <mat-icon>wallpaper</mat-icon>
                  <span>Fondo de pantalla</span>
                </button>
              </mat-menu>
            </div>
          }
        </div>

        <!-- Messages Area (en el medio) -->
        <div class="messages-area" #messagesContainer (scroll)="onScroll()" style="order: 2;">
          <div class="messages-wrapper">
            @for (message of messages$ | async; track message.id) {
              @if (message.type === 'system') {
                <div class="system-message">
                  <span>{{ getSystemMessage(message) }}</span>
                </div>
              } @else {
                <div class="message-row" [class.own]="message.senderId === currentUserId">
                  @if (currentChat && currentChat.isGroup && message.senderId !== currentUserId) {
                    <div class="sender-info">
                      <div class="sender-avatar">{{ message.senderAvatar }}</div>
                    </div>
                  }
                  <div class="message-bubble" [class.outgoing]="message.senderId === currentUserId" [class.group-message]="currentChat && currentChat.isGroup && message.senderId !== currentUserId">
                    @if (currentChat && currentChat.isGroup && message.senderId !== currentUserId) {
                      <div class="sender-name">{{ message.senderName }}</div>
                    }
                    <div class="message-content">
                      <span class="message-text">{{ message.content }}</span>
                    </div>
                    <div class="message-footer">
                      <span class="message-time">{{ message.timestamp | date:'shortTime' }}</span>
                      @if (message.senderId === currentUserId) {
                        <span class="message-status">
                          @switch (message.status) {
                            @case ('sent') {
                              <mat-icon class="status-icon">done</mat-icon>
                            }
                            @case ('delivered') {
                              <mat-icon class="status-icon">done_all</mat-icon>
                            }
                            @case ('read') {
                              <mat-icon class="status-icon read">done_all</mat-icon>
                            }
                          }
                        </span>
                      }
                    </div>
                    <div class="message-tail" [class.outgoing]="message.senderId === currentUserId"></div>
                  </div>
                </div>
              }
            }
            
            @if (currentChat && currentChat.isTyping) {
              <div class="message-row">
                <div class="message-bubble typing-bubble">
                  <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Emoji Picker -->
        @if (showEmojiPicker) {
          <div class="emoji-picker">
            <div class="emoji-header">
              <span class="emoji-title">Emojis</span>
              <button class="emoji-close" (click)="toggleEmojiPicker()">×</button>
            </div>
            <div class="emoji-categories">
              @for (category of emojiCategories; track category.name; let i = $index) {
                <button 
                  class="category-btn" 
                  [class.active]="selectedCategory === i"
                  (click)="selectedCategory = i">
                  {{ category.icon }}
                </button>
              }
            </div>
            <div class="emoji-grid">
              @for (emoji of emojiCategories[selectedCategory].emojis; track emoji) {
                <button class="emoji-btn" (click)="selectEmoji(emoji)">{{ emoji }}</button>
              }
            </div>
          </div>
        }

        <!-- Input Area (siempre abajo) -->
        @if (currentChat && currentChat.removed) {
          <div class="input-area-blocked" style="order: 3; position: sticky; bottom: 0; z-index: 10;">
            <div class="blocked-message">
              <mat-icon>block</mat-icon>
              <span>Ya no eres miembro de este grupo</span>
            </div>
          </div>
        } @else {
          <div class="input-area" style="order: 3; position: sticky; bottom: 0; z-index: 10;">
            <button mat-icon-button class="action-button" aria-label="Emoji" (click)="toggleEmojiPicker()">
              <mat-icon>sentiment_satisfied_alt</mat-icon>
            </button>
            
            <button mat-icon-button class="action-button" aria-label="Adjuntar">
              <mat-icon>attach_file</mat-icon>
            </button>

            <div class="input-wrapper">
              <input 
                type="text"
                class="message-input"
                placeholder="Escribe un mensaje aquí"
                [(ngModel)]="newMessage"
                (keyup.enter)="sendMessage()"
                aria-label="Escribe un mensaje">
            </div>

            @if (newMessage.trim()) {
              <button mat-icon-button class="send-button" (click)="sendMessage()" aria-label="Enviar">
                <mat-icon>send</mat-icon>
              </button>
            } @else {
              <button mat-icon-button class="action-button" aria-label="Mensaje de voz">
                <mat-icon>mic</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    } @else {
      <div class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">
            <svg viewBox="0 0 303 172" width="360" height="205">
              <path fill="#DFE5E7" d="M229.5 101.5c0 28.995-23.505 52.5-52.5 52.5s-52.5-23.505-52.5-52.5S147.005 49 176 49s53.5 23.505 53.5 52.5z"></path>
              <path fill="#FFF" d="M176 154c-28.995 0-52.5-23.505-52.5-52.5S147.005 49 176 49s52.5 23.505 52.5 52.5-23.505 52.5-52.5 52.5zm0-103c-27.89 0-50.5 22.61-50.5 50.5S148.11 152 176 152s50.5-22.61 50.5-50.5S203.89 51 176 51z"></path>
              <path fill="#DFE5E7" d="M176 138.5c-20.678 0-37.5-16.822-37.5-37.5S155.322 63.5 176 63.5s37.5 16.822 37.5 37.5-16.822 37.5-37.5 37.5z"></path>
            </svg>
          </div>
          <h2>WhatsApp Web</h2>
          <p>Envía y recibe mensajes sin mantener tu teléfono conectado a internet.</p>
          <p class="encryption-note">🔒 Tus mensajes personales están protegidos con cifrado de extremo a extremo</p>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Container */
    .chat-detail-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #efeae2;
      position: relative;
      overflow: hidden;
    }

    /* Header */
    .chat-header {
      background: #f0f2f5;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-left: 1px solid #d1d7db;
      min-height: 60px;
      height: 60px;
      flex-shrink: 0;
      flex-grow: 0;
      z-index: 2;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #dfe5e7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      user-select: none;
    }

    .online-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      background: #00a884;
      border: 2px solid #f0f2f5;
      border-radius: 50%;
    }

    .contact-info {
      flex: 1;
      min-width: 0;
      cursor: pointer;
    }

    .contact-name {
      font-size: 16px;
      font-weight: 400;
      color: #111b21;
      margin: 0 0 2px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .contact-status {
      font-size: 13px;
      color: #667781;
      display: block;
    }

    .typing-status {
      color: #00a884;
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

    /* Messages Area */
    .messages-area {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoTWFjaW50b3NoKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFMTZCRDY3REIzRjAxMUUyQUQzREIxQzRENUFFNUM5NiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFMTZCRDY3RUIzRjAxMUUyQUQzREIxQzRENUFFNUM5NiI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkUxNkJENjdCQjNGMDExRTJBRDNEQjFDNEQ1QUU1Qzk2IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkUxNkJENjdDQjNGMDExRTJBRDNEQjFDNEQ1QUU1Qzk2Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+IVqe9AAAABtJREFUeNpiYGBgOAMEAAYGBgYoA+hCAwMDQIABAA8AAgSXjw8FAAAAAElFTkSuQmCC');
      background-color: #efeae2;
      padding: 20px 8%;
      min-height: 0;
    }

    .messages-area::-webkit-scrollbar {
      width: 6px;
    }

    .messages-area::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    .messages-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Message Row */
    .message-row {
      display: flex;
      align-items: flex-end;
      margin-bottom: 2px;
      gap: 8px;
    }

    .message-row.own {
      justify-content: flex-end;
    }

    .sender-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 4px;
    }

    .sender-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
    }

    .sender-name {
      font-size: 12px;
      font-weight: 500;
      color: #00a884;
      margin-bottom: 4px;
    }

    /* Message Bubble */
    .message-bubble {
      position: relative;
      max-width: 65%;
      background: #ffffff;
      border-radius: 8px;
      padding: 6px 7px 8px 9px;
      box-shadow: 0 1px 0.5px rgba(0, 0, 0, 0.13);
    }

    .message-bubble.outgoing {
      background: #d9fdd3;
    }

    .message-bubble.group-message {
      background: #ffffff;
    }

    .message-content {
      word-wrap: break-word;
      word-break: break-word;
    }

    .message-text {
      font-size: 14.2px;
      line-height: 19px;
      color: #111b21;
      display: inline;
    }

    .message-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 4px;
      float: right;
      margin-left: 8px;
    }

    .message-time {
      font-size: 11px;
      color: #667781;
      line-height: 15px;
    }

    .message-status {
      display: flex;
      align-items: center;
    }

    .status-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #667781;
    }

    .status-icon.read {
      color: #53bdeb;
    }

    /* Message Tail */
    .message-tail {
      position: absolute;
      top: 0;
      width: 8px;
      height: 13px;
    }

    .message-tail:not(.outgoing) {
      left: -8px;
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSIxMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMS41MzMgMTMuMDk0QzguMjc4IDguMzU4IDguMjc4IDguMzU4IDguMjc4IDguMzU4bC0uMDg2LS4wNDhzLS4wMDItLjAwMS0uMDAzLS4wMDJjLS4wMDItLjAwMi0uMDA1LS4wMDUtLjAwOS0uMDA4LS4wMDQtLjAwNC0uMDA5LS4wMDktLjAxNS0uMDE1LS4wMTItLjAxMi0uMDI3LS4wMjctLjA0Ni0uMDQ2LS4wMzgtLjAzOC0uMDg4LS4wODgtLjE1LS4xNS0uMTI0LS4xMjQtLjI4OC0uMjg4LS40ODgtLjQ4OC0uNC0uNC0uOTI4LS45MjgtMS41NTItMS41NTItMS4yNDgtMS4yNDgtMi44OTYtMi44OTYtNC44OTYtNC44OTZDLjU3NiAwIDAgMCAwIDB2MTMuMDk0aDEuNTMzeiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==') no-repeat;
    }

    .message-tail.outgoing {
      right: -8px;
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSIxMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNi40NjcgMTMuMDk0Qy0uMjc4IDguMzU4LS4yNzggOC4zNTgtLjI3OCA4LjM1OGwuMDg2LS4wNDhzLjAwMi0uMDAxLjAwMy0uMDAyYy4wMDItLjAwMi4wMDUtLjAwNS4wMDktLjAwOC4wMDQtLjAwNC4wMDktLjAwOS4wMTUtLjAxNS4wMTItLjAxMi4wMjctLjAyNy4wNDYtLjA0Ni4wMzgtLjAzOC4wODgtLjA4OC4xNS0uMTUuMTI0LS4xMjQuMjg4LS4yODguNDg4LS40ODguNC0uNC45MjgtLjkyOCAxLjU1Mi0xLjU1MiAxLjI0OC0xLjI0OCAyLjg5Ni0yLjg5NiA0Ljg5Ni00Ljg5NkM3LjQyNCAwIDggMCA4IDB2MTMuMDk0SDYuNDY3eiIgZmlsbD0iI2Q5ZmRkMyIvPjwvc3ZnPg==') no-repeat;
    }

    /* Typing Bubble */
    .typing-bubble {
      background: #ffffff;
      padding: 10px 12px;
    }

    .typing-animation {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .typing-animation span {
      width: 8px;
      height: 8px;
      background: #90949c;
      border-radius: 50%;
      animation: typing-bounce 1.4s infinite;
    }

    .typing-animation span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-animation span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing-bounce {
      0%, 60%, 100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-8px);
      }
    }

    /* Emoji Picker */
    .emoji-picker {
      position: absolute;
      bottom: 72px;
      left: 16px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 100;
      width: 340px;
      animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .emoji-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #e9edef;
    }

    .emoji-title {
      font-size: 14px;
      font-weight: 500;
      color: #111b21;
    }

    .emoji-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #667781;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }

    .emoji-close:hover {
      background: #f0f2f5;
    }

    .emoji-categories {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
      border-bottom: 1px solid #e9edef;
      overflow-x: auto;
      scroll-behavior: smooth;
    }

    .emoji-categories::-webkit-scrollbar {
      height: 2px;
    }

    .emoji-categories::-webkit-scrollbar-track {
      background: transparent;
    }

    .emoji-categories::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.06);
      border-radius: 2px;
    }

    .emoji-categories::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .category-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.15s;
      opacity: 0.6;
    }

    .category-btn:hover {
      background: #f0f2f5;
      opacity: 1;
    }

    .category-btn.active {
      background: #e7f8f3;
      opacity: 1;
    }

    .emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 2px;
      padding: 12px;
      max-height: 280px;
      overflow-y: auto;
      scroll-behavior: smooth;
    }

    .emoji-grid::-webkit-scrollbar {
      width: 4px;
    }

    .emoji-grid::-webkit-scrollbar-track {
      background: transparent;
    }

    .emoji-grid::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .emoji-grid::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.15);
    }

    .emoji-btn {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .emoji-btn:hover {
      background: #f0f2f5;
      transform: scale(1.2);
    }

    .emoji-btn:active {
      transform: scale(1.1);
    }

    /* Input Area */
    .input-area {
      background: #f0f2f5;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 62px;
      height: 62px;
      flex-shrink: 0;
      flex-grow: 0;
      z-index: 2;
      border-top: 1px solid #e9edef;
    }

    .input-area-blocked {
      background: #f0f2f5;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 62px;
      height: 62px;
      flex-shrink: 0;
      flex-grow: 0;
      z-index: 2;
      border-top: 1px solid #e9edef;
    }

    .blocked-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #667781;
      font-size: 14px;
    }

    .blocked-message mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .action-button {
      color: #54656f;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 9px 12px;
    }

    .message-input {
      width: 100%;
      border: none;
      outline: none;
      font-size: 15px;
      color: #111b21;
      font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
      background: transparent;
    }

    .message-input::placeholder {
      color: #667781;
    }

    .send-button {
      color: #00a884;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
    }

    /* Empty State */
    .empty-state {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f2f5;
      border-bottom: 6px solid #00a884;
    }

    .empty-content {
      text-align: center;
      max-width: 560px;
      padding: 40px;
    }

    .empty-icon {
      margin-bottom: 32px;
      opacity: 0.6;
    }

    .empty-icon svg {
      display: block;
      margin: 0 auto;
    }

    .empty-content h2 {
      font-size: 32px;
      font-weight: 300;
      color: #41525d;
      margin: 0 0 16px 0;
    }

    .empty-content p {
      font-size: 14px;
      color: #667781;
      line-height: 20px;
      margin: 0 0 12px 0;
    }

    .encryption-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
      font-size: 13px;
    }

    /* System Message */
    .system-message {
      display: flex;
      justify-content: center;
      margin: 12px 0;
    }

    .system-message span {
      background: rgba(0, 0, 0, 0.05);
      color: #667781;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      text-align: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .messages-area {
        padding: 20px 5%;
      }

      .message-bubble {
        max-width: 80%;
      }
    }
  `]
})
export class ChatDetailComponent implements OnInit, AfterViewChecked, OnDestroy {
  chatId = input<string>('');
  
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages$!: Observable<Message[]>;
  currentChat: Chat | null = null;
  newMessage = '';
  currentUserId = '';
  private shouldScrollToBottom = false;
  private isLoadingMore = false;
  showEmojiPicker = false;
  emojiCategories = [
    { name: 'Frecuentes', icon: '🕒', emojis: ['😂', '❤️', '😍', '👍', '😊', '😘', '😎', '🎉'] },
    { name: 'Emociones', icon: '😀', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨'] },
    { name: 'Gestos', icon: '👍', emojis: ['👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '🤙', '👊', '✊', '🤛', '🤜', '👋', '🤚', '👆', '👇', '👈', '👉', '💆', '💇', '💅', '🤳', '💃', '🕺'] },
    { name: 'Corazones', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'] },
    { name: 'Celebración', icon: '🎉', emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '✨', '💫', '💯', '🔥', '🎂', '🍰', '🥳', '🎆', '🎇', '✨', '🎈', '🎊', '🎍', '🎏', '🎐', '🎀', '🎁'] },
    { name: 'Objetos', icon: '⚽', emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🎸', '🎹', '🎺', '🎻', '🥁', '🎷', '🎬', '🎭', '🎮', '🎯', '🎲', '🎰', '🎳', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓'] }
  ];
  selectedCategory = 0;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private wsService: WebSocketService,
    private dialog: MatDialog
  ) {
    effect(() => {
      const id = this.chatId();
      if (id) {
        this.currentChat = this.chatService.chats$.value.find(c => c.id === id) || null;
        this.chatService.setCurrentChat(id);
        
        if (!this.chatService.hasLoadedMessages(id)) {
          this.chatService.getMessages(id).subscribe();
        }
        this.shouldScrollToBottom = true;
      }
    });
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.currentUserId = user?.id || '';
    this.messages$ = this.chatService.messages$;
    
    // Suscribirse a cambios en chats para actualizar currentChat
    this.chatService.chats$.subscribe(chats => {
      if (this.chatId()) {
        this.currentChat = chats.find(c => c.id === this.chatId()) || null;
      }
    });
    
    this.wsService.messages$.subscribe(data => {
      if (data?.type === 'message') {
        const messageData = data.data;
        
        const tempMessage: Message = {
          id: messageData.messageId || messageData.id || `msg_${Date.now()}`,
          chatId: messageData.chatId,
          senderId: messageData.senderId,
          content: messageData.content,
          timestamp: messageData.timestamp,
          status: 'sent',
          senderName: messageData.senderName,
          senderAvatar: messageData.senderAvatar,
          type: messageData.type,
          systemAction: messageData.systemAction,
          affectedUserId: messageData.affectedUserId,
          affectedUserName: messageData.affectedUserName
        };
        
        this.chatService.addMessageLocally(tempMessage);
        
        if (messageData.chatId === this.chatId()) {
          this.shouldScrollToBottom = true;
        }
      }
    });
  }

  ngOnDestroy(): void {
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadMessages(chatId: string): void {
    this.chatService.setCurrentChat(chatId);
    
    if (!this.chatService.hasLoadedMessages(chatId)) {
      this.chatService.getMessages(chatId).subscribe();
    }
  }

  onScroll(): void {
    const element = this.messagesContainer?.nativeElement;
    if (!element || this.isLoadingMore) return;

    if (element.scrollTop === 0 && this.chatService.hasMoreMessages(this.chatId())) {
      this.isLoadingMore = true;
      const previousHeight = element.scrollHeight;
      
      this.chatService.getMessages(this.chatId(), true).subscribe(() => {
        this.isLoadingMore = false;
        setTimeout(() => {
          element.scrollTop = element.scrollHeight - previousHeight;
        }, 0);
      });
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentChat || this.currentChat.removed) return;

    const message = this.newMessage;
    this.newMessage = '';
    
    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      chatId: this.chatId(),
      senderId: this.currentUserId,
      content: message,
      timestamp: new Date(),
      status: 'sent'
    };
    
    this.chatService.addMessageLocally(tempMessage);
    this.shouldScrollToBottom = true;
    
    if (this.currentChat.isGroup) {
      this.wsService.sendMessage('', message, this.currentUserId, this.chatId(), true);
    } else {
      const recipientId = this.currentChat.participants[0].id;
      this.wsService.sendMessage(recipientId, message, this.currentUserId);
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch(err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  getGroupInitials(groupName: string): string {
    return groupName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  selectEmoji(emoji: string): void {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
  }

  addGroupMembers(): void {
    if (!this.currentChat?.isGroup) return;

    const dialogRef = this.dialog.open(AddMembersDialogComponent, {
      width: '500px',
      data: {
        groupId: this.chatId(),
        existingMembers: this.currentChat.participants?.map(p => p.id) || []
      }
    });

    dialogRef.afterClosed().subscribe(memberIds => {
      if (memberIds && memberIds.length > 0) {
        this.chatService.addGroupMembers(this.chatId(), memberIds).subscribe({
          next: () => {
            this.chatService.getMessages(this.chatId()).subscribe();
          },
          error: (err) => console.error('Error adding members:', err)
        });
      }
    });
  }

  removeGroupMember(): void {
    if (!this.currentChat?.isGroup) return;

    const members = this.currentChat.participants.filter(p => p.id !== this.currentUserId);
    
    if (members.length === 0) {
      alert('No hay otros miembros para eliminar.');
      return;
    }

    const dialogRef = this.dialog.open(RemoveMemberDialogComponent, {
      width: '500px',
      data: { members }
    });

    dialogRef.afterClosed().subscribe(memberId => {
      if (memberId) {
        this.chatService.removeGroupMember(this.chatId(), memberId).subscribe({
          next: () => {
            this.chatService.getMessages(this.chatId()).subscribe();
          },
          error: (err) => console.error('Error removing member:', err)
        });
      }
    });
  }

  openGroupInfo(): void {
    if (!this.currentChat?.isGroup) return;

    const dialogRef = this.dialog.open(GroupInfoDialogComponent, {
      width: '600px',
      data: { chat: this.currentChat }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.reload || (result && Object.keys(result).length > 0 && !result.reload)) {
        if (!result.reload) {
          this.chatService.updateGroupInfo(this.chatId(), result.name, result.description).subscribe({
            error: (err) => console.error('Error updating group info:', err)
          });
        }
      }
    });
  }

  getSystemMessage(message: Message): string {
    if (!message.systemAction) return '';
    
    switch (message.systemAction) {
      case 'group_created':
        return `${message.senderName} creó el grupo`;
      case 'member_added':
        return `${message.senderName} agregó a ${message.affectedUserName}`;
      case 'member_removed':
        return `${message.senderName} eliminó a ${message.affectedUserName}`;
      case 'admin_promoted':
        return `${message.senderName} nombró a ${message.affectedUserName} administrador`;
      case 'admin_demoted':
        return `${message.senderName} quitó a ${message.affectedUserName} como administrador`;
      default:
        return '';
    }
  }
}
