
import { useState, useEffect } from "react";
import { sharedJournalService } from "@/services/api";
import { useToast } from "@/hooks/ui/use-toast";

interface SharedJournalEntry {
  id: string;
  content: string;
  entry_date: string;
  created_at: string;
  title: string;
  mood?: string;
  attachments?: any;
  sharing_type: string;
  shared_with_therapists?: any;
}

export const useSharedJournalEntries = (therapistId: string, clientId: string) => {
  const [entries, setEntries] = useState<SharedJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadSharedEntries = async () => {
      if (!therapistId || !clientId) {
        console.log("Missing therapistId or clientId:", { therapistId, clientId });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Loading shared entries for:", { therapistId, clientId });
        
        const sharedEntries = await sharedJournalService.getSharedJournalEntries(therapistId, clientId);
        
        console.log("Shared entries loaded:", sharedEntries);
        setEntries(sharedEntries);
        
        if (sharedEntries.length === 0) {
          console.log("No shared journal entries found for this client-therapist pair");
        }
      } catch (error) {
        console.error("Error loading shared journal entries:", error);
        toast({
          title: "Error",
          description: "Failed to load shared journal entries",
          variant: "destructive",
        });
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    loadSharedEntries();
  }, [therapistId, clientId, toast]);

  return { entries, loading };
};
