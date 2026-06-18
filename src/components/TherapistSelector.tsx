
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { therapistService, Therapist } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface TherapistSelectorProps {
  onSelectTherapist: (therapist: Therapist) => void;
  selectedTherapist: Therapist | null;
  preselectedTherapistId?: string | null;
}

interface ProfileData {
  id: string;
  avatar_url?: string;
  first_name: string | null;
  last_name: string | null;
}

const TherapistSelector = ({
  onSelectTherapist,
  selectedTherapist,
  preselectedTherapistId,
}: TherapistSelectorProps) => {
  const [searchTerm, setSearchTerm] = useOptimizedState("");
  const [allTherapists, setAllTherapists] = useOptimizedState<Therapist[]>([]);
  const [currentMessageTherapists, setCurrentMessageTherapists] = useOptimizedState<
    Therapist[]
  >([]);
  const [loading, setLoading] = useOptimizedState(false); // Always false for instant loading
  const [profiles, setProfiles] = useOptimizedState<Record<string, ProfileData>>({});
  const [lastActivityMap, setLastActivityMap] = useOptimizedState<Record<string, string | null>>({});
  const { user } = useAuthManager();
  const { t } = useTranslation();

// Fetch profile data for therapists with caching
const fetchProfileData = async (therapistIds: string[]) => {
  try {
    const { profileCache } = await import("@/services/cache");

    const profilesMap: Record<string, ProfileData> = {};
    const toFetch: string[] = [];

    therapistIds.forEach((id) => {
      const cached = profileCache.get<ProfileData>(`profile:${id}`);
      if (cached) {
        profilesMap[id] = cached;
      } else {
        toFetch.push(id);
      }
    });

    if (toFetch.length > 0) {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("id, avatar_url, first_name, last_name")
        .in("id", toFetch);

      if (error) {
        console.error("Error fetching therapist profiles:", error);
      } else {
        profilesData?.forEach((profile) => {
          profilesMap[profile.id] = profile;
          profileCache.set(`profile:${profile.id}`, profile, 10 * 60 * 1000);
        });
      }
    }

    setProfiles((prev) => ({ ...prev, ...profilesMap }));
  } catch (error) {
    console.error("Error in fetchProfileData:", error);
  }
};

// Load last activity for conversations to sort therapists for a client
const loadLastActivityMap = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('therapist_id,last_message_at')
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching last activity map (therapists):', error);
      return {} as Record<string, string | null>;
    }

    const map: Record<string, string | null> = {};
    data?.forEach((row: any) => {
      map[row.therapist_id] = row.last_message_at;
    });
    setLastActivityMap(map);
    return map;
  } catch (e) {
    console.error('Error in loadLastActivityMap (therapists):', e);
    return {} as Record<string, string | null>;
  }
};


  // Load therapists from database
  useOptimizedEffect(() => {
    const loadTherapists = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // For clients, only load connected therapists
        // For therapists (admin purposes), load all therapists
        const therapists = await therapistService.getConnectedTherapists(user.id);
        
        console.log('Loaded connected therapists for client:', therapists);

        // Load last activity timestamps and sort therapists accordingly
        const activityMap = await loadLastActivityMap(user.id);
        const sortedTherapists = [...therapists].sort((a, b) => {
          const aTime = activityMap[a.id] ? new Date(activityMap[a.id] as string).getTime() : 0;
          const bTime = activityMap[b.id] ? new Date(activityMap[b.id] as string).getTime() : 0;
          return bTime - aTime;
        });

        setAllTherapists(sortedTherapists);
        // Initially show all connected therapists in messages (sorted)
        setCurrentMessageTherapists(sortedTherapists);

        // Fetch profile data for the therapists
        const therapistIds = sortedTherapists.map(therapist => therapist.id);
        if (therapistIds.length > 0) {
          fetchProfileData(therapistIds);
        }

        if (preselectedTherapistId) {
          const preselected = therapists.find(
            (t) => t.id === preselectedTherapistId
          );
          if (preselected) {
            onSelectTherapist(preselected);
          }
        }
      } catch (error) {
        console.error("Error loading connected therapists:", error);
        toast.error(t("failed_to_load_therapists"));
      } finally {
        setLoading(false);
      }
    };

    loadTherapists();
  }, [user]);

  // Realtime: resort when conversations update for this client
  useOptimizedEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates-therapistselector')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, (payload) => {
        const row: any = (payload as any).new || (payload as any).old;
        if (!row || row.client_id !== user.id) return;
        setLastActivityMap(prev => {
          const updated = { ...prev, [row.therapist_id]: row.last_message_at ?? row.updated_at ?? new Date().toISOString() };
          setAllTherapists(prevItems => {
            const sorted = [...prevItems].sort((a, b) => {
              const aTime = updated[a.id] ? new Date(updated[a.id] as string).getTime() : 0;
              const bTime = updated[b.id] ? new Date(updated[b.id] as string).getTime() : 0;
              return bTime - aTime;
            });
            return sorted;
          });
          setCurrentMessageTherapists(prevItems => {
            const sorted = [...prevItems].sort((a, b) => {
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

  // Therapists available to add to messages (not currently in the list) - use email for comparison
  const availableTherapists = allTherapists.filter(
    (therapist) =>
      !currentMessageTherapists.some(
        (msgTherapist) => msgTherapist.email === therapist.email
      )
  );

  const filteredTherapists = currentMessageTherapists.filter(
    (therapist) =>
      therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      therapist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      therapist.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Busy":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Away":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case "Available":
        return t("available");
      case "Busy":
        return t("busy");
      case "Away":
        return t("away");
      default:
        return status;
    }
  };

  const handleAddTherapist = (therapist: Therapist) => {
    setCurrentMessageTherapists((prev) => {
      // Check if therapist already exists using email instead of just ID
      if (prev.some((t) => t.email === therapist.email)) return prev;
      return [...prev, therapist];
    });
    onSelectTherapist(therapist);
  };

  const getTherapistProfile = (therapistId: string) => {
    return profiles[therapistId];
  };

  if (loading) {
    return (
      <div className="w-full md:w-80 bg-card border-r border-border flex flex-col h-full">
        <div className="p-4 text-center">
          <p className="text-muted-foreground text-sm">{t("loading_therapists")}</p>
        </div>
      </div>
    );
  }

  if (allTherapists.length === 0) {
    return (
      <div className="w-full md:w-80 bg-card border-r border-border flex flex-col h-full">
        <div className="p-4 text-center">
          <p className="text-muted-foreground text-sm">{t("no_connected_therapists_found")}</p>
          <p className="text-muted-foreground text-xs mt-2">{t("connect_with_therapist")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{t("your_therapists")}</h2>
          {availableTherapists.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-card border-border text-foreground"
              >
                {availableTherapists.map((therapist) => {
                  const therapistProfile = getTherapistProfile(therapist.id);
                  
                  return (
                    <DropdownMenuItem
                      key={`${therapist.id}-${therapist.email}`}
                      onClick={() => handleAddTherapist(therapist)}
                      className="p-3 cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Avatar className="w-8 h-8">
                          {therapistProfile?.avatar_url && (
                            <AvatarImage src={therapistProfile.avatar_url} alt={therapist.name} />
                          )}
                          <AvatarFallback className="bg-muted text-foreground text-xs">
                              {therapist.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-foreground font-medium text-sm truncate">
                              {therapist.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ml-2 ${getStatusColor(
                                therapist.status
                              )}`}
                            >
                              {getStatusTranslation(therapist.status)}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs truncate">
                            {therapist.email}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_therapists")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      </div>

      {/* Therapists List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTherapists.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-muted-foreground text-sm">{t("no_therapists_found")}</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredTherapists.map((therapist) => {
              const therapistProfile = getTherapistProfile(therapist.id);
              
              return (
                <div
                  key={`${therapist.id}-${therapist.email}`}
                  onClick={() => onSelectTherapist(therapist)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                    selectedTherapist?.id === therapist.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      {therapistProfile?.avatar_url && (
                        <AvatarImage src={therapistProfile.avatar_url} alt={therapist.name} />
                      )}
                      <AvatarFallback className="bg-muted text-foreground text-sm">
                        {therapist.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground font-medium text-sm truncate">
                          {therapist.name}
                        </h3>
                        <Badge
                          variant="outline"
                            className={`text-xs ${getStatusColor(
                            therapist.status
                          )}`}
                          >
                            {getStatusTranslation(therapist.status)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">
                        {therapist.email}
                      </p>
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

export default TherapistSelector;
