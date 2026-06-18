
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useState } from 'react';
import console from "@/lib/production-console";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/ui/use-mobile";
// Removed skeleton import - using instant loading
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  Users,
  Filter,
  X,
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, parseISO, isPast } from "date-fns";
import { useOptimizedSessions, useFilterPersons, useCreateSession, useUpdateSession, useConfirmSession, useDenySession, useDeleteSession } from "@/hooks/api/useOptimizedSessions";
import { Session } from "@/services/api/SessionService";
import SessionFilterDialog, {
  SessionFilters,
} from "@/components/dialogs/SessionFilterDialog";
import ScheduleSessionDialog from "@/components/dialogs/ScheduleSessionDialog";
import { Client } from "@/types/client";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { toast } from "sonner";
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import { useTranslation } from "react-i18next";

// Separate component for session card to properly use hooks
const SessionCard = ({ session, userType, onViewDetails, onConfirmSession, onCancelSession, onRequestUpdate }: { 
  session: Session; 
  userType: string;
  onViewDetails: (session: Session) => void;
  onConfirmSession: (sessionId: string) => void;
  onCancelSession: (sessionId: string) => void;
  onRequestUpdate: (sessionId: string) => void;
}) => {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const personId = userType === "client" ? session.therapist?.id : session.client?.id;
  const { avatarUrl } = useProfileAvatar(personId);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20";
      case "Completed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20";
      case "Denied":
        return "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "Video":
        return <Video className="w-4 h-4" />;
      case "In-Person":
        return <MapPin className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  // i18n helpers for robust status translation
  const tryT = (key: string) => {
    const v = t(key);
    return v !== key ? v : null;
  };
  const normalizeKey = (val?: string) =>
    (val || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_");
  const humanize = (val?: string) => {
    const s = (val || "").toString().replace(/_/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const translateSessionStatus = (status: string) => {
    const slug = normalizeKey(status);
    return tryT(`session_status.${slug}`) || tryT(slug) || humanize(status);
  };

  // Completely new simple permissions logic
  const getSessionPermissions = () => {
    if (!user?.id) return { canConfirm: false, canEdit: false, canCancel: false, canRequestUpdate: false, canDelete: false, canDeny: false };
    
    const isTherapist = session.therapist_id === user.id;
    const isClient = session.client_id === user.id;
    
    // Simple rule: Check who made the current request using current_requester_id
    if (session.status === "Pending") {
      if (session.current_requester_id === user.id) {
        // I made this request - I can only cancel/edit it
        return { canConfirm: false, canEdit: true, canCancel: true, canRequestUpdate: false, canDelete: false, canDeny: false };
      } else {
        // Someone else made the request - I can respond to it
        return { canConfirm: true, canEdit: false, canCancel: false, canRequestUpdate: false, canDelete: false, canDeny: true };
      }
    } else if (session.status === "Confirmed") {
      // CONFIRMED SESSIONS: Add request update button ONLY in view details mode (not in session list)
      return { canConfirm: false, canEdit: false, canCancel: false, canRequestUpdate: false, canDelete: false, canDeny: false };
    } else if (session.status === "Denied") {
      // DENIED SESSIONS: ONLY VIEW DETAILS (no other buttons)  
      return { canConfirm: false, canEdit: false, canCancel: false, canRequestUpdate: false, canDelete: false, canDeny: false };
    }
    
    return { canConfirm: false, canEdit: false, canCancel: false, canRequestUpdate: false, canDelete: false, canDeny: false };
  };

  const permissions = getSessionPermissions();

  return (
    <Card className="bg-[#111111] border-[#1f1f23] hover:border-[#333] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} alt={session.client?.full_name || session.therapist?.full_name || ''} className="non-invertable"/>
              <AvatarFallback className="bg-[#1a1a1a] text-gray-300">
                {(session.client?.full_name || session.therapist?.full_name || 'U')
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="text-white font-medium">{session.client?.full_name || session.therapist?.full_name || 'Unknown'}</h4>
              <p className="text-gray-400 text-sm">
                {userType === "client" ? t("therapist") : t("client")} •{" "}
                {t(session.session_type?.toLowerCase().replace(/\s+/g, '_') || 'individual_therapy')}
              </p>
            </div>
          </div>
          <Badge className={getStatusBadgeColor(session.status)}>
            {translateSessionStatus(session.status || 'Pending')}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-300">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {session.session_time} • {session.duration_minutes} min
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            {getSessionTypeIcon(session.session_format || 'Video')}
            <span className="text-sm">{session.location}</span>
          </div>
          {session.notes && (
            <p className="text-gray-400 text-sm mt-2">{session.notes}</p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
            onClick={() => onViewDetails(session)}
          >
            {t("view_details")}
          </Button>
          {permissions.canConfirm && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300"
              onClick={() => onConfirmSession(session.id)}
            >
              {t("confirm")}
            </Button>
          )}
          {permissions.canDeny && (
            <Button
              size="sm"
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              onClick={() => onCancelSession(session.id)}
            >
              {t("deny")}
            </Button>
          )}
          {permissions.canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300"
              onClick={() => onCancelSession(session.id)}
            >
              {t("cancel")}
            </Button>
          )}
          {permissions.canRequestUpdate && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300"
              onClick={() => onRequestUpdate(session.id)}
            >
              {t("request_update")}
            </Button>
          )}
          {permissions.canDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              onClick={() => onCancelSession(session.id)}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Sessions = () => {
  const { t } = useTranslation();
  const { userType } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const isMobile = useIsMobile();
  const { user } = useAuthManager();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SessionFilters>({
    status: [],
    sessionType: [],
    therapyType: [],
    person: "",
  });

  // Get client filter from URL
  const clientIdFilter = searchParams.get("clientId");
  const clientNameFilter = searchParams.get("clientName");

  // Use optimized hooks for data fetching
  const { 
    data: allSessions = [], 
    isLoading, 
    error 
  } = useOptimizedSessions(userType as 'client' | 'therapist');
  
  const { data: filterPersons = [] } = useFilterPersons(userType as 'client' | 'therapist');

  // Use optimized mutation hooks
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const confirmSessionMutation = useConfirmSession();
  const denySessionMutation = useDenySession();
  const deleteSessionMutation = useDeleteSession();

  const filterSessions = (sessionsList: Session[]) => {
    let filteredSessions = sessionsList.filter((session) => {
      const statusMatch =
        filters.status.length === 0 || filters.status.includes(session.status);
      const sessionTypeMatch =
        filters.sessionType.length === 0 ||
        filters.sessionType.includes(session.session_type);
      const therapyTypeMatch =
        filters.therapyType.length === 0 ||
        filters.therapyType.includes(session.therapy_type || '');
      const personMatch =
        !filters.person || (session.client?.full_name || '').includes(filters.person) || (session.therapist?.full_name || '').includes(filters.person);

      return statusMatch && sessionTypeMatch && therapyTypeMatch && personMatch;
    });

    // Apply client filter if present
    if (clientIdFilter || clientNameFilter) {
      filteredSessions = filteredSessions.filter((session) => {
        return clientNameFilter
          ? (session.client?.full_name || '')
              .toLowerCase()
              .includes(clientNameFilter.toLowerCase())
          : true;
      });
    }

    return filteredSessions;
  };

  // Separate upcoming and past sessions
  const upcomingSessions = filterSessions(allSessions.filter(session => !isPast(parseISO(session.session_date)) || isToday(parseISO(session.session_date))));
  const pastSessions = filterSessions(allSessions.filter(session => isPast(parseISO(session.session_date)) && !isToday(parseISO(session.session_date))));

  // Session filtering applied

  const handleScheduleSession = async (newSession: Omit<Session, "id">, clientId?: string) => {
    console.log("handleScheduleSession called with:", { newSession, clientId, selectedClientId });
    
    if (!user?.id) {
      toast.error("You must be logged in to schedule a session.");
      return;
    }

    let finalClientId = "";
    let finalTherapistId = "";

    if (userType === "client") {
      finalClientId = user.id;
      // The therapist ID is already set in the session data from the form
      finalTherapistId = newSession.therapist_id;
    } else if (userType === "therapist") {
      finalTherapistId = user.id;
      
      // Use the clientId passed from the dialog, or selectedClientId, or preselected client
      if (clientId) {
        finalClientId = clientId;
      } else if (selectedClientId) {
        finalClientId = selectedClientId;
      } else {
        const preselectedClient = getPreselectedClient();
        if (preselectedClient) {
          finalClientId = preselectedClient.id;
        }
      }
    }

    console.log("Final IDs:", { finalClientId, finalTherapistId });

    if (!finalClientId || finalClientId.includes('placeholder')) {
      toast.error("Please select a client before scheduling the session.");
      return;
    }

    if (!finalTherapistId || finalTherapistId.includes('placeholder')) {
      toast.error("Valid therapist selection is required.");
      return;
    }

    const sessionData = {
      client_id: finalClientId,
      therapist_id: finalTherapistId,
      session_date: newSession.session_date,
      session_time: newSession.session_time,
      session_type: newSession.session_type,
      therapy_type: newSession.therapy_type,
      session_format: newSession.session_format,
      location: newSession.location,
      duration_minutes: newSession.duration_minutes,
      notes: newSession.notes,
    };

    console.log("Creating session with data:", sessionData);
    createSessionMutation.mutate(sessionData);
  };

  const handleEditSession = async (updatedSession: Omit<Session, "id">) => {
    if (!editingSession) return;

    const sessionData = {
      session_date: updatedSession.session_date,
      session_time: updatedSession.session_time,
      session_type: updatedSession.session_type,
      therapy_type: updatedSession.therapy_type,
      session_format: updatedSession.session_format,
      location: updatedSession.location,
      duration_minutes: updatedSession.duration_minutes,
      status: updatedSession.status,
      notes: updatedSession.notes,
    };

    updateSessionMutation.mutate({ sessionId: editingSession.id, updates: sessionData });
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!editingSession || !user?.id) return;
    
    // Always delete the session when cancel/deny is pressed from the session card
    deleteSessionMutation.mutate(sessionId);
  };

  const handleCancelSession = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session || !user?.id) return;
    
    // Simple cancel/deny/delete logic
    if (session.status === "Pending") {
      if (session.therapist_id === user.id) {
        // Therapist denies the session
        denySessionMutation.mutate(sessionId);
      } else {
        // Client cancels the session
        deleteSessionMutation.mutate(sessionId);
      }
    } else if (session.status === "Denied") {
      // For denied sessions, always delete from user's view
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const handleRequestUpdate = (sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId);
    if (!session || !user?.id) return;
    
    // Change status to Pending and mark current user as the requester
    updateSessionMutation.mutate({ 
      sessionId, 
      updates: { 
        status: "Pending",
        current_requester_id: user.id
      } 
    });
  };

  const handleViewDetails = (session: Session) => {
    setEditingSession(session);
    setShowScheduleDialog(true);
  };

  const handleConfirmSession = (sessionId: string) => {
    confirmSessionMutation.mutate(sessionId);
  };

  const handleCloseScheduleDialog = () => {
    setShowScheduleDialog(false);
    setEditingSession(null);
    setSelectedClientId("");
  };

  const clearClientFilter = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("clientId");
    newSearchParams.delete("clientName");
    setSearchParams(newSearchParams);
  };

  // Get preselected client for therapist view
  const getPreselectedClient = () => {
    if (userType === "therapist" && clientIdFilter && clientNameFilter) {
      return {
        id: clientIdFilter,
        name: decodeURIComponent(clientNameFilter),
        firstName: decodeURIComponent(clientNameFilter).split(" ")[0] || "",
        lastName:
          decodeURIComponent(clientNameFilter).split(" ").slice(1).join(" ") ||
          "",
        email: `${decodeURIComponent(clientNameFilter)
          .toLowerCase()
          .replace(/\s+/g, ".")}@email.com`,
        phone: "+1 (555) 000-0000",
        status: "Active" as const,
        joinDate: new Date().toISOString().split("T")[0],
        lastSession: "Never",
      } as Client;
    }
    return undefined;
  };

  const getDateLabel = (dateString: string) => {
    const date = parseISO(dateString);

    if (isToday(date)) {
      return t("today");
    } else if (isTomorrow(date)) {
      return t("tomorrow");
    } else if (isThisWeek(date)) {
      const dayName = format(date, "EEEE").toLowerCase(); // Get day name and convert to lowercase
      return t(dayName); // Use translation key
    } else {
      return format(date, "MMMM d, yyyy"); // Full date
    }
  };

  const groupSessionsByDate = (sessions: Session[]) => {
    const grouped = sessions.reduce((acc, session) => {
      const dateLabel = getDateLabel(session.session_date);
      if (!acc[dateLabel]) {
        acc[dateLabel] = [];
      }
      acc[dateLabel].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    return grouped;
  };

  const renderSessionGroup = (dateLabel: string, sessions: Session[]) => (
    <div key={dateLabel} className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{dateLabel}</h3>
        <div className="h-px flex-1 bg-[#1f1f23]"></div>
        <span className="text-gray-400 text-sm">
          {sessions.length} {sessions.length === 1 ? t("session") : t("sessions")}
        </span>
      </div>
      <div className="grid gap-3">
         {sessions.map(session => (
           <SessionCard 
             key={session.id}
             session={session}
             userType={userType || "client"}
             onViewDetails={handleViewDetails}
             onConfirmSession={handleConfirmSession}
             onCancelSession={handleCancelSession}
             onRequestUpdate={handleRequestUpdate}
           />
         ))}
      </div>
    </div>
  );

  // Show content immediately - remove loading screen
  if (error) {
    return (
      <DashboardLayout userType={userType as "therapist" | "client"}>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400">{t("error_loading_sessions")}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">{t('sessions')}</h2>
            <p className="text-gray-400 text-sm">
              {userType === "client"
                ? t("view_manage_therapy_sessions")
                : t("manage_client_sessions_appointments")}
            </p>
            {clientNameFilter && (
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className="text-white border-[#333] bg-[#1a1a1a]"
                >
                  {t("filtered_by")}: {decodeURIComponent(clientNameFilter)}
                  <button
                    onClick={clearClientFilter}
                    className="ml-2 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>
          {!isMobile && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300"
                onClick={() => setShowFilterDialog(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {t("filter")}
              </Button>
              <Button
                size="sm"
                className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
                onClick={() => setShowScheduleDialog(true)}
              >
                <CalendarDays className="w-4 h-4 mr-2" />
                {userType === "client" ? t("request_session") : t("schedule_new")}
              </Button>
            </div>
          )}
        </div>

        {isMobile && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-neutral-300 w-full"
              onClick={() => setShowFilterDialog(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t("filter")}
            </Button>
            <Button
              size="sm"
              className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 w-full"
              onClick={() => setShowScheduleDialog(true)}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {userType === "client" ? t("request_session") : t("schedule_new")}
            </Button>
          </div>
        )}

        {/* Sessions Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#1a1a1a] border border-[#333] p-0 px-1 gap-1">
            <TabsTrigger
              value="upcoming"
              className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300"
            >
              {t("upcoming_sessions")}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300"
            >
              {t("session_history")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-6 mt-6">
            {Object.entries(groupSessionsByDate(upcomingSessions)).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{t("no_upcoming_sessions_found")}</p>
              </div>
            ) : (
              Object.entries(groupSessionsByDate(upcomingSessions)).map(
                ([dateLabel, sessionsForDate]) =>
                  renderSessionGroup(dateLabel, sessionsForDate)
              )
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            {Object.entries(groupSessionsByDate(pastSessions)).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">{t("no_past_sessions_found")}</p>
              </div>
            ) : (
              Object.entries(groupSessionsByDate(pastSessions)).map(
                ([dateLabel, sessionsForDate]) =>
                  renderSessionGroup(dateLabel, sessionsForDate)
              )
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <SessionFilterDialog
        isOpen={showFilterDialog}
        onClose={() => setShowFilterDialog(false)}
        onApplyFilters={setFilters}
        currentFilters={filters}
        userType={userType as "therapist" | "client"}
        availablePersons={filterPersons}
      />

      <ScheduleSessionDialog
        isOpen={showScheduleDialog}
        onClose={handleCloseScheduleDialog}
        onSchedule={(sessionData, clientId) => {
          console.log("Session data from dialog:", sessionData, "Client ID:", clientId);
          if (editingSession) {
            handleEditSession(sessionData);
          } else {
            handleScheduleSession(sessionData, clientId);
          }
        }}
        editingSession={editingSession}
        onDelete={
          editingSession
            ? () => handleDeleteSession(editingSession.id)
            : undefined
        }
        preselectedClient={getPreselectedClient()}
        userType={userType as "therapist" | "client"}
      />
    </DashboardLayout>
  );
};

export default Sessions;
