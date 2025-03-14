
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: number;
  userId: number;
  type: 'follow' | 'like' | 'comment' | 'stream';
  message: string;
  read: boolean;
  createdAt: Date;
}

class NotificationService {
  private socket: WebSocket | null = null;
  
  connect(userId: number) {
    this.socket = new WebSocket(`ws://${window.location.host}/notifications?userId=${userId}`);
    
    this.socket.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      this.showNotification(notification);
    };
  }

  private showNotification(notification: Notification) {
    toast({
      title: "New Notification",
      description: notification.message,
    });
  }
}

export const notificationService = new NotificationService();
