import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { optimizedClientTherapistService } from '@/services/api/optimized/clientTherapistService';
import { useAuthManager } from './useAuthManager';
import { useToast } from '@/hooks/ui/use-toast';
import { useTranslation } from 'react-i18next';

// Query keys for cache management
export const therapistQueryKeys = {
  all: ['therapists'] as const,
  connected: (clientId: string) => ['therapists', 'connected', clientId] as const,
  clients: (therapistId: string) => ['therapist', 'clients', therapistId] as const,
};

export const useConnectedTherapists = (enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: therapistQueryKeys.connected(user?.id || ''),
    queryFn: () => optimizedClientTherapistService.getConnectedTherapists(user!.id),
    enabled: enabled && !!user?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
};

export const useTherapistClients = (enabled = true) => {
  const { user } = useAuthManager();
  
  return useQuery({
    queryKey: therapistQueryKeys.clients(user?.id || ''),
    queryFn: () => optimizedClientTherapistService.getClientsForTherapist(user!.id),
    enabled: enabled && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });
};

export const useConnectToTherapist = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => 
      optimizedClientTherapistService.connectToTherapist(inviteCode, user!.id),
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: t("success"),
          description: t("connected_to_therapist", { name: result.therapistName }),
        });
        
        // Invalidate and refetch connected therapists
        queryClient.invalidateQueries({
          queryKey: therapistQueryKeys.connected(user!.id)
        });
      } else {
        toast({
          title: t("error"),
          description: result.error || t("connection_failed"),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Connection error:', error);
      toast({
        title: t("error"),
        description: t("connection_failed"),
        variant: "destructive",
      });
    }
  });
};

export const useDisconnectFromTherapist = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (therapistId: string) => 
      optimizedClientTherapistService.disconnectFromTherapist(user!.id, therapistId),
    onSuccess: (success) => {
      if (success) {
        toast({
          title: t("success"),
          description: t("disconnected_from_therapist"),
        });
        
        // Invalidate and refetch connected therapists
        queryClient.invalidateQueries({
          queryKey: therapistQueryKeys.connected(user!.id)
        });
      } else {
        toast({
          title: t("error"),
          description: t("disconnect_failed"),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Disconnect error:', error);
      toast({
        title: t("error"),
        description: t("disconnect_failed"),
        variant: "destructive",
      });
    }
  });
};

export const useDisconnectClient = () => {
  const { user } = useAuthManager();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => 
      optimizedClientTherapistService.disconnectClient(user!.id, clientId),
    onSuccess: (success) => {
      if (success) {
        toast({
          title: t("success"),
          description: t("client_disconnected"),
        });
        
        // Invalidate and refetch therapist clients
        queryClient.invalidateQueries({
          queryKey: therapistQueryKeys.clients(user!.id)
        });
      } else {
        toast({
          title: t("error"),
          description: t("disconnect_failed"),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Client disconnect error:', error);
      toast({
        title: t("error"),
        description: t("disconnect_failed"),
        variant: "destructive",
      });
    }
  });
};

export const useUpdateClientProfile = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: any }) => 
      optimizedClientTherapistService.updateClientProfile(clientId, updates),
    onSuccess: (success) => {
      if (success) {
        toast({
          title: t("success"),
          description: t("profile_updated"),
        });
        
        // Invalidate related queries
        queryClient.invalidateQueries({
          queryKey: ['therapist', 'clients']
        });
      } else {
        toast({
          title: t("error"),
          description: t("update_failed"),
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: t("error"),
        description: t("update_failed"),
        variant: "destructive",
      });
    }
  });
};