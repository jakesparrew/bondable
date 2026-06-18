import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";
import { 
  connectedTherapistsCache, 
  therapistClientsCache,
  generateConnectedTherapistsCacheKey,
  generateTherapistClientsCacheKey,
  invalidateClientTherapistCaches
} from '@/services/cache/clientTherapistCache';
import { ConnectedTherapist } from '../clientTherapistService';
import { Client } from '@/types/client';

export interface OptimizedClientTherapistService {
  connectToTherapist(inviteCode: string, clientId: string): Promise<{ success: boolean; therapistName?: string; error?: string }>;
  getConnectedTherapists(clientId: string, useCache?: boolean): Promise<ConnectedTherapist[]>;
  disconnectFromTherapist(clientId: string, therapistId: string): Promise<boolean>;
  getClientsForTherapist(therapistId: string, useCache?: boolean): Promise<Client[]>;
  updateClientProfile(clientId: string, updates: any): Promise<boolean>;
  disconnectClient(therapistId: string, clientId: string): Promise<boolean>;
  invalidateCache(clientId?: string, therapistId?: string): void;
}

class OptimizedClientTherapistServiceImpl implements OptimizedClientTherapistService {
  
  async connectToTherapist(inviteCode: string, clientId: string): Promise<{ success: boolean; therapistName?: string; error?: string }> {
    try {
      console.log('🔗 Connecting client to therapist with invite code:', inviteCode);
      
      // Find therapist by invite code - optimize with single query
      const { data: therapist, error: therapistError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("invite_code", inviteCode)
        .eq("role", "therapist")
        .maybeSingle();

      if (therapistError) {
        console.error("❌ Error finding therapist:", therapistError);
        return { success: false, error: "Invalid invite code" };
      }

      if (!therapist) {
        return { success: false, error: "Invalid invite code" };
      }

      // Batch profile operations for efficiency
      const [clientProfileResult, existingRelationshipResult] = await Promise.all([
        this.ensureClientProfile(clientId),
        supabase
          .from("client_therapist_relationships")
          .select("id")
          .eq("client_id", clientId)
          .eq("therapist_id", therapist.id)
          .maybeSingle()
      ]);

      if (!clientProfileResult.success) {
        return { success: false, error: clientProfileResult.error };
      }

      if (existingRelationshipResult.error) {
        console.error("❌ Error checking existing relationship:", existingRelationshipResult.error);
        return { success: false, error: "Connection failed" };
      }

      if (existingRelationshipResult.data) {
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
        console.error("❌ Error creating relationship:", insertError);
        return { success: false, error: "Failed to connect to therapist" };
      }

      // Invalidate relevant caches
      this.invalidateCache(clientId, therapist.id);

      const therapistName = this.buildDisplayName(therapist.first_name, therapist.last_name, therapist.email);
      console.log('✅ Successfully connected client to therapist');

      return { success: true, therapistName };
    } catch (error) {
      console.error("❌ Error in connectToTherapist:", error);
      return { success: false, error: "Connection failed" };
    }
  }

  async getConnectedTherapists(clientId: string, useCache = true): Promise<ConnectedTherapist[]> {
    const cacheKey = generateConnectedTherapistsCacheKey(clientId);
    
    return connectedTherapistsCache.getOrSet(
      cacheKey,
      async () => {
        console.log('🔍 Fetching connected therapists for client:', clientId);
        
        const { data: therapistData, error } = await supabase
          .from("client_therapist_relationships")
          .select(`
            therapist_id,
            connected_at,
            status,
            profiles!client_therapist_relationships_therapist_id_fkey (
              id,
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
          console.error("❌ Error fetching connected therapist relationships:", error);
          throw error;
        }

        if (!therapistData || therapistData.length === 0) {
          console.log("ℹ️ No active therapist relationships found for client:", clientId);
          return [];
        }

        const connectedTherapists: ConnectedTherapist[] = therapistData
          .filter(relationship => relationship.profiles)
          .map(relationship => {
            const profile = relationship.profiles;
            return {
              id: relationship.therapist_id,
              name: this.buildDisplayName(profile.first_name, profile.last_name, profile.email),
              email: profile.email || 'No email available',
              phone: profile.phone || 'No phone available',
              specialization: "General Therapy",
              status: "Active",
              connectedAt: new Date(relationship.connected_at).toLocaleDateString(),
              avatarUrl: profile.avatar_url || undefined,
            };
          });

        console.log('✅ Processed connected therapists:', connectedTherapists.length);
        return connectedTherapists;
      },
      useCache ? undefined : 0 // Skip cache if useCache is false
    );
  }

  async disconnectFromTherapist(clientId: string, therapistId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("client_therapist_relationships")
        .delete()
        .eq("client_id", clientId)
        .eq("therapist_id", therapistId);

      if (error) {
        console.error("❌ Error disconnecting from therapist:", error);
        return false;
      }

      // Invalidate relevant caches
      this.invalidateCache(clientId, therapistId);

      console.log('✅ Successfully disconnected from therapist');
      return true;
    } catch (error) {
      console.error("❌ Error in disconnectFromTherapist:", error);
      return false;
    }
  }

  async getClientsForTherapist(therapistId: string, useCache = true): Promise<Client[]> {
    const cacheKey = generateTherapistClientsCacheKey(therapistId);
    
    return therapistClientsCache.getOrSet(
      cacheKey,
      async () => {
        console.log('🔍 Fetching clients for therapist:', therapistId);
        
        // Batch both queries for efficiency
        const [relationshipResult, pendingResult] = await Promise.all([
          supabase
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
            .eq("status", "active"),
          
          supabase
            .from("clients")
            .select("*")
            .eq("therapist_id", therapistId)
            .eq("status", "Pending")
        ]);

        const processedClients: Client[] = [];

        // Process active clients from relationships
        if (relationshipResult.data && relationshipResult.data.length > 0) {
          for (const relationship of relationshipResult.data) {
            const profile = relationship.profiles;
            
            if (!profile) {
              console.warn("⚠️ No profile found for client_id:", relationship.client_id);
              continue;
            }
            
            const displayName = this.buildDisplayName(profile.first_name, profile.last_name, profile.email);
            
            processedClients.push({
              id: relationship.client_id,
              name: displayName,
              firstName: profile.first_name || '',
              lastName: profile.last_name || '',
              email: profile.email || 'No email available',
              phone: profile.phone || 'No phone provided',
              status: "Active",
              joinDate: new Date(relationship.connected_at).toLocaleDateString(),
              lastSession: "N/A",
              image: profile.avatar_url || '',
            });
          }
        }

        // Process pending clients from clients table
        if (pendingResult.data && pendingResult.data.length > 0) {
          for (const client of pendingResult.data) {
            processedClients.push({
              id: client.id,
              name: `${client.first_name} ${client.last_name}`,
              firstName: client.first_name,
              lastName: client.last_name,
              email: client.email,
              phone: client.phone || 'No phone provided',
              status: "Pending",
              joinDate: new Date(client.created_at).toLocaleDateString(),
              lastSession: "N/A",
              image: client.avatar_url || '',
            });
          }
        }

        console.log('✅ Processed clients:', processedClients.length);
        return processedClients;
      },
      useCache ? undefined : 0
    );
  }

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
        console.error("❌ Error updating client profile:", error);
        return false;
      }

      // Invalidate relevant caches
      this.invalidateCache(clientId);

      console.log('✅ Successfully updated client profile');
      return true;
    } catch (error) {
      console.error("❌ Error in updateClientProfile:", error);
      return false;
    }
  }

  async disconnectClient(therapistId: string, clientId: string): Promise<boolean> {
    try {
      // Check if this is a pending client first
      const { data: pendingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .eq("therapist_id", therapistId)
        .eq("status", "Pending")
        .maybeSingle();

      if (pendingClient) {
        // Delete pending client
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", clientId)
          .eq("therapist_id", therapistId);

        if (error) {
          console.error("❌ Error deleting pending client:", error);
          return false;
        }
      } else {
        // Remove active relationship
        const { error } = await supabase
          .from("client_therapist_relationships")
          .delete()
          .eq("therapist_id", therapistId)
          .eq("client_id", clientId);

        if (error) {
          console.error("❌ Error disconnecting active client:", error);
          return false;
        }
      }

      // Invalidate relevant caches
      this.invalidateCache(clientId, therapistId);

      console.log('✅ Successfully disconnected client');
      return true;
    } catch (error) {
      console.error("❌ Error in disconnectClient:", error);
      return false;
    }
  }

  invalidateCache(clientId?: string, therapistId?: string): void {
    invalidateClientTherapistCaches(clientId, therapistId);
  }

  private async ensureClientProfile(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: clientProfile, error: clientProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (clientProfileError) {
        console.error("❌ Error checking client profile:", clientProfileError);
        return { success: false, error: "Client profile error" };
      }

      if (!clientProfile) {
        return await this.createClientProfile(clientId);
      } else if (!clientProfile.email) {
        return await this.updateClientProfileEmail(clientId);
      }

      return { success: true };
    } catch (error) {
      console.error("❌ Error in ensureClientProfile:", error);
      return { success: false, error: "Profile setup failed" };
    }
  }

  private async createClientProfile(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("❌ Could not get user data:", userError);
        return { success: false, error: "Client profile not found" };
      }

      const fullName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 
                      user.user_metadata?.name || 
                      user.email?.split('@')[0] || 
                      'Client';
      
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error: createError } = await supabase
        .from("profiles")
        .insert({
          id: clientId,
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          role: 'client'
        });

      if (createError) {
        console.error("❌ Error creating client profile:", createError);
        return { success: false, error: "Failed to create client profile" };
      }

      console.log("✅ Created client profile");
      return { success: true };
    } catch (error) {
      console.error("❌ Error in createClientProfile:", error);
      return { success: false, error: "Profile creation failed" };
    }
  }

  private async updateClientProfileEmail(clientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user?.email) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ email: user.email })
          .eq("id", clientId);
        
        if (updateError) {
          console.error("❌ Error updating client profile email:", updateError);
          return { success: false, error: "Failed to update email" };
        }

        console.log("✅ Updated client profile with email");
      }
      return { success: true };
    } catch (error) {
      console.error("❌ Error in updateClientProfileEmail:", error);
      return { success: false, error: "Email update failed" };
    }
  }

  private buildDisplayName(firstName?: string, lastName?: string, email?: string): string {
    let displayName = `${firstName || ''} ${lastName || ''}`.trim();
    if (!displayName || displayName === '') {
      displayName = email ? email.split('@')[0] : 'Unknown';
    }
    return displayName;
  }
}

export const optimizedClientTherapistService = new OptimizedClientTherapistServiceImpl();