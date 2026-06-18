import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@/types/session";

export interface SessionNotificationData {
  sessionId: string;
  clientEmail: string;
  therapistName: string;
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  durationType: string;
  location?: string;
  sessionType: string;
  therapyType?: string;
  sessionFormat?: string;
  notes?: string;
}

export const sessionNotificationService = {
  async sendSessionCreationNotification(session: Session): Promise<boolean> {
    try {
      console.log('📧 Sending session creation notification for session:', session.id);

      // Get client profile
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('id', session.client_id)
        .single();

      if (!clientProfile?.email) {
        console.error('❌ Client email not found');
        return false;
      }

      // Get therapist profile
      const { data: therapistProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', session.therapist_id)
        .single();

      const therapistName = `${therapistProfile.first_name || ''} ${therapistProfile.last_name || ''}`.trim() || 'Therapist';
      const clientName = `${clientProfile?.first_name || ''} ${clientProfile?.last_name || ''}`.trim() || 'Client';

      const notificationData: SessionNotificationData = {
        sessionId: session.id,
        clientEmail: clientProfile.email,
        therapistName,
        clientName,
        sessionDate: session.session_date,
        sessionTime: session.session_time || '',
        durationType: session.duration_minutes?.toString() || '50',
        location: session.location,
        sessionType: session.session_type,
        therapyType: session.therapy_type,
        sessionFormat: session.session_format,
        notes: session.notes,
      };

      // Call the edge function to send the email
      const { data, error } = await supabase.functions.invoke('send-session-notification', {
        body: notificationData,
      });

      if (error) {
        console.error('❌ Failed to send session notification:', error);
        return false;
      }

      console.log('✅ Session notification sent successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error in sendSessionCreationNotification:', error);
      return false;
    }
  },
};