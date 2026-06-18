
import { supabase } from "@/integrations/supabase/client";

export interface SendInvitationData {
  clientId: string;
  clientEmail: string;
  clientName: string;
  therapistName: string;
}

export const clientInvitationService = {
  async sendInvitation(invitationData: SendInvitationData): Promise<void> {
    console.log("Sending invitation email:", invitationData);

    const { data, error } = await supabase.functions.invoke('send-client-invitation', {
      body: invitationData
    });

    if (error) {
      console.error("Error sending invitation:", error);
      throw new Error(`Failed to send invitation: ${error.message}`);
    }

    // Check if the response indicates an email sending failure
    if (data && !data.success) {
      console.error("Email sending failed:", data);
      throw new Error(`Failed to send invitation email: ${data.message || 'Unknown error'}`);
    }

    console.log("Invitation sent successfully:", data);
  },

  async updateClientStatus(clientId: string, status: "Active" | "Inactive" | "Pending"): Promise<void> {
    const { error } = await supabase
      .from("clients")
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq("id", clientId);

    if (error) {
      console.error("Error updating client status:", error);
      throw new Error(`Failed to update client status: ${error.message}`);
    }

    console.log(`Client ${clientId} status updated to ${status}`);
  }
};
