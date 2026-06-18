import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => {
  const anyCap = Capacitor as any;
  try {
    if (typeof anyCap.isNativePlatform === 'function') return anyCap.isNativePlatform();
  } catch (_) {}
  const platform = Capacitor.getPlatform?.() || 'web';
  return platform !== 'web';
};

export const initLocalNotifications = async (): Promise<boolean> => {
  if (!isNativePlatform()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return false;
    }

    // Try to create a default channel on Android (safe no-op on iOS/web)
    try {
      // @ts-ignore createChannel may not exist on all platforms
      await (LocalNotifications as any).createChannel?.({
        id: 'default',
        name: 'General',
        description: 'General notifications',
        importance: 5,
        visibility: 1,
        sound: 'default'
      });
    } catch (_) {}

    return true;
  } catch (_) {
    return false;
  }
};

export const presentLocalNotification = async (opts: { title: string; body?: string }): Promise<void> => {
  if (!isNativePlatform()) return;
  try {
    const id = Math.floor(Date.now() % 2147483647);
    const options: ScheduleOptions = {
      notifications: [
        {
          id,
          title: opts.title,
          body: opts.body ?? '',
          channelId: 'default',
          smallIcon: 'ic_stat_icon',
        },
      ],
    };
    await LocalNotifications.schedule(options);
  } catch (_) {
    // swallow
  }
};
