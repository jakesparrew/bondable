
import { supabase } from "@/integrations/supabase/client";

export interface Therapist {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

export const therapistService = {
  async getTherapists(): Promise<Therapist[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone")
      .eq("role", "therapist");

    if (error) {
      console.error("Error fetching therapists:", error);
      throw error;
    }

    return data.map(therapist => ({
      id: therapist.id,
      name: `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim(),
      firstName: therapist.first_name || '',
      lastName: therapist.last_name || '',
      email: therapist.email || '',
      phone: therapist.phone || '',
      specialty: "General Therapy", // Default since we don't have specialty in the schema
      status: "Available" as const,
    }));
  },

  async getConnectedTherapists(clientId: string): Promise<Therapist[]> {
    const { data, error } = await supabase
      .from("client_therapist_relationships")
      .select(`
        therapist_id,
        profiles!therapist_id (
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq("client_id", clientId)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching connected therapists:", error);
      throw error;
    }

    console.log("Connected therapists data:", data);

    return (data || []).map(relationship => {
      const profile = relationship.profiles;
      return {
        id: relationship.therapist_id,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        specialty: "General Therapy",
        status: "Available" as const,
      };
    });
  },
};
