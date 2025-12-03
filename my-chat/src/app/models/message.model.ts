export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  senderName?: string;
  senderAvatar?: string;
}
