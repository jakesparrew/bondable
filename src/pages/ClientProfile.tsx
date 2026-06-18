import React from "react";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  BookOpen,
  MessageSquare,
  ArrowLeft,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  FileText,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { enUS, es as esLocale, fr as frLocale } from "date-fns/locale";
import { RequiredInput } from "@/components/ui/required-input";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TasksPagination from "@/components/TasksPagination";
import { OptionalInput } from "@/components/ui/optional-input";
import { useSharedJournalEntries } from "@/hooks/api/useSharedJournalEntries";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  useFullClientProfile,
  useUpdateClientProfile,
  useClientProfileCacheManager,
} from "@/hooks/api/useOptimizedClientProfile";
import type { ClientProfileData } from "@/services/api/optimized/clientProfileService";
import { ClientIntakeTab } from "@/components/intake/ClientIntakeTab";

// Transform journal entry type
interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
}

export default function OptimizedClientProfile() {
  const { t, i18n } = useTranslation();
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { preloadClientProfile } = useClientProfileCacheManager();
  
  // State management
  const [isEditing, setIsEditing] = useOptimizedState(false);
  const [expandedSession, setExpandedSession] = useOptimizedState<number | null>(null);
  const [expandedJournal, setExpandedJournal] = useOptimizedState<string | null>(null);
  const [expandedTask, setExpandedTask] = useOptimizedState<string | null>(null);
  const [currentTherapistId, setCurrentTherapistId] = useOptimizedState<string>("");
  const [activeTab, setActiveTab] = useOptimizedState("sessions");
  const [editForm, setEditForm] = useOptimizedState<ClientProfileData | null>(null);

  // Pagination states
  const [sessionsPage, setSessionsPage] = useOptimizedState(1);
  const [journalsPage, setJournalsPage] = useOptimizedState(1);
  const [tasksPage, setTasksPage] = useOptimizedState(1);
  const itemsPerPage = 5;

  // API hooks
  const {
    data: profileResponse,
    isLoading,
    error: profileError,
    refetch,
  } = useFullClientProfile(clientId);

  const updateClientMutation = useUpdateClientProfile();

  // Use the shared journal entries hook
  const { entries: sharedJournalEntries, loading: journalsLoading } =
    useSharedJournalEntries(currentTherapistId, clientId || "");

  // Extract data from response
  const client = profileResponse?.client;
  const sessions = profileResponse?.sessions || [];
  const tasks = profileResponse?.tasks || [];
  const error = profileResponse?.error || (profileError ? String(profileError) : null);

  // Get current therapist ID
  useOptimizedEffect(() => {
    const getCurrentTherapistId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          console.log("Current therapist ID:", user.id);
          setCurrentTherapistId(user.id);
        }
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };

    getCurrentTherapistId();
  }, []);

  // Preload optimization
  useOptimizedEffect(() => {
    if (clientId) {
      preloadClientProfile(clientId);
    }
  }, [clientId, preloadClientProfile]);

  // Initialize edit form when client data loads
  useOptimizedEffect(() => {
    if (client && !editForm) {
      setEditForm(client);
    }
  }, [client]);

  // Transform shared journal entries to match the JournalEntry interface
  const journals: JournalEntry[] = sharedJournalEntries.map((entry) => ({
    id: entry.id,
    date: entry.entry_date,
    title: entry.title,
    content: entry.content,
    mood: entry.mood || "Neutral",
    createdAt: entry.created_at,
  }));

  console.log("Current therapist ID:", currentTherapistId);
  console.log("Client ID:", clientId);
  console.log("Shared journal entries from hook:", sharedJournalEntries);
  console.log("Transformed journals for display:", journals);

  // Pagination logic
  const paginateData = (data: any[], page: number) => {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const paginatedSessions = paginateData(sessions, sessionsPage);
  const paginatedJournals = paginateData(journals, journalsPage);
  const paginatedTasks = paginateData(tasks, tasksPage);

  const totalSessionsPages = Math.ceil(sessions.length / itemsPerPage);
  const totalJournalsPages = Math.ceil(journals.length / itemsPerPage);
  const totalTasksPages = Math.ceil(tasks.length / itemsPerPage);

  // Event handlers
  const handleGoBack = () => {
    navigate("/dashboard/therapist/clients");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditForm(client);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(client);
  };

  const handleSave = async () => {
    if (!editForm || !clientId) return;

    try {
      await updateClientMutation.mutateAsync({
        clientId,
        updates: {
          status: editForm.status,
          notes: editForm.notes,
        },
      });
      
      setIsEditing(false);
      console.log("Client updated successfully");
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  // Badge color helpers
  const getMoodBadgeColor = (mood: string) => {
    switch (mood) {
      case "Good":
        return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
      case "Better":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20";
      case "Neutral":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 ";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
    }
  };

  const getTaskStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
      case "in progress":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20";
      case "assigned":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/20";
      case "overdue":
        return "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/20";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20";
      case "Inactive":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/20";
    }
  };

  // i18n helpers
  const humanize = (s: string) =>
    s
      ?.toString()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const normalizeKey = (s: string) =>
    s?.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // Canonical slug mapping for noisy inputs
  const typeKeyMap: Record<string, string> = {
    individual_therapy: "individual_therapy",
    individual: "individual_therapy",
    invidual_therapy: "individual_therapy", // common misspelling
    therapy_individual: "individual_therapy",

    couples_therapy: "couples_therapy",
    couple_therapy: "couples_therapy",
    couples: "couples_therapy",

    group_therapy: "group_therapy",
    group: "group_therapy",

    family_therapy: "family_therapy",
    family: "family_therapy",

    assessment: "assessment",
    follow_up: "follow_up",
    initial_consultation: "initial_consultation",

    video: "video_call",
    video_call: "video_call",
    phone: "phone_call",
    phone_call: "phone_call",
    in_person: "in_person",
    online: "online",
    telehealth: "online",
  };

  const tryT = (key: string) => {
    const v = t(key);
    return v !== key ? v : null;
  };

  const translateSessionType = (type: string) => {
    const norm = normalizeKey(type);
    const slug = typeKeyMap[norm] ?? norm;

    // Try several possible locations for the translation
    return (
      tryT(`session_type.${slug}`) ||
      tryT(slug) || // top-level keys (e.g., individual_therapy)
      tryT(`therapy_type.${slug}`) ||
      humanize(type)
    );
  };

  const translateSessionStatus = (status: string) => {
    const slug = normalizeKey(status);
    return tryT(`session_status.${slug}`) || tryT(slug) || humanize(status);
  };

  const getDateLocale = () => {
    const lang = i18n.language?.split("-")[0];
    switch (lang) {
      case "es":
        return esLocale;
      case "fr":
        return frLocale;
      default:
        return enUS;
    }
  };

  // Loading state
  if (isLoading || journalsLoading) {
    return (
      <DashboardLayout userType="therapist">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("loading_client_profile")}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <DashboardLayout userType="therapist">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red-400">{error || t("client_not_found")}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="therapist">
      <div className="space-y-6">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="text-gray-400 hover:text-white hover:bg-[#1f1f23] p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back_to_clients")}
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Avatar className="h-12 w-12 md:h-16 md:w-16 self-start md:self-auto">
              <AvatarImage
                src={client.image}
                alt={client.name}
                className="non-invertable"
              />
              <AvatarFallback className="bg-[#1a1a1a] text-gray-300 text-sm md:text-lg">
                {client.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white break-words">
                {client.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                <Badge
                  className={`${getStatusBadgeColor(client.status)} text-xs`}
                >
                  {client.status}
                </Badge>
                <span className="text-gray-400 text-sm">
                  {t("client_since", { date: client.joinDate })}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Controls */}
          <div className="flex gap-2 self-start md:self-auto md:-mb-10">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateClientMutation.isPending}
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white text-sm md:text-base"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateClientMutation.isPending}
                  className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 text-sm md:text-base"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateClientMutation.isPending ? "Saving..." : t("save")}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleEdit}
                className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 text-sm md:text-base"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t("edit_client")}
              </Button>
            )}
          </div>
        </div>

        {/* Contact Information with Notes - Full Width */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              {t("contact_information")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing && editForm ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RequiredInput
                    label={t("full_name")}
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    readOnly
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">
                      {t("status")} <span className="text-red-400">*</span>
                    </label>
                    <Select
                      value={editForm.status}
                      onValueChange={(
                        value: "Active" | "Inactive" | "Pending"
                      ) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger className="bg-[#0a0a0a] border-[#1f1f23] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#1f1f23]">
                        <SelectItem
                          value="Active"
                          className="text-gray-300 hover:bg-[#2a2a2a]"
                        >
                          Active
                        </SelectItem>
                        <SelectItem
                          value="Inactive"
                          className="text-gray-300 hover:bg-[#2a2a2a]"
                        >
                          Inactive
                        </SelectItem>
                        <SelectItem
                          value="Pending"
                          className="text-gray-300 hover:bg-[#2a2a2a]"
                        >
                          Pending
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EmailInput
                    label="Email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    required
                    readOnly
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <PhoneInputComponent
                    required
                    label="Phone"
                    value={editForm.phone}
                    onChange={(newValue) =>
                      setEditForm({ ...editForm, phone: newValue })
                    }
                    readOnly
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">
                    {t("full_name")} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem] break-words">
                    {client.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">
                    {t("status")} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem]">
                    {client.status}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem] pl-9 break-all">
                      {client.email}
                    </div>
                    <div className="text-gray-500 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3">
                      <Mail size={16} aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-gray-300 text-sm font-medium">
                    Phone <span className="text-red-400">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem]">
                    {client.phone}
                  </div>
                </div>
              </div>
            )}

            <Separator className="bg-[#1f1f23]" />

            <div>
              <h4 className="text-white font-medium mb-4">{t('emergency_contact')}</h4>
              {isEditing && editForm ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <OptionalInput
                    label="Name"
                    readOnly
                    value={editForm.emergencyContact.name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContact: {
                          ...editForm.emergencyContact,
                          name: e.target.value,
                        },
                      })
                    }
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <OptionalInput
                    label="Relationship"
                    readOnly
                    value={editForm.emergencyContact.relationship}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContact: {
                          ...editForm.emergencyContact,
                          relationship: e.target.value,
                        },
                      })
                    }
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white placeholder:text-gray-500 focus:border-gray-400"
                  />
                  <PhoneInputComponent
                    label="Phone"
                    readOnly
                    value={editForm.emergencyContact.phone}
                    onChange={(newValue) =>
                      setEditForm({
                        ...editForm,
                        emergencyContact: {
                          ...editForm.emergencyContact,
                          phone: newValue,
                        },
                      })
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">
                      Name
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem] break-words">
                      {client.emergencyContact.name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">
                      Relationship
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem]">
                      {client.emergencyContact.relationship}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-300 text-sm font-medium">
                      Phone
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-[#1f1f23] bg-[#1a1a1a] px-3 py-2 text-gray-500 text-[.9rem]">
                      {client.emergencyContact.phone}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-[#1f1f23]" />

            <div>
              <h4 className="text-white font-medium mb-2">{t('therapist_notes')}</h4>
              <Textarea
                value={isEditing && editForm ? editForm.notes : client.notes || ""}
                onChange={
                  isEditing && editForm
                    ? (e) => setEditForm({ ...editForm, notes: e.target.value })
                    : undefined
                }
                readOnly={!isEditing}
                className={`${isEditing ? "bg-[#0a0a0a] text-white placeholder:text-gray-500 focus:border-gray-400" : "bg-[#1a1a1a] text-gray-500"} border-[#1f1f23] min-h-20`}
                placeholder={t('enter_notes_placeholder')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Table for Sessions, Journal Entries, and Tasks */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 gap-1">
                <TabsTrigger value="sessions" className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300">{t('sessions')}</TabsTrigger>
                <TabsTrigger value="journals" className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300">
                  {t('shared_journals')} ({journals.length})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300">{t('tasks')}</TabsTrigger>
                <TabsTrigger value="intake" className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300">{t("intake:intake_tab")}</TabsTrigger>
              </TabsList>

              {/* --- SESSIONS --- */}
              <TabsContent value="sessions" className="space-y-4">
                {sessions.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div className="pt-3">
                      <h4 className="text-lg font-medium">{t('no_sessions')}</h4>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            {t('no_sessions_desc')}
                          </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12" />
                            <TableHead>{t('column_date')}</TableHead>
                            <TableHead>{t('column_type')}</TableHead>
                            <TableHead className="hidden md:table-cell">
                              {t('column_duration')}
                            </TableHead>
                            <TableHead>{t('column_status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedSessions.map((session, idx) => {
                            const isOpen = expandedSession === idx;
                            const key = `sess-${session.id}`;
                            return [
                              <TableRow
                                key={key}
                                onClick={() =>
                                  setExpandedSession(isOpen ? null : idx)
                                }
                                className="border-[#1f1f23] hover:bg-[#1a1a1a] cursor-pointer"
                              >
                                <TableCell className="text-center">
                                  {isOpen ? (
                                    <ChevronDown className="mx-auto w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="mx-auto w-4 h-4 text-gray-400" />
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-300">
                                  <div className="md:hidden">
                                    {format(parseISO(session.date), "MMM d", { locale: getDateLocale() })}
                                  </div>
                                  <div className="hidden md:block">
                                    {format(
                                      parseISO(session.date),
                                      "MMM d, yyyy",
                                      { locale: getDateLocale() }
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-300">
                                  {translateSessionType(session.type)}
                                </TableCell>
                                <TableCell className="text-gray-300 hidden md:table-cell">
                                  {session.duration}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${getStatusBadgeColor(
                                      session.status
                                    )} text-xs`}
                                  >
                                    {translateSessionStatus(session.status)}
                                  </Badge>
                                </TableCell>
                              </TableRow>,
                              isOpen && (
                                <TableRow
                                  key={`${key}-detail`}
                                  className="border-[#1f1f23]"
                                >
                                  <TableCell
                                    colSpan={5}
                                    className="bg-[#0a0a0a] p-4"
                                  >
                                    <h4 className="text-white font-medium mb-2">
                                      {t('session_notes')}
                                    </h4>
                                    <p className="text-gray-300">
                                      {session.notes}
                                    </p>
                                  </TableCell>
                                </TableRow>
                              ),
                            ];
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {sessions.length > itemsPerPage && (
                      <TasksPagination
                        currentPage={sessionsPage}
                        totalPages={totalSessionsPages}
                        onPageChange={setSessionsPage}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              {/* --- JOURNALS --- */}
              <TabsContent value="journals" className="space-y-4">
                {journals.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div className="pt-3">
                        <h4 className="text-lg font-medium">
                          {t('no_shared_journal_entries')}
                        </h4>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {t('no_shared_journal_entries_desc')}
                        </p>
                        {!currentTherapistId && (
                          <p className="text-sm text-amber-600">
                            {t('unable_to_determine_therapist_id')}
                          </p>
                        )}
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {paginateData(journals, journalsPage).map((journal) => (
                      <Card key={journal.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{journal.title}</h4>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                {format(new Date(journal.date), "PPP", { locale: getDateLocale() })}
                                <Badge className={`${getMoodBadgeColor(journal.mood)} text-xs`}>
                                  {journal.mood}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed">
                            {journal.content}
                          </p>
                        </div>
                      </Card>
                    ))}

                    {journals.length > itemsPerPage && (
                      <TasksPagination
                        currentPage={journalsPage}
                        totalPages={Math.ceil(journals.length / itemsPerPage)}
                        onPageChange={setJournalsPage}
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              {/* --- TASKS --- */}
              <TabsContent value="tasks" className="space-y-4">
                {tasks.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div className="pt-3">
                      <h4 className="text-lg font-medium">{t('no_tasks')}</h4>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          {t('no_tasks_desc')}
                        </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12" />
                            <TableHead>{t('title')}</TableHead>
                              <TableHead className="hidden md:table-cell">
                                {t('due_date')}
                              </TableHead>
                            <TableHead>{t('priority')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTasks.map((task) => {
                            const isOpen = expandedTask === task.id;
                            const key = `task-${task.id}`;
                            return [
                              <TableRow
                                key={key}
                                onClick={() =>
                                  setExpandedTask(isOpen ? null : task.id)
                                }
                                className="border-[#1f1f23] hover:bg-[#1a1a1a] cursor-pointer"
                              >
                                <TableCell className="text-center">
                                  {isOpen ? (
                                    <ChevronDown className="mx-auto w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="mx-auto w-4 h-4 text-gray-400" />
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-300">
                                  {task.title}
                                </TableCell>
                                <TableCell className="text-gray-300 hidden md:table-cell">
                                  {task.dueDate
                                    ? format(
                                        parseISO(task.dueDate),
                                        "MMM d, yyyy",
                                        { locale: getDateLocale() }
                                      )
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${getPriorityBadgeColor(
                                      task.priority
                                    )} text-xs`}
                                  >
                                    {task.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`${getTaskStatusBadgeColor(
                                      task.status
                                    )} text-xs`}
                                  >
                                    {task.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>,
                              isOpen && (
                                <TableRow
                                  key={`${key}-detail`}
                                  className="border-[#1f1f23]"
                                >
                                  <TableCell
                                    colSpan={5}
                                    className="bg-[#0a0a0a] p-4"
                                  >
                                    <h4 className="text-white font-medium mb-2">
                                      {task.title}
                                    </h4>
                                    <p className="text-gray-300 mb-2">
                                      {task.description}
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                      {t('created')}{" "}
                                      {format(
                                        parseISO(task.createdAt),
                                        "PPPp",
                                        { locale: getDateLocale() }
                                      )}
                                    </p>
                                  </TableCell>
                                </TableRow>
                              ),
                            ];
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {tasks.length > itemsPerPage && (
                      <TasksPagination
                        currentPage={tasksPage}
                        totalPages={totalTasksPages}
                        onPageChange={setTasksPage}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="intake">
                <ClientIntakeTab clientId={clientId || ""} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}