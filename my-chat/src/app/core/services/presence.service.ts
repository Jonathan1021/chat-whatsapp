import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {
  private typingSubject = new BehaviorSubject<{ [chatId: string]: boolean }>({});
  typing$ = this.typingSubject.asObservable();

  constructor() {
    // Simular actividad de escritura aleatoria
    this.simulateTyping();
  }

  /**
   * Simular que alguien está escribiendo
   * PRODUCCIÓN: Escuchar eventos de WebSocket
   * socket.on('user-typing', ({chatId, isTyping}) => {...})
   */
  private simulateTyping(): void {
    interval(10000).subscribe(() => {
      const chatId = Math.random() > 0.5 ? '1' : '2';
      this.setTyping(chatId, true);
      setTimeout(() => this.setTyping(chatId, false), 3000);
    });
  }

  setTyping(chatId: string, isTyping: boolean): void {
    const current = this.typingSubject.value;
    this.typingSubject.next({ ...current, [chatId]: isTyping });
  }
}
