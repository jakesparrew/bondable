import {
  Calendar,
  CheckSquare,
  Users,
  BookOpen,
} from "lucide-react";

// Dashboard configuration objects for different user types
export const therapistDashboardConfig = {
  welcomeMessage: "dashboard_welcome_therapist",
  statsCards: [
    {
      title: "total_clients",
      icon: Users,
      valueKey: "totalClients",
      subtext: "{value}_active",
      subtextKey: "activeClients"
    },
    {
      title: "active_clients", 
      icon: Users,
      valueKey: "activeClients",
      subtext: "strong_retention"
    },
    {
      title: "next_appointment",
      icon: Calendar,
      valueKey: "nextAppointment"
    },
    {
      title: "todays_appointments",
      icon: Calendar,
      valueKey: "todayAppointments",
      subtext: "scheduled_for_today"
    }
  ],
  activityTitle: "recent_activity",
  activityDescription: "latest_updates_practice",
  relationFilterLabel: "client",
  relationKey: "clientName" as const
};

export const clientDashboardConfig = {
  welcomeMessage: "dashboard_welcome_client",
  statsCards: [
    {
      title: "next_appointment",
      icon: Calendar,
      valueKey: "nextAppointment"
    },
    {
      title: "pending_tasks",
      icon: CheckSquare,
      valueKey: "pendingTasks",
      subtext: "tasks_due"
    },
    {
      title: "journal_entries",
      icon: BookOpen,
      valueKey: "journalEntries",
      subtext: "this_month"
    }
  ],
  activityTitle: "recent_activity",
  activityDescription: "latest_wellness_activities",
  relationFilterLabel: "therapist",
  relationKey: "therapistName" as const
};