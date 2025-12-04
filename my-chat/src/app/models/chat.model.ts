import { Message } from './message.model';
import { User } from './user.model';

export interface Chat {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping: boolean;
  isGroup?: boolean;
  groupName?: string;
  removed?: boolean;
}
