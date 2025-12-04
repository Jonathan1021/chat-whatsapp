import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Chat, Message, MessageStatus } from '../../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private usersCache: any[] | null = null;
  private loadedChatMessages = new Set<string>();
  private messageLastKeys = new Map<string, string | null>();
  private messagesByChat = new Map<string, Message[]>();
  private currentChatId: string = '';
  private unreadCounts = new Map<string, number>();

  chats$ = this.chatsSubject;
  messages$ = this.messagesSubject.asObservable();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCurrentUserId(): string {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user).id : '';
  }

  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/chats`).pipe(
      tap(chats => this.chatsSubject.next(chats))
    );
  }

  getMessages(chatId: string, loadMore: boolean = false): Observable<{messages: Message[], lastKey: string | null}> {
    const lastKey = loadMore ? this.messageLastKeys.get(chatId) : null;
    const params = lastKey ? `?lastKey=${lastKey}` : '';
    
    return this.http.get<{messages: Message[], lastKey: string | null}>(`${this.apiUrl}/chats/${chatId}/messages${params}`).pipe(
      tap(response => {
        const messages = Array.isArray(response) ? response : response.messages;
        const lastKeyValue = Array.isArray(response) ? null : response.lastKey;
        
        const currentMessages = loadMore ? (this.messagesByChat.get(chatId) || []) : [];
        const newMessages = [...messages, ...currentMessages];
        this.messagesByChat.set(chatId, newMessages);
        this.messageLastKeys.set(chatId, lastKeyValue);
        
        if (chatId === this.currentChatId) {
          this.messagesSubject.next(newMessages);
        }
        
        this.loadedChatMessages.add(chatId);
      })
    );
  }

  setCurrentChat(chatId: string): void {
    this.currentChatId = chatId;
    const messages = this.messagesByChat.get(chatId) || [];
    this.messagesSubject.next(messages);
    this.unreadCounts.set(chatId, 0);
    this.updateChatUnreadCount(chatId, 0);
  }

  hasLoadedMessages(chatId: string): boolean {
    return this.loadedChatMessages.has(chatId);
  }

  hasMoreMessages(chatId: string): boolean {
    return this.messageLastKeys.get(chatId) !== null;
  }

  getUsers(): Observable<any[]> {
    if (this.usersCache) {
      return new Observable(observer => {
        observer.next(this.usersCache!);
        observer.complete();
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/users`).pipe(
      tap(users => this.usersCache = users)
    );
  }

  addTemporaryChat(chatId: string, user: any): void {
    const currentChats = this.chatsSubject.value;
    const exists = currentChats.find(c => c.id === chatId);
    
    if (!exists) {
      const tempChat: Chat = {
        id: chatId,
        participants: [{
          id: user.userId,
          name: user.name,
          email: user.email,
          avatar: user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2),
          online: false
        }],
        lastMessage: undefined,
        unreadCount: 0,
        isTyping: false
      };
      this.chatsSubject.next([tempChat, ...currentChats]);
    }
  }

  addMessageLocally(message: Message): void {
    const chatMessages = this.messagesByChat.get(message.chatId) || [];
    const newMessages = [...chatMessages, message];
    this.messagesByChat.set(message.chatId, newMessages);
    
    if (message.chatId === this.currentChatId) {
      this.messagesSubject.next(newMessages);
    } else {
      const currentCount = this.unreadCounts.get(message.chatId) || 0;
      const newCount = currentCount + 1;
      this.unreadCounts.set(message.chatId, newCount);
      this.updateChatUnreadCount(message.chatId, newCount);
    }
  }

  private updateChatUnreadCount(chatId: string, count: number): void {
    const chats = this.chatsSubject.value;
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: count } : chat
    );
    this.chatsSubject.next(updatedChats);
  }

  clearMessages(): void {
    this.messagesSubject.next([]);
  }

  resetChatMessages(chatId: string): void {
    this.loadedChatMessages.delete(chatId);
    this.messageLastKeys.delete(chatId);
  }

  createGroup(name: string, memberIds: string[], description?: string): Observable<Chat> {
    return this.http.post<Chat>(`${this.apiUrl}/groups`, { name, memberIds, description }).pipe(
      tap(group => {
        const fullGroup: Chat = {
          ...group,
          participants: [],
          lastMessage: undefined,
          unreadCount: 0,
          isTyping: false
        };
        const currentChats = this.chatsSubject.value;
        this.chatsSubject.next([fullGroup, ...currentChats]);
      })
    );
  }

  addGroupMembers(groupId: string, memberIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/members`, { memberIds }).pipe(
      tap(() => this.resetChatMessages(groupId))
    );
  }

  removeGroupMember(groupId: string, memberId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}/members/${memberId}`).pipe(
      tap(() => this.resetChatMessages(groupId))
    );
  }

  updateGroupInfo(groupId: string, name?: string, description?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/groups/${groupId}/info`, { name, description });
  }

  promoteToAdmin(groupId: string, memberId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/admins/${memberId}`, {}).pipe(
      tap(() => {
        const chats = this.chatsSubject.value;
        const updatedChats = chats.map(chat => {
          if (chat.id === groupId) {
            return { ...chat, admins: [...(chat.admins || []), memberId] };
          }
          return chat;
        });
        this.chatsSubject.next(updatedChats);
      })
    );
  }

  demoteFromAdmin(groupId: string, memberId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/groups/${groupId}/admins/${memberId}`).pipe(
      tap(() => {
        const chats = this.chatsSubject.value;
        const updatedChats = chats.map(chat => {
          if (chat.id === groupId) {
            return { ...chat, admins: (chat.admins || []).filter(id => id !== memberId) };
          }
          return chat;
        });
        this.chatsSubject.next(updatedChats);
      })
    );
  }

  isUserRemovedFromGroup(chatId: string): boolean {
    const chat = this.chatsSubject.value.find(c => c.id === chatId);
    return chat?.removed || false;
  }
}
