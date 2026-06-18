import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

export type RegisterTokenResult = {
  token: string | null;
  platform: 'ios' | 'android' | 'web';
};

export const isNativePlatform = () => Capacitor.getPlatform() !== 'web';

export async function requestPushPermission(): Promise<boolean> {
  try {
    const { receive } = await FirebaseMessaging.requestPermissions();
    return receive === 'granted';
  } catch {
    return false;
  }
}

export async function getFcmToken(): Promise<RegisterTokenResult> {
  try {
    const platform = (Capacitor.getPlatform() as 'ios' | 'android' | 'web');
    const perm = await FirebaseMessaging.checkPermissions();
    if (perm.receive !== 'granted') {
      const ok = await requestPushPermission();
      if (!ok) return { token: null, platform };
    }

    const { token } = await FirebaseMessaging.getToken();
    return { token: token ?? null, platform };
  } catch {
    return { token: null, platform: (Capacitor.getPlatform() as any) };
  }
}

export function onTokenRefresh(callback: (token: string) => void) {
  FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
    if (token) callback(token);
  });
}
