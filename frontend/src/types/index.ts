// Tipos de notificaciones
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BaseNotification {
  id: string;
  type: NotificationType;
  project: string;
  title: string;
  timestamp: string;
  read?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface SuccessNotification extends BaseNotification {
  type: 'success';
  message: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ErrorNotification extends BaseNotification {
  type: 'error';
  error: {
    message: string;
    stack?: string;
    code?: string;
    severity?: NotificationSeverity;
  };
  context?: Record<string, any>;
}

export interface WarningNotification extends BaseNotification {
  type: 'warning';
  message: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface InfoNotification extends BaseNotification {
  type: 'info';
  message: string;
}

export type Notification =
  | SuccessNotification
  | ErrorNotification
  | WarningNotification
  | InfoNotification;

// Stats
export interface NotificationStats {
  period: string;
  total_notifications: number;
  by_type: Record<NotificationType, number>;
  by_project: Record<string, number>;
  queue_stats: {
    webPush: Record<string, number>;
    discord: Record<string, number>;
  };
  generated_at: string;
}

// Health check
export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: { status: string };
    postgres: { status: string };
    queue: { status: string };
  };
  timestamp: string;
  uptime: number;
  version: string;
}

// Push subscription
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}
