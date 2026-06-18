import { supabase } from "@/integrations/supabase/client";

export type TwilioChannel = "sms" | "whatsapp";

interface SendMessageParams {
  to: string;
  body: string;
  channel: TwilioChannel;
  conversationId?: string;
}

export const twilioService = {
  async sendMessage({ to, body, channel, conversationId }: SendMessageParams) {
    const { data, error } = await supabase.functions.invoke(
      "send-twilio-message",
      {
        body: { to, body, channel, conversationId },
      }
    );

    if (error) {
      throw error;
    }

    return data;
  },
};
