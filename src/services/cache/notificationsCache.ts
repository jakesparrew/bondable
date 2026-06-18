import { CacheManager } from './CacheManager';

// Cache mapping notification.id -> resolved sender user_id
export const notificationSenderCache = new CacheManager({
  defaultTTL: 60 * 60 * 1000, // 1 hour
  maxSize: 1000,
  enablePersistence: true,
});

export const getNotificationSenderCacheKey = (notificationId: string) =>
  `notif_sender:${notificationId}`;
