
import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";

export interface ClientTherapistRelationship {
  id: string;
  client_id: string;
  therapist_id: string;
  status: string;
  connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectedTherapist {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  status: string;
  connectedAt: string;
  avatarUrl?: string;
}

export const clientTherapistService = {
  async connectToTherapist(inviteCode: string, clientId: string): Promise<{ success: boolean; therapistName?: string; error?: string }> {
    try {
      console.log('Connecting client to therapist with invite code:', inviteCode, 'clientId:', clientId);
      
      // Find therapist by invite code
      const { data: therapist, error: therapistError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("invite_code", inviteCode)
        .eq("role", "therapist")
        .maybeSingle();

      if (therapistError) {
        console.error("Error finding therapist:", therapistError);
        return { success: false, error: "Invalid invite code" };
      }

      if (!therapist) {
        return { success: false, error: "Invalid invite code" };
      }

      // Ensure client profile exists and is properly set up with email
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (clientProfileError) {
        console.error("Error checking client profile:", clientProfileError);
        return { success: false, error: "Client profile error" };
      }

      if (!clientProfile) {
        console.error("Client profile not found for ID:", clientId);
        
        // Try to get the user's email from auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("Could not get user data:", userError);
          return { success: false, error: "Client profile not found" };
        }

        // Create client profile with email properly set
        const fullName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        'Client';
        
        // Split full name into first and last name
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: clientId,
            first_name: firstName,
            last_name: lastName,
            email: user.email, // Ensure email is set from auth
            role: 'client'
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating client profile:", createError);
          return { success: false, error: "Failed to create client profile" };
        }

        console.log("Created client profile:", newProfile);
      } else if (!clientProfile.email) {
        // If profile exists but email is missing, update it
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user?.email) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ email: user.email })
            .eq("id", clientId);
          
          if (updateError) {
            console.error("Error updating client profile email:", updateError);
          } else {
            console.log("Updated client profile with email:", user.email);
          }
        }
      }

      // Check if relationship already exists
      const { data: existingRelationship, error: relationshipError } = await supabase
        .from("client_therapist_relationships")
        .select("id")
        .eq("client_id", clientId)
        .eq("therapist_id", therapist.id)
        .maybeSingle();

      if (relationshipError) {
        console.error("Error checking existing relationship:", relationshipError);
        return { success: false, error: "Connection failed" };
      }

      if (existingRelationship) {
        return { success: false, error: "Already connected to this therapist" };
      }

      // Create the relationship
      const { error: insertError } = await supabase
        .from("client_therapist_relationships")
        .insert([{
          client_id: clientId,
          therapist_id: therapist.id,
          status: "active"
        }]);

      if (insertError) {
        console.error("Error creating relationship:", insertError);
        return { success: false, error: "Failed to connect to therapist" };
      }

      let therapistName = `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim();
      if (!therapistName || therapistName === '') {
        therapistName = therapist.email ? therapist.email.split('@')[0] : 'Therapist';
      }

      console.log('Successfully connected client to therapist');

      return { success: true, therapistName };
    } catch (error) {
      console.error("Error in connectToTherapist:", error);
      return { success: false, error: "Connection failed" };
    }
  },

  async getConnectedTherapists(clientId: string): Promise<ConnectedTherapist[]> {
    try {
      console.log('Fetching connected therapists for client:', clientId);
      
      // Use a single query with JOIN to get both relationship and profile data
      const { data: therapistData, error } = await supabase
        .from("client_therapist_relationships")
        .select(`
          therapist_id,
          connected_at,
          status,
          profiles!client_therapist_relationships_therapist_id_fkey (
            id,
            first_name,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq("client_id", clientId)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching connected therapist relationships:", error);
        throw error;
      }

      console.log("Therapist data fetched:", therapistData);

      if (!therapistData || therapistData.length === 0) {
        console.log("No active therapist relationships found for client:", clientId);
        return [];
      }

      const connectedTherapists: ConnectedTherapist[] = [];

      for (const relationship of therapistData) {
        const profile = relationship.profiles;
        
        if (!profile) {
          console.warn("No profile found for therapist_id:", relationship.therapist_id);
          continue;
        }

        let displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        if (!displayName || displayName === '') {
          displayName = profile.email ? profile.email.split('@')[0] : 'Unknown Therapist';
        }

        connectedTherapists.push({
          id: relationship.therapist_id,
          name: displayName,
          email: profile.email || 'No email available',
          phone: profile.phone || 'No phone available',
          specialization: "General Therapy",
          status: "Active",
          connectedAt: new Date(relationship.connected_at).toLocaleDateString(),
          avatarUrl: profile.avatar_url || undefined,
        });
      }

      console.log("Processed connected therapists:", connectedTherapists);
      return connectedTherapists;
    } catch (error) {
      console.error("Error getting connected therapists:", error);
      return [];
    }
  },

  async disconnectFromTherapist(clientId: string, therapistId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("client_therapist_relationships")
        .delete()
        .eq("client_id", clientId)
        .eq("therapist_id", therapistId);

      if (error) {
        console.error("Error disconnecting from therapist:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in disconnectFromTherapist:", error);
      return false;
    }
  }
};
