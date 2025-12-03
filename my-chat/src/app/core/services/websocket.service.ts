import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new BehaviorSubject<any>(null);
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: any = null;

  messages$ = this.messageSubject.asObservable();
  connected$ = this.connectedSubject.asObservable();

  connect(userId: string): void {
    // Cerrar conexión existente si hay una
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        console.log('⚠️ WebSocket ya conectado, ignorando nueva conexión');
        return;
      }
      if (this.socket.readyState === WebSocket.CONNECTING) {
        console.log('⚠️ WebSocket conectando, ignorando nueva conexión');
        return;
      }
      // Cerrar conexión en estado CLOSING o CLOSED
      console.log('🗑️ Cerrando conexión anterior antes de crear nueva');
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }

    const wsUrl = `${environment.wsUrl}?userId=${userId}`;
    console.log('🔗 Intentando conectar WebSocket...');
    console.log('📍 URL:', wsUrl);
    console.log('👤 UserId:', userId);
    
    try {
      this.socket = new WebSocket(wsUrl);
    } catch (error) {
      console.error('❌ Error creando WebSocket:', error);
      return;
    }

    this.socket.onopen = () => {
      console.log('✅ WebSocket CONECTADO exitosamente');
      console.log('👤 Usuario:', userId);
      console.log('🔗 ReadyState:', this.socket?.readyState);
      this.connectedSubject.next(true);
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje recibido:', data);
      this.messageSubject.next(data);
    };

    this.socket.onerror = (error: Event) => {
      console.error('❌ WebSocket ERROR');
      console.error('Error event:', error);
      console.error('ReadyState:', this.socket?.readyState);
      console.error('URL:', wsUrl);
    };

    this.socket.onclose = (event) => {
      console.log('🔌 WebSocket CERRADO');
      console.log('Código:', event.code);
      console.log('Razón:', event.reason || 'Sin razón especificada');
      console.log('Clean close:', event.wasClean);
      this.connectedSubject.next(false);
      this.socket = null;
    };
  }

  sendMessage(recipientId: string, content: string, senderId: string, chatId?: string, isGroup?: boolean): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message = {
        action: 'sendMessage',
        recipientId,
        content,
        senderId,
        chatId,
        isGroup
      };
      console.log('📤 Enviando mensaje:', message);
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('❌ WebSocket no conectado. Estado:', this.socket?.readyState);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close(1000, 'User logout');
      this.socket = null;
      this.connectedSubject.next(false);
      this.reconnectAttempts = 0;
      console.log('WebSocket cerrado por logout');
    }
  }
}
