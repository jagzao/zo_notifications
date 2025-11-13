import { NotificationCard } from './NotificationCard';
import type { Notification } from '@/types';

interface NotificationListProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  loading?: boolean;
}

export function NotificationList({
  notifications,
  onNotificationClick,
  loading = false,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl text-slate-300 mb-2">No hay notificaciones</h3>
        <p className="text-slate-400">
          Las nuevas notificaciones aparecerán aquí en tiempo real
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClick={() => onNotificationClick?.(notification)}
        />
      ))}
    </div>
  );
}
