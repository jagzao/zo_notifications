import { subscribeToPush, getPublicKey } from './api';

// Convertir base64 a Uint8Array (para VAPID key)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verificar si Push API está soportado
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Verificar si ya se dio permiso
export function getPermissionState(): NotificationPermission {
  return Notification.permission;
}

// Registrar Service Worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers are not supported');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  console.log('Service Worker registered:', registration);
  return registration;
}

// Suscribirse a notificaciones Push
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    // Solicitar permiso
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Registrar Service Worker
    const registration = await registerServiceWorker();

    // Esperar a que el SW esté activo
    await navigator.serviceWorker.ready;

    // Obtener la clave pública del servidor
    const publicKey = await getPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Suscribirse al push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    // Enviar subscription al backend
    const subscriptionJSON = subscription.toJSON();
    await subscribeToPush(subscriptionJSON);

    console.log('Push subscription successful:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
}

// Obtener subscription actual
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('Error getting current subscription:', error);
    return null;
  }
}

// Cancelar suscripción
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const subscription = await getCurrentSubscription();

    if (subscription) {
      const successful = await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return successful;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}
