import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Chat, Message, MessageStatus } from '../../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // BehaviorSubject para estado reactivo
  private chatsSubject = new BehaviorSubject<Chat[]>([]);
  private messagesSubject = new BehaviorSubject<Message[]>([]);

  chats$ = this.chatsSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private mockChats: Chat[] = [
    {
      id: '1',
      participants: [
        { id: '2', name: 'María García', email: 'maria@test.com', avatar: '👩', online: true }
      ],
      lastMessage: { id: '1', chatId: '1', senderId: '2', content: 'Hola! ¿Cómo estás?', timestamp: new Date(), status: 'read' },
      unreadCount: 0,
      isTyping: false
    },
    {
      id: '2',
      participants: [
        { id: '3', name: 'Carlos López', email: 'carlos@test.com', avatar: '👨‍💼', online: false, lastSeen: new Date(Date.now() - 3600000) }
      ],
      lastMessage: { id: '2', chatId: '2', senderId: '3', content: 'Nos vemos mañana', timestamp: new Date(Date.now() - 7200000), status: 'delivered' },
      unreadCount: 2,
      isTyping: false
    }
  ];

  private mockMessages: { [chatId: string]: Message[] } = {
    '1': [
      { id: '1', chatId: '1', senderId: '2', content: 'Hola! ¿Cómo estás?', timestamp: new Date(Date.now() - 3600000), status: 'read' },
      { id: '2', chatId: '1', senderId: '1', content: 'Muy bien, gracias! ¿Y tú?', timestamp: new Date(Date.now() - 3000000), status: 'read' },
      { id: '3', chatId: '1', senderId: '2', content: 'Genial! Trabajando en el proyecto', timestamp: new Date(Date.now() - 1800000), status: 'read' }
    ],
    '2': [
      { id: '4', chatId: '2', senderId: '3', content: '¿Tienes tiempo para una reunión?', timestamp: new Date(Date.now() - 7200000), status: 'delivered' },
      { id: '5', chatId: '2', senderId: '3', content: 'Nos vemos mañana', timestamp: new Date(Date.now() - 7200000), status: 'delivered' }
    ]
  };

  getChats(): Observable<Chat[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}/chats`).pipe(
      tap(chats => this.chatsSubject.next(chats.length ? chats : this.mockChats))
    );
  }

  getMessages(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/chats/${chatId}/messages`).pipe(
      tap(msgs => this.messagesSubject.next(msgs.length ? msgs : (this.mockMessages[chatId] || [])))
    );
  }

  sendMessage(chatId: string, content: string, senderId: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/chats/${chatId}/messages`, { content }).pipe(
      tap(message => {
        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, message]);
        setTimeout(() => this.updateMessageStatus(message.id, 'delivered'), 1000);
        setTimeout(() => this.updateMessageStatus(message.id, 'read'), 2000);
      })
    );
  }

  /**
   * Actualizar estado del mensaje
   */
  private updateMessageStatus(messageId: string, status: MessageStatus): void {
    const messages = this.messagesSubject.value.map(m =>
      m.id === messageId ? { ...m, status } : m
    );
    this.messagesSubject.next(messages);
  }

  /**
   * Simular que el contacto está escribiendo
   */
  setTyping(chatId: string, isTyping: boolean): void {
    const chats = this.chatsSubject.value.map(c =>
      c.id === chatId ? { ...c, isTyping } : c
    );
    this.chatsSubject.next(chats);
  }
}
