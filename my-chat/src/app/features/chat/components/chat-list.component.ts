import { Component, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { Observable } from 'rxjs';
import { Chat } from '../../../models';
import { ChatService } from '../../../core/services/chat.service';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatBadgeModule,
    TimeAgoPipe
  ],
  template: `
    <div class="chat-list-container">
      <!-- Search Bar -->
      <div class="search-container">
        <div class="search-wrapper">
          <mat-icon class="search-icon">search</mat-icon>
          <input 
            type="text" 
            class="search-input" 
            placeholder="Buscar o iniciar un chat nuevo"
            [(ngModel)]="searchTerm"
            aria-label="Buscar conversación">
        </div>
        <button mat-icon-button class="filter-button" aria-label="Filtrar chats">
          <mat-icon>filter_list</mat-icon>
        </button>
      </div>

      <!-- Chats List -->
      <div class="chats-list" role="list">
        @for (chat of chats$ | async; track chat.id) {
          <div 
            class="chat-item"
            [class.active]="chat.id === selectedChatId"
            (click)="onChatClick(chat.id)"
            role="listitem"
            tabindex="0">
            
            <!-- Avatar -->
            <div class="avatar-container">
              <div class="avatar">{{ chat.participants[0].avatar }}</div>
              @if (chat.participants[0].online) {
                <span class="online-indicator"></span>
              }
            </div>

            <!-- Chat Info -->
            <div class="chat-content">
              <div class="chat-header">
                <h3 class="contact-name">{{ chat.participants[0].name }}</h3>
                <span class="message-time">{{ chat.lastMessage?.timestamp | timeAgo }}</span>
              </div>
              
              <div class="chat-preview">
                <div class="last-message">
                  @if (chat.isTyping) {
                    <span class="typing-indicator">
                      <span class="typing-text">escribiendo</span>
                      <span class="typing-dots">
                        <span></span><span></span><span></span>
                      </span>
                    </span>
                  } @else {
                    <span class="message-text">{{ chat.lastMessage?.content }}</span>
                  }
                </div>
                
                @if (chat.unreadCount > 0) {
                  <span class="unread-badge">{{ chat.unreadCount }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .chat-list-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    /* Search Bar */
    .search-container {
      padding: 8px 16px;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: white;
      border-radius: 8px;
      padding: 8px 12px;
      gap: 12px;
    }

    .search-icon {
      color: #8696a0;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      color: #111b21;
      font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
      background: transparent;
    }

    .search-input::placeholder {
      color: #8696a0;
    }

    .filter-button {
      width: 40px;
      height: 40px;
      color: #54656f;
    }

    /* Chats List */
    .chats-list {
      flex: 1;
      overflow-y: auto;
      background: white;
    }

    .chats-list::-webkit-scrollbar {
      width: 6px;
    }

    .chats-list::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    /* Chat Item */
    .chat-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #e9edef;
      transition: background-color 0.15s ease;
      gap: 12px;
    }

    .chat-item:hover {
      background: #f5f6f6;
    }

    .chat-item.active {
      background: #f0f2f5;
    }

    .chat-item:focus {
      outline: none;
      background: #f5f6f6;
    }

    /* Avatar */
    .avatar-container {
      position: relative;
      flex-shrink: 0;
    }

    .avatar {
      width: 49px;
      height: 49px;
      border-radius: 50%;
      background: #dfe5e7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      user-select: none;
    }

    .online-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 12px;
      height: 12px;
      background: #00a884;
      border: 2px solid white;
      border-radius: 50%;
    }

    /* Chat Content */
    .chat-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }

    .contact-name {
      font-size: 16px;
      font-weight: 400;
      color: #111b21;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .message-time {
      font-size: 12px;
      color: #667781;
      flex-shrink: 0;
    }

    /* Chat Preview */
    .chat-preview {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .last-message {
      flex: 1;
      min-width: 0;
    }

    .message-text {
      font-size: 14px;
      color: #667781;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Typing Indicator */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #00a884;
    }

    .typing-text {
      font-size: 14px;
      font-style: italic;
    }

    .typing-dots {
      display: flex;
      gap: 2px;
      align-items: center;
    }

    .typing-dots span {
      width: 3px;
      height: 3px;
      background: #00a884;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }

    .typing-dots span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-dots span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.7;
      }
      30% {
        transform: translateY(-4px);
        opacity: 1;
      }
    }

    /* Unread Badge */
    .unread-badge {
      background: #00a884;
      color: white;
      border-radius: 12px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 500;
      flex-shrink: 0;
    }

    /* Active chat unread badge */
    .chat-item.active .unread-badge {
      background: #06cf9c;
    }
  `]
})
export class ChatListComponent implements OnInit {
  chats$!: Observable<Chat[]>;
  searchTerm = '';
  selectedChatId = '';
  
  // Output moderno de Angular
  chatSelected = output<string>();

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chats$ = this.chatService.chats$;
    this.chatService.getChats().subscribe();
  }

  onChatClick(chatId: string): void {
    this.selectedChatId = chatId;
    this.chatSelected.emit(chatId);
  }
}
