export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'system';
export type SystemMessageAction = 'member_added' | 'member_removed' | 'group_created' | 'admin_promoted' | 'admin_demoted' | 'member_left';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  senderName?: string;
  senderAvatar?: string;
  type?: MessageType;
  systemAction?: SystemMessageAction;
  affectedUserId?: string;
  affectedUserName?: string;
}
