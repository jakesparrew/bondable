
import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";

interface SharedJournalEntry {
  id: string;
  content: string;
  entry_date: string;
  created_at: string;
  title: string;
  mood?: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
  sharing_type: string;
  shared_with_therapists?: any;
}

// Helper function to safely parse JSON data from database
const parseJsonArray = <T>(jsonData: any): T[] | undefined => {
  if (!jsonData) return undefined;
  if (Array.isArray(jsonData)) return jsonData as T[];
  try {
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const sharedJournalService = {
  async getSharedJournalEntries(therapistId: string, clientId: string): Promise<SharedJournalEntry[]> {
    try {
      console.log("Fetching shared journal entries for therapist:", therapistId, "client:", clientId);
      
      // First, check if there's an active relationship
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('client_therapist_relationships')
        .select('*')
        .eq('client_id', clientId)
        .eq('therapist_id', therapistId)
        .eq('status', 'active');

      console.log("Client-therapist relationship:", relationshipData, relationshipError);

      // Fetch journal entries with more detailed logging
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('client_id', clientId)
        .eq('sharing_type', 'therapist')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching shared journal entries:", error);
        throw error;
      }

      console.log("Raw shared journal entries from database:", data);

      if (!data || data.length === 0) {
        console.log("No journal entries found for client:", clientId);
        return [];
      }

      // For now, return all entries that have sharing_type = 'therapist'
      // The RLS policy should handle the filtering based on the relationship
      const filteredEntries = data.filter(entry => {
        console.log("Processing entry:", entry.id, "sharing_type:", entry.sharing_type);
        
        // If there's no active relationship, don't show any entries
        if (!relationshipData || relationshipData.length === 0) {
          console.log("No active relationship found, filtering out entry");
          return false;
        }

        // Entry must have sharing_type = 'therapist'
        if (entry.sharing_type !== 'therapist') {
          console.log("Entry not shared with therapists, filtering out");
          return false;
        }

        // If shared_with_therapists is specified, check if this therapist is included
        if (entry.shared_with_therapists) {
          try {
            let sharedTherapists;
            if (typeof entry.shared_with_therapists === 'string') {
              sharedTherapists = JSON.parse(entry.shared_with_therapists);
            } else {
              sharedTherapists = entry.shared_with_therapists;
            }

            console.log("Entry shared with therapists:", sharedTherapists);

            if (Array.isArray(sharedTherapists)) {
              const isSharedWithTherapist = sharedTherapists.some(therapist => {
                const therapistIdToCheck = typeof therapist === 'object' ? therapist.id : therapist;
                return therapistIdToCheck === therapistId;
              });
              console.log("Is shared with current therapist:", isSharedWithTherapist);
              return isSharedWithTherapist;
            }
          } catch (parseError) {
            console.error("Error parsing shared_with_therapists:", parseError);
            return false;
          }
        }

        // If no specific therapists are listed, allow if there's an active relationship
        console.log("No specific therapists listed, allowing based on relationship");
        return true;
      });

      // Transform entries to include properly parsed attachments
      const transformedEntries = filteredEntries.map(entry => ({
        ...entry,
        attachments: parseJsonArray<{
          id: string;
          name: string;
          type: string;
          url: string;
          size: number;
        }>(entry.attachments),
      }));

      console.log("Filtered and transformed shared journal entries:", transformedEntries);
      return transformedEntries;
    } catch (error) {
      console.error("Error in getSharedJournalEntries:", error);
      return [];
    }
  }
};
