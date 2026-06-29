import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  CheckSquare,
  Clock,
  Calendar,
  ChevronUp,
  ChevronDown,
  Ban,
  SquareLibrary,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useMemo, useState, useEffect } from 'react';
import TaskDialog from "@/components/dialogs/TaskDialog";
import TasksPagination from "@/components/TasksPagination";
import TaskActionDropdown from "@/components/TaskActionDropdown";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useOptimizedTasks } from "@/hooks/api/useOptimizedTasks";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import type { TaskWithProfiles } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
// Removed skeleton import - using instant loading
import { useProfileAvatar } from "@/hooks/ui/useProfileAvatar";
import type { TaskStatus, TaskPriority, ClientTask } from "@/types/global";
import { useTranslation } from "react-i18next";
type SortField =
  | "id"
  | "title"
  | "client_name"
  | "therapist_name"
  | "status"
  | "priority"
  | "due_date";
type SortDirection = "asc" | "desc";

// Transform database task to component format
const transformTaskFactory = (t: any) => (task: TaskWithProfiles) => ({
  id: task.id,
  title: task.title,
  description: task.description || "",
  status: task.status as TaskStatus,
  priority: task.priority as TaskPriority,
  clientId: task.client_id,
  clientName: task.client ? `${task.client.first_name} ${task.client.last_name}`.trim() : t("unknown_client"),
  therapistId: task.therapist_id,
  therapistName: task.therapist ? `${task.therapist.first_name} ${task.therapist.last_name}`.trim() : t("therapist"),
  dueDate: task.due_date || "",
  assignedDate: task.assigned_date || "",
  notes: task.notes || "",
  deniedReason: task.denied_reason || "",
});

const Tasks = () => {
  const { t } = useTranslation();
  const { userType } = useParams();
  const { user } = useAuthManager();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | "view">("add");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Get user ID from auth
  const userId = user?.id || "";

  // Fetch user profile to check their actual role
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
          return;
        }

        setUserProfile(profileData);
        console.log("User profile role:", profileData?.role);
        console.log("URL userType:", userType);
        console.log("User ID for task fetching:", userId);

        // If therapist tries to access client tasks page, redirect them
        if (profileData?.role === "therapist" && userType === "client") {
          console.log("Redirecting therapist from client tasks page");
          navigate(`/dashboard/therapist/tasks`);
          return;
        }

        // If client tries to access therapist tasks page, redirect them
        if (profileData?.role === "client" && userType === "therapist") {
          console.log("Redirecting client from therapist tasks page");
          navigate(`/dashboard/client/tasks`);
          return;
        }
      } catch (error) {
        console.error("Error in fetchUserProfile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [userId, userType, navigate]);

  // Use the tasks hook only if the user type matches the profile role
  const shouldFetchTasks = !userProfile || userProfile.role === userType; // Allow fetch until we know for sure

  const {
    tasks: dbTasks,
    clients,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
  } = useOptimizedTasks(userType as "therapist" | "client", userId || "", {
    filters: {
      clientId: clientFilter !== "all" ? clientFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
    },
  });

  // Transform database tasks to component format
  const tasks = useMemo(() => {
    console.log("Raw database tasks:", dbTasks);
    const transformTask = transformTaskFactory(t);
    const transformedTasks = (dbTasks || []).map(transformTask);
    console.log("Transformed tasks:", transformedTasks);
    return transformedTasks;
  }, [dbTasks, t]);

  const ProfileAvatar = ({ userId, name }: { userId: string; name: string }) => {
    const { avatarUrl } = useProfileAvatar(userId);
    
    return (
      <Avatar className="w-7 h-7">
        <AvatarImage src={avatarUrl} alt={name} className="non-invertable" />
        <AvatarFallback className="bg-muted text-foreground text-xs">
          {name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
    );
  };


  // New state for decline reason dialog
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [taskToDecline, setTaskToDecline] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const getStatusBadge = (status: TaskStatus) => {
    const config = {
      assigned: {
        label: t("assigned"),
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      "in_progress": {
        label: t("in_progress"),
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      },
      completed: {
        label: t("completed"),
        className: "bg-green-500/20 text-green-400 border-green-500/30",
      },
      overdue: {
        label: t("overdue"),
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
      denied: {
        label: t("declined"),
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs ${config[status].className}`}
      >
        {config[status].label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: TaskPriority | null) => {
    if (!priority) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>—</span>
          {t("none")}
        </span>
      );
    }

    const config = {
      low: {
        icon: "↓",
        className: "text-blue-400",
      },
      medium: {
        icon: "→",
        className: "text-yellow-400",
      },
      high: {
        icon: "↑",
        className: "text-red-400",
      },
    };
    return (
      <span
        className={`flex items-center gap-1 text-xs ${config[priority].className}`}
      >
        <span>{config[priority].icon}</span>
        {t(priority)}
      </span>
    );
  };

  const filteredAndSortedTasks = tasks
    .filter((task) => {
      const matchesClient =
        clientFilter === "all" || task.clientId === clientFilter;
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;
      const matchesSearch =
        task.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.clientName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        task.therapistName.toLowerCase().includes(searchFilter.toLowerCase());
      return matchesClient && matchesStatus && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortField) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "client_name":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case "therapist_name":
          aValue = a.therapistName.toLowerCase();
          bValue = b.therapistName.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "priority": {
          const priorityOrder = {
            low: 1,
            medium: 2,
            high: 3,
          };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        }
        case "due_date":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTasks = filteredAndSortedTasks.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleAddTask = (taskData: any) => {
    console.log("Creating task with data:", taskData);
    console.log("Therapist ID (current user):", userId);
    console.log("Selected client ID:", taskData.clientId);

    createTask({
      title: taskData.title,
      description: taskData.description || null,
      client_id: taskData.clientId,
      therapist_id: userId,
      priority: taskData.priority || null,
      due_date: taskData.dueDate || null,
      notes: taskData.notes || null,
      
    });
  };

  const handleEditTask = (taskData: any) => {
    if (!selectedTask) return;
    updateTask({
      id: selectedTask.id,
      updates: {
        title: taskData.title,
        description: taskData.description || null,
        client_id: taskData.clientId,
        priority: taskData.priority || null,
        due_date: taskData.dueDate || null,
        notes: taskData.notes || null,
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleStatusChange = (
    taskId: string,
    status: string,
    reason?: string
  ) => {
    const updates: any = { status };
    if (status === "denied" && reason) {
      updates.denied_reason = reason;
    }
    updateTask({ id: taskId, updates });
  };

  const handleClientStatusUpdate = (taskId: string, newStatus: TaskStatus) => {
    if (newStatus === "denied") {
      setTaskToDecline(taskId);
      setDeclineDialogOpen(true);
    } else {
      handleStatusChange(taskId, newStatus);
    }
  };

  const handleDeclineSubmit = () => {
    if (taskToDecline && declineReason.trim()) {
      handleStatusChange(taskToDecline, "denied", declineReason);
      setDeclineDialogOpen(false);
      setTaskToDecline(null);
      setDeclineReason("");
    }
  };

  const handleDeclineCancel = () => {
    setDeclineDialogOpen(false);
    setTaskToDecline(null);
    setDeclineReason("");
  };

  const openDialog = (mode: "add" | "edit" | "view", task?: any) => {
    // Add small delay to ensure dropdown is fully closed
    setTimeout(() => {
      setDialogMode(mode);
      setSelectedTask(task || null);
      setDialogOpen(true);
    }, 50);
  };

  const pageTitle = userType === "client" ? t("your_tasks") : t("client_tasks");
  const pageDescription =
    userType === "client"
      ? t("track_assigned_tasks_progress")
      : t("assign_track_tasks_clients");

  // Instant loading - no skeleton needed

  // Show error if user type doesn't match profile role (but only after profile is loaded)
  if (userProfile && !shouldFetchTasks) {
    return (
      <DashboardLayout userType={userType as "therapist" | "client"}>
        <div className="flex items-center justify-center h-64">
          <Card className="bg-card border-border max-w-md">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Access Denied
              </h3>
              <p className="text-muted-foreground text-sm">
                You don't have permission to access this page. You will be
                redirected shortly.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">
              {userType === "client" ? t("your_tasks") : t("client_tasks")}
            </h2>
            <p className="text-muted-foreground text-sm">{userType === "client" ? t("track_assigned_tasks_progress") : t("assign_track_tasks_clients")}</p>
          </div>
          {userType === "therapist" && (
            <Button
              onClick={() => openDialog("add")}
              disabled={clients.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("assign_task")}
            </Button>
          )}
        </div>

        {/* Show message if no clients available for therapist */}
        {userType === "therapist" && clients.length === 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("no_clients_available")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("need_clients_before_assign_tasks")}
                create tasks for them.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Bar */}
        <Card className="bg-card border-border">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-8 w-full justify-evenly text-xs md:text-sm">
                <div className="flex items-center gap-1 md:gap-2">
                  <SquareLibrary className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks_total")}</span>
                  <span className="font-semibold text-foreground">
                    {tasks.length}
                  </span>
                </div>
                <div className="w-px h-3 md:h-4 bg-border mx-1 md:mx-2" />
                <div className="flex items-center gap-1 md:gap-2">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground hidden sm:inline">
                    {t("tasks_in_progress")}
                  </span>
                  <span className="text-muted-foreground sm:hidden">{t("tasks_progress_short")}</span>
                  <span className="font-semibold text-foreground">
                    {tasks.filter((t) => t.status === "in_progress").length}
                  </span>
                </div>
                <div className="w-px h-3 md:h-4 bg-border mx-1 md:mx-2" />
                <div className="flex items-center gap-1 md:gap-2">
                  <CheckSquare className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground hidden sm:inline">
                    {t("tasks_completed")}
                  </span>
                  <span className="text-muted-foreground sm:hidden">{t("tasks_done_short")}</span>
                  <span className="font-semibold text-foreground">
                    {tasks.filter((t) => t.status === "completed").length}
                  </span>
                </div>
                <div className="w-px h-3 md:h-4 bg-border mx-1 md:mx-2 hidden sm:block" />
                <div className="items-center gap-1 md:gap-2 hidden sm:flex">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks_overdue")}</span>
                  <span className="font-semibold text-foreground">
                    {tasks.filter((t) => t.status === "overdue").length}
                  </span>
                </div>
                <div className="w-px h-3 md:h-4 bg-border mx-1 md:mx-2 hidden sm:block" />
                <div className="items-center gap-1 md:gap-2 hidden sm:flex">
                  <Ban className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("tasks_declined")}</span>
                  <span className="font-semibold text-foreground">
                    {tasks.filter((t) => t.status === "denied").length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters - only show if there are tasks or clients */}
        {(tasks.length > 0 || clients.length > 0) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 min-w-0 order-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={
                  userType === "client"
                    ? t("search_your_tasks")
                    : t("search_tasks_or_clients")
                }
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 order-2">
              {userType === "therapist" && clients.length > 0 && (
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-card border-border text-foreground">
                    <SelectValue placeholder={t("all_clients")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="all"
                    >
                      {t("all_clients")}
                    </SelectItem>
                    {clients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        className="text-muted-foreground hover:bg-muted"
                      >
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-3 md:gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-36 bg-card border-border text-foreground">
                    <SelectValue placeholder={t("status")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="all"
                    >
                      {t("all_status")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="assigned"
                    >
                      {t("assigned")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="in_progress"
                    >
                      {t("in_progress")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="completed"
                    >
                      {t("completed")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="overdue"
                    >
                      {t("overdue")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="denied"
                    >
                      {t("declined")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-full sm:w-36 bg-card border-border text-foreground">
                    <SelectValue placeholder={t("priority")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="all"
                    >
                      {t("all_priority")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="low"
                    >
                      {t("low")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="medium"
                    >
                      {t("medium")}
                    </SelectItem>
                    <SelectItem
                      className="text-muted-foreground hover:bg-muted"
                      value="high"
                    >
                      {t("high")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Table - Desktop */}
        {tasks.length > 0 && (
          <Card className="bg-card border-border hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead
                      className="text-muted-foreground font-medium w-auto cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("id")}
                    >
                      ID{getSortIcon("id")}
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("title")}
                    >
                      {t("task_details")}{getSortIcon("title")}
                    </TableHead>
                    {userType === "therapist" && (
                      <TableHead
                        className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("client_name")}
                      >
                        {t("client")}{getSortIcon("client_name")}
                      </TableHead>
                    )}
                    {userType === "client" && (
                      <TableHead
                        className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("therapist_name")}
                      >
                        {t("assigned_by")}{getSortIcon("therapist_name")}
                      </TableHead>
                    )}
                    <TableHead
                      className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("status")}
                    >
                      {t("status")}{getSortIcon("status")}
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("priority")}
                    >
                      {t("priority")}{getSortIcon("priority")}
                    </TableHead>
                    <TableHead
                      className="text-muted-foreground font-medium cursor-pointer hover:text-foreground"
                      onClick={() => handleSort("due_date")}
                    >
                      {t("due_date")}{getSortIcon("due_date")}
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDialog("view", task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openDialog("view", task);
                        }
                      }}
                      className="border-border hover:bg-muted transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {task.id.slice(-8)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="space-y-1">
                          <p className="text-foreground font-medium text-sm">
                            {task.title}
                          </p>
                          <p className="text-muted-foreground text-xs line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                      </TableCell>
                      {userType === "therapist" && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <ProfileAvatar userId={task.clientId} name={task.clientName} />
                            <span className="text-foreground text-sm">
                              {task.clientName || t("unknown_client")}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {userType === "client" && (
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <ProfileAvatar userId={task.therapistId} name={task.therapistName} />
                            <span className="text-foreground text-sm">
                              {task.therapistName || t("therapist")}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {task.dueDate 
                            ? new Date(task.dueDate).toLocaleDateString()
                            : t("not_specified")
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        <TaskActionDropdown
                          task={task}
                          userType={userType as "therapist" | "client"}
                          onViewDetails={() => openDialog("view", task)}
                          onEditTask={
                            userType === "therapist"
                              ? () => openDialog("edit", task)
                              : undefined
                          }
                          onDeleteTask={
                            userType === "therapist"
                              ? () => handleDeleteTask(task.id)
                              : undefined
                          }
                          onStatusChange={
                            userType === "client"
                              ? handleClientStatusUpdate
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Mobile Task Cards */}
        {tasks.length > 0 && (
          <div className="md:hidden space-y-3">
            {paginatedTasks.map((task) => (
              <Card
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => openDialog("view", task)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDialog("view", task);
                  }
                }}
                className="bg-card border-border cursor-pointer transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with ID and Status */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        {task.id.slice(-8)}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-1">
                      <h3 className="text-foreground font-medium text-sm leading-tight">
                        {task.title}
                      </h3>
                      <p className="text-muted-foreground text-xs line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    {/* Client/Therapist and Priority */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {userType === "therapist" ? (
                          <ProfileAvatar userId={task.clientId} name={task.clientName} />
                        ) : (
                          <ProfileAvatar userId={task.therapistId} name={task.therapistName} />
                        )}
                        <span className="text-foreground text-sm truncate">
                          {userType === "therapist"
                            ? task.clientName || t("unknown_client")
                            : task.therapistName || t("therapist")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>

                    {/* Due Date and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground text-xs">
                        {t("due")}: {task.dueDate 
                          ? new Date(task.dueDate).toLocaleDateString()
                          : t("not_specified")
                        }
                      </span>
                      <TaskActionDropdown
                        task={task}
                        userType={userType as "therapist" | "client"}
                        onViewDetails={() => openDialog("view", task)}
                        onEditTask={
                          userType === "therapist"
                            ? () => openDialog("edit", task)
                            : undefined
                        }
                        onDeleteTask={
                          userType === "therapist"
                            ? () => handleDeleteTask(task.id)
                            : undefined
                        }
                        onStatusChange={
                          userType === "client"
                            ? handleClientStatusUpdate
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <div className="items-center justify-center hidden md:block pt-1">
              <TasksPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            <div className="flex items-center justify-center pt-3 md:hidden">
              <TasksPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}

        {/* Task Dialog */}
        <TaskDialog
          open={dialogOpen}
          setOpen={setDialogOpen}
          task={selectedTask}
          clients={clients}
          onSave={dialogMode === "add" ? handleAddTask : handleEditTask}
          onStatusChange={handleStatusChange}
          mode={dialogMode}
          userType={userType as "therapist" | "client"}
        />

        {/* Decline Reason Dialog */}
        <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <DialogContent className="bg-background border border-border text-foreground max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-foreground">{t('decline_task')}</DialogTitle>
            </DialogHeader>
            <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">
                  {t("decline_task_reason")}{" "}
                  <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder={t("decline_task_placeholder")}
                  className="bg-card border-border text-foreground mt-2"
                  rows={4}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={handleDeclineCancel}
                  className="border-border bg-transparent hover:bg-muted text-muted-foreground w-full sm:w-auto"
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleDeclineSubmit}
                  disabled={!declineReason.trim()}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {t("decline_task_button")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
