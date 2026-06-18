
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Lock, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientTherapistService, ConnectedTherapist } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import { useTranslation } from "react-i18next";

interface Therapist {
  id: string;
  name: string;
  specialty: string;
  status: "Available" | "Busy" | "Away";
}

interface TherapistSharingSelectorProps {
  selectedTherapists: Therapist[];
  onSelectTherapists: (therapists: Therapist[]) => void;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
}

const TherapistAvatar = ({ therapistId, name }: { therapistId: string; name: string }) => {
  const { avatarUrl } = useProfileAvatar(therapistId);
  
  return (
    <Avatar className="w-8 h-8">
      <AvatarImage src={avatarUrl} alt={name} className="non-invertable" />
      <AvatarFallback className="bg-[#27272a] text-white text-xs">
        {name.split(' ').map(n => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
  );
};

export const TherapistSharingSelector = ({ 
  selectedTherapists, 
  onSelectTherapists, 
  isPrivate, 
  onTogglePrivacy 
}: TherapistSharingSelectorProps) => {
  const [connectedTherapists, setConnectedTherapists] = useOptimizedState<Therapist[]>([]);
  const [loading, setLoading] = useOptimizedState(true);
  const { user } = useAuthManager();
  const { t } = useTranslation();

  useOptimizedEffect(() => {
    const loadConnectedTherapists = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const therapists = await clientTherapistService.getConnectedTherapists(user.id);
        console.log("Loaded connected therapists:", therapists);
        
        // Transform ConnectedTherapist to Therapist interface
        const transformedTherapists: Therapist[] = therapists.map(therapist => ({
          id: therapist.id,
          name: therapist.name,
          specialty: therapist.specialization,
          status: therapist.status as "Available" | "Busy" | "Away"
        }));
        
        setConnectedTherapists(transformedTherapists);
      } catch (error) {
        console.error("Error loading connected therapists:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConnectedTherapists();
  }, [user]);

  const handlePrivateClick = () => {
    if (!isPrivate) {
      onTogglePrivacy();
      onSelectTherapists([]);
    }
  };

  const handleTherapistSelection = (therapist: Therapist) => {
    if (isPrivate) {
      onTogglePrivacy();
    }
    
    const isSelected = selectedTherapists.some(t => t.id === therapist.id);
    if (isSelected) {
      onSelectTherapists(selectedTherapists.filter(t => t.id !== therapist.id));
    } else {
      onSelectTherapists([...selectedTherapists, therapist]);
    }
  };

  const removeTherapist = (therapistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTherapists(selectedTherapists.filter(t => t.id !== therapistId));
  };

  const getButtonText = () => {
    if (loading) return t("loading");
    if (connectedTherapists.length === 0) return t("no_therapists");
    if (selectedTherapists.length === 0) return t("share_with_therapist");
    if (selectedTherapists.length === 1) return selectedTherapists[0].name;
    return `${selectedTherapists.length} ${t("therapists")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrivateClick}
          className={`border-[#333] hover:bg-[#2a2a2a] text-gray-300 hover:text-white rounded-lg px-3 py-1.5 font-medium ${
            isPrivate ? "bg-[#2a2a2a] text-white" : "bg-[#1a1a1a]"
          }`}
        >
          <Lock className="w-3 h-3 mr-1" />
          {t("private")}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || connectedTherapists.length === 0}
              className={`border-[#333] hover:bg-[#2a2a2a] text-gray-300 hover:text-white rounded-lg px-3 py-1.5 font-medium ${
                !isPrivate ? "bg-[#2a2a2a] text-white" : "bg-[#1a1a1a]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Users className="w-3 h-3 mr-1" />
              {getButtonText()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-64 bg-[#1a1a1a] border-[#1f1f23] text-white z-50"
          >
            {connectedTherapists.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-sm">
                {t("no_connected_therapists_found")}
              </div>
            ) : (
              connectedTherapists.map((therapist) => (
                <DropdownMenuItem
                  key={therapist.id}
                  onClick={() => handleTherapistSelection(therapist)}
                  className="p-3 cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white"
                >
                  <div className="flex items-center space-x-3 w-full">
                    <TherapistAvatar therapistId={therapist.id} name={therapist.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium text-sm truncate">
                          {therapist.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {selectedTherapists.some(t => t.id === therapist.id) && !isPrivate && (
                            <Check className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{therapist.specialty}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Selected therapists badges */}
      {!isPrivate && selectedTherapists.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTherapists.map((therapist) => (
            <Badge 
              key={therapist.id}
              variant="secondary"
              className="bg-[#2a2a2a] text-gray-300 border-[#333] text-xs pr-1"
            >
              {therapist.name}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 ml-1 hover:bg-[#3a3a3a] text-gray-400 hover:text-white"
                onClick={(e) => removeTherapist(therapist.id, e)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
