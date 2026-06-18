import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

interface JournalEntry {
  id: string;
  content: string;
  date: string;
  sharing: "private" | "therapist";
  sharedWithTherapists?: Therapist[];
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
}

// Helper function to safely parse JSON data from database
const parseJsonArray = <T>(jsonData: unknown): T[] | undefined => {
  if (!jsonData) return undefined;
  if (Array.isArray(jsonData)) return jsonData as T[];
  try {
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

// Helper function to upload files to Supabase storage
const uploadFile = async (file: File, userId: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  
  console.log('Uploading file:', fileName, 'Size:', file.size);
  
  const { data, error } = await supabase.storage
    .from('journal-attachments')
    .upload(fileName, file);

  if (error) {
    console.error('File upload error:', error);
    throw error;
  }

  // Get the public URL for the uploaded file
  const { data: urlData } = supabase.storage
    .from('journal-attachments')
    .getPublicUrl(fileName);

  console.log('File uploaded successfully:', urlData.publicUrl);
  return urlData.publicUrl;
};

export const useJournalEntries = () => {
  const [entries, setEntries] = useOptimizedState<JournalEntry[]>([]);
  const [loading, setLoading] = useOptimizedState(true);
  const { toast } = useToast();

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user found");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading journal entries:", error);
        toast({
          title: "Error",
          description: "Failed to load journal entries",
          variant: "destructive",
        });
      } else {
        // Transform database entries to match the interface
        const transformedEntries: JournalEntry[] = (data || []).map(entry => ({
          id: entry.id,
          content: entry.content,
          date: entry.entry_date || entry.created_at,
          sharing: entry.sharing_type === 'therapist' ? 'therapist' : 'private',
          sharedWithTherapists: parseJsonArray<Therapist>(entry.shared_with_therapists),
          createdAt: entry.created_at,
          attachments: parseJsonArray<{
            id: string;
            name: string;
            type: string;
            url: string;
            size: number;
          }>(entry.attachments),
        }));
        setEntries(transformedEntries);
      }
    } catch (error) {
      console.error("Error in loadEntries:", error);
      toast({
        title: "Error",
        description: "Failed to load journal entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useOptimizedEffect(() => {
    loadEntries();
  }, []);

  const addEntry = async (entry: JournalEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create journal entries",
          variant: "destructive",
        });
        return;
      }

      console.log('Processing entry with attachments:', entry.attachments);

      // Upload files and get their URLs
      let processedAttachments: Array<{
        id: string;
        name: string;
        type: string;
        url: string;
        size: number;
      }> | undefined = undefined;

      if (entry.attachments && entry.attachments.length > 0) {
        processedAttachments = [];
        
        for (const attachment of entry.attachments) {
          try {
            // Check if this is a File object that needs to be uploaded
            if (attachment.url.startsWith('blob:')) {
              // Convert blob URL back to File object for upload
              const response = await fetch(attachment.url);
              const blob = await response.blob();
              const file = new File([blob], attachment.name, { type: attachment.type });
              
              console.log('Uploading file:', attachment.name);
              const uploadedUrl = await uploadFile(file, user.id);
              
              processedAttachments.push({
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                url: uploadedUrl,
                size: attachment.size,
              });
            } else {
              // File already has a proper URL, keep as is
              processedAttachments.push(attachment);
            }
          } catch (uploadError) {
            console.error('Failed to upload file:', attachment.name, uploadError);
            toast({
              title: "Upload Error",
              description: `Failed to upload ${attachment.name}`,
              variant: "destructive",
            });
          }
        }
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          client_id: user.id,
          title: entry.content.substring(0, 50) + (entry.content.length > 50 ? '...' : ''),
          content: entry.content,
          entry_date: new Date(entry.date).toISOString().split('T')[0],
          sharing_type: entry.sharing,
          shared_with_therapists: entry.sharedWithTherapists ? JSON.stringify(entry.sharedWithTherapists) : null,
          attachments: processedAttachments ? JSON.stringify(processedAttachments) : null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding journal entry:", error);
        toast({
          title: "Error",
          description: "Failed to save journal entry",
          variant: "destructive",
        });
      } else {
        // Transform the returned entry and add to local state
        const transformedEntry: JournalEntry = {
          id: data.id,
          content: data.content,
          date: data.entry_date || data.created_at,
          sharing: data.sharing_type === 'therapist' ? 'therapist' : 'private',
          sharedWithTherapists: parseJsonArray<Therapist>(data.shared_with_therapists),
          createdAt: data.created_at,
          attachments: parseJsonArray<{
            id: string;
            name: string;
            type: string;
            url: string;
            size: number;
          }>(data.attachments),
        };
        setEntries(prev => [transformedEntry, ...prev]);
      }
    } catch (error) {
      console.error("Error in addEntry:", error);
      toast({
        title: "Error",
        description: "Failed to save journal entry",
        variant: "destructive",
      });
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      // Get the entry to find its attachments for cleanup
      const entryToDelete = entries.find(entry => entry.id === id);
      
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting journal entry:", error);
        toast({
          title: "Error",
          description: "Failed to delete journal entry",
          variant: "destructive",
        });
      } else {
        // Clean up uploaded files if any
        if (entryToDelete?.attachments) {
          for (const attachment of entryToDelete.attachments) {
            if (attachment.url.includes('supabase')) {
              try {
                // Extract file path from URL and delete from storage
                const urlParts = attachment.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  const filePath = `${user.id}/${fileName}`;
                  await supabase.storage
                    .from('journal-attachments')
                    .remove([filePath]);
                }
              } catch (cleanupError) {
                console.error('Failed to cleanup file:', attachment.name, cleanupError);
              }
            }
          }
        }
        
        setEntries(prev => prev.filter(entry => entry.id !== id));
      }
    } catch (error) {
      console.error("Error in deleteEntry:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        variant: "destructive",
      });
    }
  };

  const updateEntry = async (updatedEntry: JournalEntry) => {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({
          sharing_type: updatedEntry.sharing,
          shared_with_therapists: updatedEntry.sharedWithTherapists ? JSON.stringify(updatedEntry.sharedWithTherapists) : null,
        })
        .eq('id', updatedEntry.id);

      if (error) {
        console.error("Error updating journal entry:", error);
        toast({
          title: "Error",
          description: "Failed to update journal entry",
          variant: "destructive",
        });
      } else {
        setEntries(prev => 
          prev.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          )
        );
      }
    } catch (error) {
      console.error("Error in updateEntry:", error);
      toast({
        title: "Error",
        description: "Failed to update journal entry",
        variant: "destructive",
      });
    }
  };

  return {
    entries,
    loading,
    addEntry,
    deleteEntry,
    updateEntry,
  };
};
