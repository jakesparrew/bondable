import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { fetchLastSessionDates, formatLastSession } from "./lastSessionUtil";

export interface TherapistClient {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  joinDate: string;
  lastSession: string;
  image: string;
  connectedAt: string;
}

export const therapistClientService = {
  async getClientsForTherapist(therapistId: string): Promise<Client[]> {
    try {
      console.log('Fetching clients for therapist:', therapistId);
      
      // First, get active clients from relationships
      const { data: relationshipClients, error: relationshipError } = await supabase
        .from("client_therapist_relationships")
        .select(`
          client_id,
          connected_at,
          status,
            profiles!client_therapist_relationships_client_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq("therapist_id", therapistId)
        .eq("status", "active");

      if (relationshipError) {
        console.error("Error fetching therapist client relationships:", relationshipError);
      }

      // Then, get pending clients from the clients table
      const { data: pendingClients, error: pendingError } = await supabase
        .from("clients")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("status", "Pending");

      if (pendingError) {
        console.error("Error fetching pending clients:", pendingError);
      }

      console.log("Active client relationships fetched:", relationshipClients);
      console.log("Pending clients fetched:", pendingClients);

      const lastSessionMap = await fetchLastSessionDates(therapistId);

      const processedClients: Client[] = [];

      // Process active clients from relationships
      if (relationshipClients && relationshipClients.length > 0) {
        for (const relationship of relationshipClients) {
          const profile = relationship.profiles;
          
          if (!profile) {
            console.warn("No profile found for client_id:", relationship.client_id);
            continue;
          }
          
          // Get the user's auth email as fallback
          let email = profile.email;
          if (!email || email.trim() === '') {
            // Try to get email from auth.users table
            const { data: authUser } = await supabase.auth.admin.getUserById(relationship.client_id);
            email = authUser?.user?.email || 'No email available';
          }
          
          // Build display name from first_name and last_name
          let displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          if (!displayName || displayName === '') {
            displayName = email ? email.split('@')[0] : 'Unknown Client';
          }
          
          processedClients.push({
            id: relationship.client_id,
            name: displayName,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: email,
            phone: profile.phone || 'No phone provided',
            status: "Active",
            joinDate: new Date(relationship.connected_at).toLocaleDateString(),
            lastSession: formatLastSession(lastSessionMap, relationship.client_id),
            image: profile.avatar_url || '',
          });
        }
      }

      // Process pending clients from clients table
      if (pendingClients && pendingClients.length > 0) {
        for (const client of pendingClients) {
          processedClients.push({
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            firstName: client.first_name,
            lastName: client.last_name,
            email: client.email,
            phone: client.phone || 'No phone provided',
            status: "Pending",
            joinDate: new Date(client.created_at).toLocaleDateString(),
            lastSession: formatLastSession(lastSessionMap, client.id),
            image: client.avatar_url || '',
          });
        }
      }

      console.log('Processed clients:', processedClients);
      return processedClients;
    } catch (error) {
      console.error("Error getting therapist clients:", error);
      return [];
    }
  },

  async updateClientProfile(clientId: string, updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
      if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", clientId);

      if (error) {
        console.error("Error updating client profile:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateClientProfile:", error);
      return false;
    }
  },

  async disconnectClient(therapistId: string, clientId: string): Promise<boolean> {
    try {
      // Check if this is a pending client (from clients table) or active client (from relationships)
      const { data: pendingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("therapist_id", therapistId)
        .eq("status", "Pending")
        .single();

      if (pendingClient) {
        // This is a pending client, delete from clients table
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", clientId)
          .eq("therapist_id", therapistId);

        if (error) {
          console.error("Error deleting pending client:", error);
          return false;
        }
      } else {
        // This is an active client, remove from relationships
        const { error } = await supabase
          .from("client_therapist_relationships")
          .delete()
          .eq("therapist_id", therapistId)
          .eq("client_id", clientId);

        if (error) {
          console.error("Error disconnecting active client:", error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error in disconnectClient:", error);
      return false;
    }
  }
};
