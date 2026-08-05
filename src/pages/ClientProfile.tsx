import React from "react";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StatusVariant = "success" | "warning" | "info" | "destructive" | "secondary";

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

  // Semantic badge variants. The previous helpers returned a dark-theme
  // palette that was unreadable on the light canvas; Badge variants carry a
  // soft surface + on-color text instead.
  const moodVariant = (mood: string): StatusVariant => {
    switch (mood) {
      case "Good":
        return "success";
      case "Better":
        return "info";
      case "Neutral":
        return "warning";
      default:
        return "secondary";
    }
  };

  const taskStatusVariant = (status: string): StatusVariant => {
    switch (status) {
      case "completed":
        return "success";
      case "in progress":
        return "warning";
      case "assigned":
        return "info";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const priorityVariant = (priority: string): StatusVariant => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };

  const statusVariant = (status: string): StatusVariant => {
    switch (status) {
      case "Active":
        return "success";
      case "Pending":
        return "warning";
      case "Inactive":
        return "secondary";
      default:
        return "secondary";
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
          <div className="text-destructive">{error || t("client_not_found")}</div>
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
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back_to_clients")}
          </Button>
        </div>

        {/* Header — the single page-title treatment */}
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 shrink-0 md:h-16 md:w-16">
            <AvatarImage
              src={client.image}
              alt={client.name}
              className="non-invertable"
            />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm md:text-lg">
              {client.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <PageHeader
            className="mb-0 min-w-0 flex-1"
            title={<span className="break-words">{client.name}</span>}
            description={
              <span className="flex flex-wrap items-center gap-3">
                <Badge variant={statusVariant(client.status)}>
                  {client.status}
                </Badge>
                <span>{t("client_since", { date: client.joinDate })}</span>
              </span>
            }
            actions={
              isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateClientMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateClientMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateClientMutation.isPending
                      ? t("saving", "Bezig met opslaan")
                      : t("save")}
                  </Button>
                </>
              ) : (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  {t("edit_client")}
                </Button>
              )
            }
          />
        </div>

        {/* Contact Information with Notes - Full Width */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
                  />
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      {t("status")} <span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={editForm.status}
                      onValueChange={(
                        value: "Active" | "Inactive" | "Pending"
                      ) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem
                          value="Active"
                          className="text-muted-foreground hover:bg-muted"
                        >
                          Active
                        </SelectItem>
                        <SelectItem
                          value="Inactive"
                          className="text-muted-foreground hover:bg-muted"
                        >
                          Inactive
                        </SelectItem>
                        <SelectItem
                          value="Pending"
                          className="text-muted-foreground hover:bg-muted"
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
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
                  <label className="text-muted-foreground text-sm font-medium">
                    {t("full_name")} <span className="text-destructive">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem] break-words">
                    {client.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground text-sm font-medium">
                    {t("status")} <span className="text-destructive">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem]">
                    {client.status}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem] pl-9 break-all">
                      {client.email}
                    </div>
                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3">
                      <Mail size={16} aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-muted-foreground text-sm font-medium">
                    Phone <span className="text-destructive">*</span>
                  </label>
                  <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem]">
                    {client.phone}
                  </div>
                </div>
              </div>
            )}

            <Separator className="bg-border" />

            <div>
              <h4 className="text-foreground font-medium mb-4">{t('emergency_contact')}</h4>
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
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
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
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
                    <label className="text-muted-foreground text-sm font-medium">
                      Name
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem] break-words">
                      {client.emergencyContact.name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      Relationship
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem]">
                      {client.emergencyContact.relationship}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-muted-foreground text-sm font-medium">
                      Phone
                    </label>
                    <div className="flex h-[2.5rem] w-full rounded-md border border-border bg-card px-3 py-2 text-muted-foreground text-[.9rem]">
                      {client.emergencyContact.phone}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-border" />

            <div>
              <h4 className="text-foreground font-medium mb-2">{t('therapist_notes')}</h4>
              <Textarea
                value={isEditing && editForm ? editForm.notes : client.notes || ""}
                onChange={
                  isEditing && editForm
                    ? (e) => setEditForm({ ...editForm, notes: e.target.value })
                    : undefined
                }
                readOnly={!isEditing}
                className={`${isEditing ? "bg-background text-foreground placeholder:text-muted-foreground focus:border-ring" : "bg-card text-muted-foreground"} border-border min-h-20`}
                placeholder={t('enter_notes_placeholder')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Table for Sessions, Journal Entries, and Tasks */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 gap-1">
                <TabsTrigger value="sessions" className="text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary hover:bg-muted hover:text-muted-foreground">{t('sessions')}</TabsTrigger>
                <TabsTrigger value="journals" className="text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary hover:bg-muted hover:text-muted-foreground">
                  {t('shared_journals')} ({journals.length})
                </TabsTrigger>
                <TabsTrigger value="tasks" className="text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary hover:bg-muted hover:text-muted-foreground">{t('tasks')}</TabsTrigger>
                <TabsTrigger value="intake" className="text-muted-foreground data-[state=active]:text-primary-foreground data-[state=active]:bg-primary hover:bg-muted hover:text-muted-foreground">{t("intake:intake_tab")}</TabsTrigger>
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
                                className="border-border hover:bg-card cursor-pointer"
                              >
                                <TableCell className="text-center">
                                  {isOpen ? (
                                    <ChevronDown className="mx-auto w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="mx-auto w-4 h-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
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
                                <TableCell className="text-muted-foreground">
                                  {translateSessionType(session.type)}
                                </TableCell>
                                <TableCell className="text-muted-foreground hidden md:table-cell">
                                  {session.duration}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={statusVariant(session.status)}>
                                    {translateSessionStatus(session.status)}
                                  </Badge>
                                </TableCell>
                              </TableRow>,
                              isOpen && (
                                <TableRow
                                  key={`${key}-detail`}
                                  className="border-border"
                                >
                                  <TableCell
                                    colSpan={5}
                                    className="bg-background p-4"
                                  >
                                    <h4 className="text-foreground font-medium mb-2">
                                      {t('session_notes')}
                                    </h4>
                                    <p className="text-muted-foreground">
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
                          <p className="text-sm text-warning">
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
                                <Badge variant={moodVariant(journal.mood)}>
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
                                className="border-border hover:bg-card cursor-pointer"
                              >
                                <TableCell className="text-center">
                                  {isOpen ? (
                                    <ChevronDown className="mx-auto w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="mx-auto w-4 h-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {task.title}
                                </TableCell>
                                <TableCell className="text-muted-foreground hidden md:table-cell">
                                  {task.dueDate
                                    ? format(
                                        parseISO(task.dueDate),
                                        "MMM d, yyyy",
                                        { locale: getDateLocale() }
                                      )
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={priorityVariant(task.priority)}>
                                    {task.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={taskStatusVariant(task.status)}>
                                    {task.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>,
                              isOpen && (
                                <TableRow
                                  key={`${key}-detail`}
                                  className="border-border"
                                >
                                  <TableCell
                                    colSpan={5}
                                    className="bg-background p-4"
                                  >
                                    <h4 className="text-foreground font-medium mb-2">
                                      {task.title}
                                    </h4>
                                    <p className="text-muted-foreground mb-2">
                                      {task.description}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
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