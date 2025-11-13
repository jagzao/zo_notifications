import axios from 'axios';
import type { Notification, NotificationStats, HealthCheck } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export async function getHealth(): Promise<HealthCheck> {
  const { data } = await api.get('/health');
  return data;
}

// Notifications
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  type?: string;
  project?: string;
}): Promise<{ data: Notification[]; total: number }> {
  const { data } = await api.get('/notifications', { params });
  return data;
}

export async function getNotification(id: string): Promise<Notification> {
  const { data } = await api.get(`/notifications/${id}`);
  return data;
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

// Stats
export async function getStats(params?: {
  period?: '24h' | '7d' | '30d' | 'all';
  project?: string;
}): Promise<NotificationStats> {
  const { data } = await api.get('/stats', { params });
  return data;
}

// Web Push
export async function getPublicKey(): Promise<string> {
  const { data } = await api.get('/webpush/public-key');
  return data.publicKey;
}

export async function subscribeToPush(subscription: PushSubscriptionJSON): Promise<void> {
  await api.post('/webpush/subscribe', subscription);
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await api.delete('/webpush/unsubscribe', { data: { endpoint } });
}

export async function testPushNotification(): Promise<void> {
  await api.post('/webpush/test');
}
