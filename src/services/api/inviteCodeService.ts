
import { supabase } from "@/integrations/supabase/client";
import { inviteCodeCache } from "@/services/cache/inviteCodeCache";

export interface InviteCodeValidationResult {
  isValid: boolean;
  therapistId?: string;
  therapistName?: string;
  error?: string;
}

export const inviteCodeService = {
  async validateInviteCode(code: string): Promise<InviteCodeValidationResult> {
    try {
      console.log("Validating invite code:", code);
      
      const { data: therapist, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("invite_code", code.toUpperCase())
        .eq("role", "therapist")
        .maybeSingle();

      if (error) {
        console.error("Error validating invite code:", error);
        return { isValid: false, error: "Failed to validate invite code" };
      }

      if (!therapist) {
        return { isValid: false, error: "Invalid invite code" };
      }

      return {
        isValid: true,
        therapistId: therapist.id,
        therapistName: `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim() || 'Therapist',
      };
    } catch (error) {
      console.error("Error in validateInviteCode:", error);
      return { isValid: false, error: "Failed to validate invite code" };
    }
  },

  async getTherapistInviteCode(therapistId: string): Promise<string | null> {
    try {
      return await inviteCodeCache.getOrSet(therapistId, async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("invite_code")
          .eq("id", therapistId)
          .eq("role", "therapist")
          .maybeSingle();

        if (error) {
          console.error("Error getting invite code:", error);
          throw error;
        }

        return data?.invite_code || null;
      });
    } catch (error) {
      console.error("Error in getTherapistInviteCode:", error);
      return null;
    }
  }
};
