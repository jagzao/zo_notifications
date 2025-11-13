// Service Worker para Web Push Notifications
// Version: 1.0.0

const CACHE_NAME = 'zo-notifications-v1';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

// Escuchar eventos de Push
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let data = {
    title: 'Nueva notificación',
    body: 'Tienes una nueva notificación',
    icon: '/icon.png',
    badge: '/badge.png',
    timestamp: Date.now(),
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      console.error('Error parsing push data:', error);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || 'notification',
    data: data,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    timestamp: data.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejar clicks en las notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});
