export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  online: boolean;
  lastSeen?: Date;
}
