import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { optimizedJournalService } from '@/services/api/optimized/journalService';
import { useAuthManager } from './useAuthManager';
import { useToast } from '@/hooks/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { JournalEntry, SharedJournalEntry } from '@/services/cache/journalCache';

// Query keys for cache management
export const journalQueryKeys = {
  all: ['journal'] as const,
  entries: (clientId: string) => ['journal', 'entries', clientId] as const,
  shared: (therapistId: string, clientId: string) => ['journal', 'shared', therapistId, clientId] as const,
  therapists: (clientId: string) => ['journal', 'therapists', clientId] as const,
};

export const useOptimizedJournalEntries = (enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: journalQueryKeys.entries(user?.id || ''),
    queryFn: () => optimizedJournalService.getJournalEntries(user!.id),
    enabled: enabled && !!user?.id,
    staleTime: 90 * 1000, // 90 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
};

export const useOptimizedSharedJournalEntries = (therapistId: string, clientId: string, enabled = true) => {
  return useQuery({
    queryKey: journalQueryKeys.shared(therapistId, clientId),
    queryFn: () => optimizedJournalService.getSharedJournalEntries(therapistId, clientId),
    enabled: enabled && !!therapistId && !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useConnectedTherapistsForJournal = (enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: journalQueryKeys.therapists(user?.id || ''),
    queryFn: () => optimizedJournalService.getConnectedTherapistsForJournal(user!.id),
    enabled: enabled && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

export const useCreateJournalEntry = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => 
      optimizedJournalService.createJournalEntry(entry),
    onSuccess: (newEntry) => {
      toast({
        title: t('success'),
        description: t('journal_entry_created'),
      });
      
      // Optimistic update - add to existing entries
      if (user?.id) {
        queryClient.setQueryData(
          journalQueryKeys.entries(user.id),
          (old: JournalEntry[] = []) => [newEntry, ...old]
        );
        
        // Invalidate to ensure consistency
        queryClient.invalidateQueries({
          queryKey: journalQueryKeys.entries(user.id)
        });
      }
      
      console.log('✅ Journal entry created successfully:', newEntry.id);
    },
    onError: (error) => {
      console.error('❌ Journal entry creation failed:', error);
      toast({
        title: t('error'),
        description: t('journal_entry_creation_failed'),
        variant: 'destructive',
      });
    }
  });
};

export const useUpdateJournalEntry = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, updates }: { entryId: string; updates: Partial<JournalEntry> }) =>
      optimizedJournalService.updateJournalEntry(entryId, updates),
    onSuccess: (updatedEntry) => {
      toast({
        title: t('success'),
        description: t('journal_entry_updated'),
      });
      
      // Optimistic update
      if (user?.id) {
        queryClient.setQueryData(
          journalQueryKeys.entries(user.id),
          (old: JournalEntry[] = []) => 
            old.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
        );
        
        queryClient.invalidateQueries({
          queryKey: journalQueryKeys.entries(user.id)
        });
      }
      
      console.log('✅ Journal entry updated successfully:', updatedEntry.id);
    },
    onError: (error) => {
      console.error('❌ Journal entry update failed:', error);
      toast({
        title: t('error'),
        description: t('journal_entry_update_failed'),
        variant: 'destructive',
      });
    }
  });
};

export const useDeleteJournalEntry = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => optimizedJournalService.deleteJournalEntry(entryId),
    onSuccess: (_, entryId) => {
      toast({
        title: t('success'),
        description: t('journal_entry_deleted'),
      });
      
      // Optimistic update - remove from existing entries
      if (user?.id) {
        queryClient.setQueryData(
          journalQueryKeys.entries(user.id),
          (old: JournalEntry[] = []) => old.filter(entry => entry.id !== entryId)
        );
        
        queryClient.invalidateQueries({
          queryKey: journalQueryKeys.entries(user.id)
        });
      }
      
      console.log('✅ Journal entry deleted successfully:', entryId);
    },
    onError: (error) => {
      console.error('❌ Journal entry deletion failed:', error);
      toast({
        title: t('error'),
        description: t('journal_entry_deletion_failed'),
        variant: 'destructive',
      });
    }
  });
};

export const useUploadJournalAttachment = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (file: File) => optimizedJournalService.uploadJournalAttachment(file, user!.id),
    onSuccess: (url) => {
      console.log('✅ Journal attachment uploaded successfully:', url);
    },
    onError: (error) => {
      console.error('❌ Journal attachment upload failed:', error);
      toast({
        title: t('error'),
        description: t('attachment_upload_failed'),
        variant: 'destructive',
      });
    }
  });
};

// Legacy compatibility hook that mimics the old useJournalEntries structure
export const useJournalEntries = () => {
  const { data: entries = [], isLoading: loading } = useOptimizedJournalEntries();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  return {
    entries,
    loading,
    addEntry: (entry: JournalEntry) => {
      const { id, createdAt, ...entryData } = entry;
      createMutation.mutate(entryData);
    },
    updateEntry: (entry: JournalEntry) => {
      updateMutation.mutate({ entryId: entry.id, updates: entry });
    },
    deleteEntry: (entryId: string) => {
      deleteMutation.mutate(entryId);
    }
  };
};