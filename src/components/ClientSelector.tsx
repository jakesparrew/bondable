
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { therapistClientService } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { toast } from "sonner";
import { Client } from "@/types/client";
import { supabase } from "@/integrations/supabase/client";

interface ClientSelectorProps {
  onSelectClient: (client: Client) => void;
  selectedClient: Client | null;
  preselectedClientId?: string | null;
}

interface ProfileData {
  id: string;
  avatar_url?: string;
  first_name: string | null;
  last_name: string | null;
}

const ClientSelector = ({ onSelectClient, selectedClient, preselectedClientId }: ClientSelectorProps) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useOptimizedState("");
  const [allClients, setAllClients] = useOptimizedState<Client[]>([]);
  const [currentMessageClients, setCurrentMessageClients] = useOptimizedState<Client[]>([]);
  const [loading, setLoading] = useOptimizedState(false); // Always false for instant loading
  const [hasProcessedPreselection, setHasProcessedPreselection] = useOptimizedState(false);
  const [profiles, setProfiles] = useOptimizedState<Record<string, ProfileData>>({});
  const [lastActivityMap, setLastActivityMap] = useOptimizedState<Record<string, string | null>>({});
  const { user } = useAuthManager();

// Fetch profile data for clients with caching
const fetchProfileData = async (clientIds: string[]) => {
  try {
    const { profileCache } = await import("@/services/cache");

    const profilesMap: Record<string, ProfileData> = {};
    const toFetch: string[] = [];

    // Seed from cache and collect missing IDs
    clientIds.forEach((id) => {
      const cached = profileCache.get<ProfileData>(`profile:${id}`);
      if (cached) {
        profilesMap[id] = cached;
      } else {
        toFetch.push(id);
      }
    });

    // Fetch only missing profiles
    if (toFetch.length > 0) {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, avatar_url, first_name, last_name")
        .in("id", toFetch);

      if (error) {
        console.error("Error fetching client profiles:", error);
      } else {
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile;
          // Cache for 10 minutes
          profileCache.set(`profile:${profile.id}`, profile, 10 * 60 * 1000);
        });
      }
    }

    setProfiles((prev) => ({ ...prev, ...profilesMap }));
  } catch (error) {
    console.error("Error in fetchProfileData:", error);
  }
};

// Load last activity from conversations for sorting
const loadLastActivityMap = async (therapistId: string) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('client_id,last_message_at')
      .eq('therapist_id', therapistId);

    if (error) {
      console.error('Error fetching last activity map:', error);
      return {} as Record<string, string | null>;
    }

    const map: Record<string, string | null> = {};
    data?.forEach((row: any) => {
      map[row.client_id] = row.last_message_at;
    });
    setLastActivityMap(map);
    return map;
  } catch (e) {
    console.error('Error in loadLastActivityMap:', e);
    return {} as Record<string, string | null>;
  }
};


  useOptimizedEffect(() => {
    const loadClients = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('Loading clients for therapist:', user.id);
        const clients = await therapistClientService.getClientsForTherapist(user.id);
        console.log('Loaded clients:', clients);
        
        // Filter out any clients with "Profile Not Found" as these are data issues
        const validClients = clients.filter(client => client.name !== 'Profile Not Found');
        
        // Load last activity timestamps and sort clients accordingly
        const activityMap = await loadLastActivityMap(user.id);
        const sortedClients = [...validClients].sort((a, b) => {
          const aTime = activityMap[a.id] ? new Date(activityMap[a.id] as string).getTime() : 0;
          const bTime = activityMap[b.id] ? new Date(activityMap[b.id] as string).getTime() : 0;
          return bTime - aTime;
        });
        
        setAllClients(sortedClients);
        setCurrentMessageClients(sortedClients.slice(0, 10));
        
        // Fetch profile data for the clients
        const clientIds = sortedClients.map(client => client.id);
        if (clientIds.length > 0) {
          fetchProfileData(clientIds);
        }
        
        // Only process preselection once and if it hasn't been processed yet
        if (preselectedClientId && !hasProcessedPreselection) {
          const preselectedClient = sortedClients.find(client => client.id === preselectedClientId);
          if (preselectedClient) {
            console.log('Found preselected client:', preselectedClient);
            onSelectClient(preselectedClient);
            setHasProcessedPreselection(true);
          } else {
            console.warn('Preselected client not found in valid clients list');
          }
        }
      } catch (error) {
        console.error("Error loading clients:", error);
        toast.error("Failed to load clients");
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    // Only load clients if we haven't loaded them yet or if the user changes
    if (!hasProcessedPreselection || allClients.length === 0) {
      loadClients();
    }
  }, [user, preselectedClientId, onSelectClient, hasProcessedPreselection, allClients.length]);

  // Realtime: resort when conversations update
  useOptimizedEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates-clientselector')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        const row: any = (payload as any).new || (payload as any).old;
        if (!row || row.therapist_id !== user.id) return;
        setLastActivityMap(prev => {
          const updated = { ...prev, [row.client_id]: row.last_message_at ?? row.updated_at ?? new Date().toISOString() };
          // Resort lists using updated map
          setAllClients(prevClients => {
            const sorted = [...prevClients].sort((a, b) => {
              const aTime = updated[a.id] ? new Date(updated[a.id] as string).getTime() : 0;
              const bTime = updated[b.id] ? new Date(updated[b.id] as string).getTime() : 0;
              return bTime - aTime;
            });
            return sorted;
          });
          setCurrentMessageClients(prevClients => {
            const sorted = [...prevClients].sort((a, b) => {
              const aTime = updated[a.id] ? new Date(updated[a.id] as string).getTime() : 0;
              const bTime = updated[b.id] ? new Date(updated[b.id] as string).getTime() : 0;
              return bTime - aTime;
            });
            return sorted;
          });
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

   const availableClients = allClients.filter(
    client => !currentMessageClients.some(msgClient => msgClient.id === client.id)
  );

  const filteredClients = currentMessageClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Inactive":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Active":
        return t("client_status_active");
      case "Inactive":
        return t("client_status_inactive");
      case "Pending":
        return t("client_status_pending");
      default:
        return status;
    }
  };

  const handleAddClient = (client: Client) => {
    setCurrentMessageClients(prev => [...prev, client]);
    onSelectClient(client);
  };

  const handleClientSelect = (client: Client) => {
    // Prevent duplicate selections
    if (selectedClient?.id === client.id) {
      return;
    }
    onSelectClient(client);
  };

  const getClientProfile = (clientId: string) => {
    return profiles[clientId];
  };

  return (
    <div className="w-full md:w-80 bg-card border-r border-border flex flex-col h-full md:rounded-bl-lg rounded-bl-none">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{t('clients')}</h2>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_clients')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">{t('loading_clients')}</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">
              {searchTerm ? t('no_clients_found_search') : t('no_clients_found_add')}
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredClients.map((client) => {
              const clientProfile = getClientProfile(client.id);
              
              return (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedClient?.id === client.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      {clientProfile?.avatar_url && (
                        <AvatarImage src={clientProfile.avatar_url} alt={client.name} className='non-invertable'/>
                      )}
                      <AvatarFallback className="bg-muted text-foreground text-sm">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground font-medium text-sm truncate">
                          {client.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(client.status)}`}
                        >
                          {getStatusText(client.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">{client.email}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientSelector;
