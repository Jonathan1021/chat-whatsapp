import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get chats list', (done) => {
    service.getChats().subscribe(chats => {
      expect(chats).toBeTruthy();
      expect(chats.length).toBeGreaterThan(0);
      expect(chats[0].id).toBeTruthy();
      done();
    });
  });

  it('should get messages for a chat', (done) => {
    service.getMessages('1').subscribe(messages => {
      expect(messages).toBeTruthy();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].chatId).toBe('1');
      done();
    });
  });

  it('should send a message', (done) => {
    const content = 'Test message';
    
    service.sendMessage('1', content, '1').subscribe(message => {
      expect(message).toBeTruthy();
      expect(message.content).toBe(content);
      expect(message.status).toBe('sent');
      done();
    });
  });

  it('should update message status over time', (done) => {
    service.sendMessage('1', 'Test', '1').subscribe(message => {
      expect(message.status).toBe('sent');
      
      // Verificar que el estado cambia después de 1 segundo
      setTimeout(() => {
        service.messages$.subscribe(messages => {
          const sent = messages.find(m => m.id === message.id);
          expect(sent?.status).toBe('delivered');
          done();
        });
      }, 1100);
    });
  });
});
