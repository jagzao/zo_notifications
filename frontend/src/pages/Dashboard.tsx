import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { FilterBar } from '@/components/FilterBar';
import { NotificationList } from '@/components/NotificationList';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { NotificationType, Notification } from '@/types';

export function Dashboard() {
  const { connected, notifications } = useWebSocket();
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar notificaciones
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filtrar por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter((n) => n.type === selectedType);
    }

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((n) => {
        const title = n.title.toLowerCase();
        const project = n.project.toLowerCase();

        // Buscar en el mensaje
        let message = '';
        if (n.type === 'error') {
          message = n.error.message.toLowerCase();
        } else if ('message' in n) {
          message = n.message.toLowerCase();
        }

        return title.includes(query) ||
               project.includes(query) ||
               message.includes(query);
      });
    }

    return filtered;
  }, [notifications, selectedType, searchQuery]);

  // Contar no leídas
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    // TODO: Abrir modal con detalles
    console.log('Clicked notification:', notification);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        unreadCount={unreadCount}
        onSettingsClick={() => console.log('Settings clicked')}
      />

      <FilterBar
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection status */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="text-slate-400">
              {connected ? 'Conectado en tiempo real' : 'Desconectado'}
            </span>
          </div>

          <div className="text-sm text-slate-400">
            {filteredNotifications.length} notificación{filteredNotifications.length !== 1 ? 'es' : ''}
          </div>
        </div>

        {/* Notifications list */}
        <NotificationList
          notifications={filteredNotifications}
          onNotificationClick={handleNotificationClick}
        />
      </main>
    </div>
  );
}
