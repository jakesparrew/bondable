import { CacheManager } from './CacheManager';

// Interfaces for journal data structures
export interface JournalEntry {
  id: string;
  content: string;
  date: string;
  sharing: "private" | "therapist";
  sharedWithTherapists?: Array<{
    id: string;
    name: string;
    specialty: string;
    status: "Available" | "Busy" | "Away";
  }>;
  createdAt: string;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
}

export interface SharedJournalEntry {
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

// Specialized cache managers for journal data
export const journalEntriesCache = new CacheManager({
  defaultTTL: 3 * 60 * 1000, // 3 minutes for journal entries
  maxSize: 200,
  enablePersistence: true
});

export const sharedJournalEntriesCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for shared journal entries
  maxSize: 150,
  enablePersistence: true
});

export const journalAttachmentsCache = new CacheManager({
  defaultTTL: 15 * 60 * 1000, // 15 minutes for file attachments
  maxSize: 100,
  enablePersistence: false // Don't persist file URLs across sessions
});

export const connectedTherapistsForJournalCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for therapist list
  maxSize: 50,
  enablePersistence: true
});

// Cache key generators
export const generateJournalEntriesCacheKey = (clientId: string) => 
  `journal_entries:${clientId}`;

export const generateSharedJournalEntriesCacheKey = (therapistId: string, clientId: string) => 
  `shared_journal_entries:${therapistId}:${clientId}`;

export const generateJournalAttachmentsCacheKey = (entryId: string) => 
  `journal_attachments:${entryId}`;

export const generateConnectedTherapistsForJournalCacheKey = (clientId: string) => 
  `connected_therapists_journal:${clientId}`;

// Cache invalidation patterns for journal
export const invalidateJournalCaches = (clientId?: string, therapistId?: string, entryId?: string) => {
  if (entryId) {
    journalAttachmentsCache.invalidatePattern(new RegExp(`journal_attachments:${entryId}`));
  }
  
  if (clientId) {
    journalEntriesCache.invalidatePattern(new RegExp(`journal_entries:${clientId}`));
    connectedTherapistsForJournalCache.invalidatePattern(new RegExp(`connected_therapists_journal:${clientId}`));
    
    // Also invalidate shared entries where this client is involved
    sharedJournalEntriesCache.invalidatePattern(new RegExp(`:${clientId}$`));
  }
  
  if (therapistId) {
    sharedJournalEntriesCache.invalidatePattern(new RegExp(`^shared_journal_entries:${therapistId}:`));
  }
  
  // If no specific identifiers provided, invalidate all journal caches
  if (!clientId && !therapistId && !entryId) {
    journalEntriesCache.invalidatePattern(/^journal_entries:/);
    sharedJournalEntriesCache.invalidatePattern(/^shared_journal_entries:/);
    journalAttachmentsCache.invalidatePattern(/^journal_attachments:/);
    connectedTherapistsForJournalCache.invalidatePattern(/^connected_therapists_journal:/);
  }
};

export const clearAllJournalCaches = () => {
  journalEntriesCache.clear();
  sharedJournalEntriesCache.clear();
  journalAttachmentsCache.clear();
  connectedTherapistsForJournalCache.clear();
};