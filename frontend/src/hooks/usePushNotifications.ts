import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription,
} from '@/lib/webpush';

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar soporte
    setSupported(isPushSupported());

    if (isPushSupported()) {
      setPermission(getPermissionState());

      // Verificar si ya está suscrito
      getCurrentSubscription().then((subscription) => {
        setSubscribed(!!subscription);
      });
    }
  }, []);

  const subscribe = async () => {
    if (!supported) {
      throw new Error('Push notifications are not supported');
    }

    setLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();
      setSubscribed(!!subscription);
      setPermission(Notification.permission);
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setSubscribed(false);
      }
      return success;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    supported,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
  };
}
