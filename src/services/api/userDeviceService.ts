import { supabase } from "@/integrations/supabase/client";

export const userDeviceService = {
  async register(token: string, platform: 'ios' | 'android' | 'web', deviceInfo?: Record<string, any>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_devices').insert({
        user_id: user.id,
        token,
        platform,
        device_info: deviceInfo || {},
        is_active: true,
        last_seen_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to register device token', e);
    }
  },
};
