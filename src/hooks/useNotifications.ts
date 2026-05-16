// src/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface Notification {
  id: number;
  type: 'bid_outbid' | 'auction_ended' | 'auction_won' | 'payment_received' | 'new_message' | 'item_watchlist' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_auction_id?: number;
}

export const useNotifications = (userId: string | null) => {
  const { on, off, emit } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(() => {
    if (userId) {
      emit('notifications:get', { userId });
    }
  }, [userId, emit]);

  const markAsRead = useCallback((notificationId: number) => {
    emit('notification:read', { notificationId });
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [emit]);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const handleNotificationsData = (data: Notification[]) => {
      setNotifications(data);
      const unread = data.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    };

    const handleNewNotification = (data: any) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    on('notifications:data', handleNotificationsData);
    on('notification:new', handleNewNotification);

    return () => {
      off('notifications:data', handleNotificationsData);
      off('notification:new', handleNewNotification);
    };
  }, [userId, fetchNotifications, on, off]);

  return { notifications, unreadCount, markAsRead, fetchNotifications };
};
