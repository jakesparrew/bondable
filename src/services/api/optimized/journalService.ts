import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";
import { 
  journalEntriesCache, 
  sharedJournalEntriesCache,
  journalAttachmentsCache,
  connectedTherapistsForJournalCache,
  generateJournalEntriesCacheKey,
  generateSharedJournalEntriesCacheKey,
  generateJournalAttachmentsCacheKey,
  generateConnectedTherapistsForJournalCacheKey,
  invalidateJournalCaches,
  JournalEntry,
  SharedJournalEntry
} from '@/services/cache/journalCache';

export interface OptimizedJournalService {
  getJournalEntries(clientId: string, useCache?: boolean): Promise<JournalEntry[]>;
  createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry>;
  updateJournalEntry(entryId: string, updates: Partial<JournalEntry>): Promise<JournalEntry>;
  deleteJournalEntry(entryId: string): Promise<void>;
  getSharedJournalEntries(therapistId: string, clientId: string, useCache?: boolean): Promise<SharedJournalEntry[]>;
  uploadJournalAttachment(file: File, userId: string): Promise<string>;
  getConnectedTherapistsForJournal(clientId: string, useCache?: boolean): Promise<Array<{
    id: string;
    name: string;
    specialty: string;
    status: "Available" | "Busy" | "Away";
  }>>;
  invalidateCache(clientId?: string, therapistId?: string, entryId?: string): void;
}

class OptimizedJournalServiceImpl implements OptimizedJournalService {
  
  async getJournalEntries(clientId: string, useCache = true): Promise<JournalEntry[]> {
    const cacheKey = generateJournalEntriesCacheKey(clientId);
    
    return journalEntriesCache.getOrSet(
      cacheKey,
      async () => {
        console.log('🔍 Fetching journal entries for client:', clientId);
        
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error loading journal entries:', error);
          throw error;
        }

        // Transform database entries to match the interface
        const transformedEntries: JournalEntry[] = (data || []).map(entry => ({
          id: entry.id,
          content: entry.content,
          date: entry.entry_date || entry.created_at,
          sharing: entry.sharing_type === 'therapist' ? 'therapist' : 'private',
          sharedWithTherapists: this.parseJsonArray(entry.shared_with_therapists),
          createdAt: entry.created_at,
          attachments: this.parseJsonArray(entry.attachments),
        }));

        console.log('✅ Processed journal entries:', transformedEntries.length);
        return transformedEntries;
      },
      useCache ? undefined : 0
    );
  }

  async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to create journal entries');
      }

      console.log('📝 Creating journal entry for user:', user.id);

      // Process attachments if any
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
              console.log('📎 Uploading attachment:', attachment.name);
              const response = await fetch(attachment.url);
              const blob = await response.blob();
              const file = new File([blob], attachment.name, { type: attachment.type });
              
              const uploadedUrl = await this.uploadJournalAttachment(file, user.id);
              
              processedAttachments.push({
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                url: uploadedUrl,
                size: attachment.size,
              });
            } else {
              processedAttachments.push(attachment);
            }
          } catch (uploadError) {
            console.error('❌ Failed to upload attachment:', attachment.name, uploadError);
            throw new Error(`Failed to upload ${attachment.name}`);
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
        console.error('❌ Error creating journal entry:', error);
        throw error;
      }

      // Transform the returned entry
      const transformedEntry: JournalEntry = {
        id: data.id,
        content: data.content,
        date: data.entry_date || data.created_at,
        sharing: data.sharing_type === 'therapist' ? 'therapist' : 'private',
        sharedWithTherapists: this.parseJsonArray(data.shared_with_therapists),
        createdAt: data.created_at,
        attachments: this.parseJsonArray(data.attachments),
      };

      // Invalidate caches
      this.invalidateCache(user.id);

      console.log('✅ Journal entry created successfully:', transformedEntry.id);
      return transformedEntry;
    } catch (error) {
      console.error('❌ Error in createJournalEntry:', error);
      throw error;
    }
  }

  async updateJournalEntry(entryId: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    try {
      console.log('📝 Updating journal entry:', entryId);

      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          ...(updates.content && { content: updates.content }),
          ...(updates.sharing && { sharing_type: updates.sharing }),
          ...(updates.sharedWithTherapists !== undefined && { 
            shared_with_therapists: updates.sharedWithTherapists ? JSON.stringify(updates.sharedWithTherapists) : null 
          }),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating journal entry:', error);
        throw error;
      }

      const transformedEntry: JournalEntry = {
        id: data.id,
        content: data.content,
        date: data.entry_date || data.created_at,
        sharing: data.sharing_type === 'therapist' ? 'therapist' : 'private',
        sharedWithTherapists: this.parseJsonArray(data.shared_with_therapists),
        createdAt: data.created_at,
        attachments: this.parseJsonArray(data.attachments),
      };

      // Invalidate caches
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.invalidateCache(user.id, undefined, entryId);
      }

      console.log('✅ Journal entry updated successfully:', entryId);
      return transformedEntry;
    } catch (error) {
      console.error('❌ Error in updateJournalEntry:', error);
      throw error;
    }
  }

  async deleteJournalEntry(entryId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting journal entry:', entryId);

      // Get the entry first to handle file cleanup
      const { data: entryData } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();

      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('❌ Error deleting journal entry:', error);
        throw error;
      }

      // Clean up uploaded files if any
      if (entryData?.attachments) {
        const attachments = this.parseJsonArray<{
          id: string;
          name: string;
          type: string;
          url: string;
          size: number;
        }>(entryData.attachments);
        
        if (attachments) {
          for (const attachment of attachments) {
            if (attachment.url && attachment.url.includes('supabase')) {
              try {
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
                console.error('⚠️ Failed to cleanup file:', attachment.name, cleanupError);
              }
            }
          }
        }
      }

      // Invalidate caches
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.invalidateCache(user.id, undefined, entryId);
      }

      console.log('✅ Journal entry deleted successfully:', entryId);
    } catch (error) {
      console.error('❌ Error in deleteJournalEntry:', error);
      throw error;
    }
  }

  async getSharedJournalEntries(therapistId: string, clientId: string, useCache = true): Promise<SharedJournalEntry[]> {
    const cacheKey = generateSharedJournalEntriesCacheKey(therapistId, clientId);
    
    return sharedJournalEntriesCache.getOrSet(
      cacheKey,
      async () => {
        console.log('🔍 Fetching shared journal entries for therapist:', therapistId, 'client:', clientId);
        
        // Import here to avoid circular dependency
        const { sharedJournalService } = await import('@/services/api');
        const sharedEntries = await sharedJournalService.getSharedJournalEntries(therapistId, clientId);
        
        console.log('✅ Processed shared journal entries:', sharedEntries.length);
        return sharedEntries;
      },
      useCache ? undefined : 0
    );
  }

  async uploadJournalAttachment(file: File, userId: string): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      console.log('📎 Uploading file:', fileName, 'Size:', file.size);
      
      const { data, error } = await supabase.storage
        .from('journal-attachments')
        .upload(fileName, file);

      if (error) {
        console.error('❌ File upload error:', error);
        throw error;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('journal-attachments')
        .getPublicUrl(fileName);

      console.log('✅ File uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Error in uploadJournalAttachment:', error);
      throw error;
    }
  }

  async getConnectedTherapistsForJournal(clientId: string, useCache = true): Promise<Array<{
    id: string;
    name: string;
    specialty: string;
    status: "Available" | "Busy" | "Away";
  }>> {
    const cacheKey = generateConnectedTherapistsForJournalCacheKey(clientId);
    
    return connectedTherapistsForJournalCache.getOrSet(
      cacheKey,
      async () => {
        console.log('🔍 Fetching connected therapists for journal sharing:', clientId);
        
        // Import here to avoid circular dependency
        const { optimizedClientTherapistService } = await import('@/services/api/optimized/clientTherapistService');
        const therapists = await optimizedClientTherapistService.getConnectedTherapists(clientId);
        
        // Transform to match the expected interface
        const journalTherapists = therapists.map(therapist => ({
          id: therapist.id,
          name: therapist.name,
          specialty: therapist.specialization || 'General Therapy',
          status: 'Available' as const
        }));
        
        console.log('✅ Processed connected therapists for journal:', journalTherapists.length);
        return journalTherapists;
      },
      useCache ? undefined : 0
    );
  }

  invalidateCache(clientId?: string, therapistId?: string, entryId?: string): void {
    invalidateJournalCaches(clientId, therapistId, entryId);
  }

  private parseJsonArray<T>(jsonData: unknown): T[] | undefined {
    if (!jsonData) return undefined;
    if (Array.isArray(jsonData)) return jsonData as T[];
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
}

export const optimizedJournalService = new OptimizedJournalServiceImpl();