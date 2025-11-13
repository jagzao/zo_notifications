import { Bell, Settings } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface HeaderProps {
  unreadCount: number;
  onSettingsClick?: () => void;
}

export function Header({ unreadCount, onSettingsClick }: HeaderProps) {
  const { supported, subscribed, permission, subscribe } = usePushNotifications();

  const handleEnableNotifications = async () => {
    try {
      await subscribe();
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔔</div>
            <div>
              <h1 className="text-xl font-bold text-white">
                ZO Notifications
              </h1>
              <p className="text-xs text-slate-400">
                Sistema de notificaciones en tiempo real
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Notification badge */}
            {unreadCount > 0 && (
              <div className="relative">
                <Bell className="w-6 h-6 text-blue-400" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}

            {/* Enable notifications button */}
            {supported && !subscribed && permission !== 'denied' && (
              <button
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Activar notificaciones
              </button>
            )}

            {/* Subscribed indicator */}
            {subscribed && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Notificaciones activas
              </div>
            )}

            {/* Settings */}
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Configuración"
            >
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
