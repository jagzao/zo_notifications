import type { Notification } from '@/types';
import { formatRelativeTime, getNotificationColor, getNotificationIcon, truncate } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface NotificationCardProps {
  notification: Notification;
  onClick?: () => void;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const colorClass = getNotificationColor(notification.type);
  const icon = getNotificationIcon(notification.type);

  const getMessage = () => {
    if (notification.type === 'error') {
      return notification.error.message;
    }
    if ('message' in notification) {
      return notification.message;
    }
    return '';
  };

  const getSeverity = () => {
    if (notification.type === 'error') {
      return notification.error.severity;
    }
    if ('priority' in notification) {
      return notification.priority;
    }
    return null;
  };

  const severity = getSeverity();

  return (
    <div
      className={`
        border border-slate-700 rounded-lg p-4 mb-3
        hover:border-slate-600 transition-all cursor-pointer
        ${notification.read ? 'opacity-60' : ''}
        animate-slide-in
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{icon}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              {notification.project}
            </span>
            {severity && (
              <span className={`
                text-xs px-2 py-0.5 rounded-full
                ${severity === 'critical' || severity === 'high' ? 'bg-red-500/20 text-red-400' : ''}
                ${severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                ${severity === 'low' || severity === 'normal' ? 'bg-blue-500/20 text-blue-400' : ''}
              `}>
                {severity}
              </span>
            )}
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-white font-medium mb-1 line-clamp-1">
            {notification.title}
          </h3>

          {/* Message */}
          <p className="text-sm text-slate-300 mb-2 line-clamp-2">
            {truncate(getMessage(), 150)}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{formatRelativeTime(notification.timestamp)}</span>
            {notification.tags && notification.tags.length > 0 && (
              <div className="flex gap-1">
                {notification.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-700 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
}
