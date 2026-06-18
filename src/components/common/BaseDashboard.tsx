/**
 * BaseDashboard Component
 * 
 * A unified dashboard component that provides different interfaces based on user type.
 * Supports both therapist and client dashboards with customizable configuration.
 * 
 * Features:
 * - Dynamic statistics cards based on user role
 * - Recent activity feeds with filtering
 * - Responsive design with mobile optimization
 * - Real-time data updates
 * 
 * @example
 * ```tsx
 * <BaseDashboard 
 *   userType="therapist" 
 *   userId="user-123"
 *   config={therapistDashboardConfig}
 * />
 * ```
 */

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatCard from "./StatCard";
import DataCard from "./DataCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  BookOpen,
  Clock,
  Users,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import ActivityFilters from "@/components/ActivityFilters";
import { memo, type ReactNode } from "react";
import { useOptimizedState, useOptimizedMemo, useOptimizedEffect, useOptimizedCallback } from '@/hooks/performance/useOptimizedComponents';
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useTranslation } from "react-i18next";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { dashboardService } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types

/**
 * Configuration for dashboard statistics cards
 */
interface StatCard {
  title: string;
  icon: any;
  valueKey: string;
  subtext?: string;
  subtextKey?: string;
}

interface DashboardConfig {
  welcomeMessage: string;
  statsCards: StatCard[];
  activityTitle: string;
  activityDescription: string;
  relationFilterLabel: string;
  relationKey: 'clientName' | 'therapistName';
}

interface BaseDashboardProps {
  userType: 'client' | 'therapist';
  config: DashboardConfig;
  headerSlot?: ReactNode;
}

const BaseDashboard = ({ userType, config, headerSlot }: BaseDashboardProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { user } = useAuthManager();
  const [activityFilter, setActivityFilter] = useOptimizedState("all");
  const [clientFilter, setClientFilter] = useOptimizedState("all");
  const [timeFilter, setTimeFilter] = useOptimizedState("all");
  const [firstName, setFirstName] = useOptimizedState("");

  useOptimizedEffect(() => {
    const cachedName = localStorage.getItem("userFirstName");
    if (cachedName) {
      setFirstName(cachedName);
      return;
    }

    const loadFirstName = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data?.first_name) {
        setFirstName(data.first_name);
        localStorage.setItem("userFirstName", data.first_name);
      }
    };

    loadFirstName();
  }, [user?.id]);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [`${userType}-dashboard-stats`, user?.id],
    queryFn: () => 
      userType === 'therapist' 
        ? dashboardService.getTherapistStats(user!.id)
        : dashboardService.getClientStats(user!.id),
    enabled: !!user?.id,
  });

  // Fetch recent activities
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: [`${userType}-dashboard-activities`, user?.id],
    queryFn: () => 
      userType === 'therapist'
        ? dashboardService.getTherapistActivities(user!.id)
        : dashboardService.getClientActivities(user!.id),
    enabled: !!user?.id,
  });

  // Get unique relations (clients/therapists) for filter
  const availableRelations = useOptimizedMemo(() => {
    const relations = [
      ...new Set(
        activities.map((activity) => activity[config.relationKey]).filter(Boolean)
      ),
    ];
    return relations.sort();
  }, [activities, config.relationKey]);

  // Filter activities based on selected filters
  const filteredActivities = useOptimizedMemo(() => {
    return activities.filter((activity) => {
      // Activity type filter
      if (activityFilter !== "all" && activity.type !== activityFilter) {
        return false;
      }

      // Relation filter (client/therapist)
      if (clientFilter !== "all" && activity[config.relationKey] !== clientFilter) {
        return false;
      }

      // Time filter
      if (timeFilter !== "all") {
        const now = new Date();
        const activityTime = activity.timestamp;

        switch (timeFilter) {
          case "today": {
            const today = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate()
            );
            if (activityTime < today) return false;
            break;
          }
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (activityTime < weekAgo) return false;
            break;
          }
          case "month": {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (activityTime < monthAgo) return false;
            break;
          }
        }
      }

      return true;
    });
  }, [activities, activityFilter, clientFilter, timeFilter, config.relationKey]);

  // Memoize callback functions to prevent unnecessary re-renders
  const handleClearFilters = useOptimizedCallback(() => {
    setActivityFilter("all");
    setClientFilter("all");
    setTimeFilter("all");
  }, []);

  const handleActivityFilterChange = useOptimizedCallback((value: string) => {
    setActivityFilter(value);
  }, []);

  const handleClientFilterChange = useOptimizedCallback((value: string) => {
    setClientFilter(value);
  }, []);

  const handleTimeFilterChange = useOptimizedCallback((value: string) => {
    setTimeFilter(value);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session":
        return Clock;
      case "message":
        return MessageSquare;
      case "task":
        return CheckSquare;
      case "journal":
        return BookOpen;
      default:
        return Clock;
    }
  };

  const getPossessiveDashboardTitle = (name?: string) => {
    if (!name?.trim()) return t("your_dashboard");
    return t("user_dashboard", { name: name.trim() });
  };

  const renderStatValue = (statCard: StatCard, stats: any) => {
    const value = stats?.[statCard.valueKey];
    
    if (statCard.valueKey === 'nextAppointment') {
      return value ? value.time : t("none_scheduled") || "None scheduled";
    }
    
    return value || 0;
  };

  const renderStatSubtext = (statCard: StatCard, stats: any) => {
    if (statCard.subtextKey) {
      const subtextValue = stats?.[statCard.subtextKey];
      const translatedSubtext = t(statCard.subtext?.replace('{value}', '') || '');
      return `${subtextValue} ${translatedSubtext}`;
    }

    if (statCard.subtext) {
      return t(statCard.subtext);
    }

    if (statCard.valueKey === 'nextAppointment') {
      const value = stats?.[statCard.valueKey];
      return value 
        ? t("with_client", { clientName: value.clientName })
        : t("no_upcoming_sessions");
    }
    
    return statCard.subtext || '';
  };

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType={userType}>
      <div className="space-y-6">
        {headerSlot}
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            {getPossessiveDashboardTitle(firstName)}
          </h2>
          <p className="text-gray-400 text-sm">
            {t(config.welcomeMessage)}
          </p>
        </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 ${
          config.statsCards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'
        } gap-4`}>
          {config.statsCards.map((statCard, index) => {
            const Icon = statCard.icon;
            return (
              <StatCard
                key={index}
                title={statCard.title}
                value={renderStatValue(statCard, stats)}
                subtext={renderStatSubtext(statCard, stats)}
                icon={Icon}
                variant="hover"
                isLoading={statsLoading}
              />
            );
          })}
        </div>

        {/* Recent Activity */}
        <DataCard
          title={config.activityTitle}
          description={config.activityDescription}
        >
            <ActivityFilters
              activityFilter={activityFilter}
              clientFilter={clientFilter}
              timeFilter={timeFilter}
              onActivityFilterChange={handleActivityFilterChange}
              onClientFilterChange={handleClientFilterChange}
              onTimeFilterChange={handleTimeFilterChange}
              onClearFilters={handleClearFilters}
              availableClients={availableRelations}
              showClientFilter={true}
              clientFilterLabel={config.relationFilterLabel}
            />

            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {t("no_activities_match_filters")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#1f1f23] hover:bg-transparent">
                      <TableHead className="text-gray-400 font-medium">
                        {t("activity")}
                      </TableHead>
                      {!isMobile && (
                        <TableHead className="text-gray-400 font-medium">
                          {t(config.relationFilterLabel)}
                        </TableHead>
                      )}
                      {!isMobile && (
                        <TableHead className="text-gray-400 font-medium text-right">
                          {t("time")}
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      return (
                        <TableRow
                          key={activity.id}
                          className={`border-[#1f1f23] ${
                            isMobile ? "" : "hover:bg-[#1a1a1a]"
                          }`}
                        >
                          <TableCell className="text-white">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                 <span className="text-sm block truncate">
                                   {activity.taskTitle ? 
                                     `${t(activity.action)}: ${activity.taskTitle}` : 
                                     activity.journalTitle ? 
                                     `${t(activity.action)}: ${activity.journalTitle}` :
                                     activity.sessionType ?
                                     `${t(activity.sessionType.toLowerCase().replace(' ', '_'))} ${t('scheduled').toLowerCase()}` :
                                     t(activity.action)
                                   }
                                 </span>
                                 {isMobile && activity[config.relationKey] && (
                                   <div className="text-xs text-gray-400 mt-1 truncate">
                                     {activity[config.relationKey] === 'private_no_therapist' ? t('private_no_therapist') : t(activity[config.relationKey])}
                                   </div>
                                 )}
                                {isMobile && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {activity.time}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                           {!isMobile && (
                             <TableCell className="text-gray-300 text-sm">
                               {activity[config.relationKey] ? 
                                  activity[config.relationKey] === 'private_no_therapist' ? t('private_no_therapist') : t(activity[config.relationKey])
                                 : t("n_a")}
                            </TableCell>
                          )}
                          {!isMobile && (
                            <TableCell className="text-gray-400 text-sm text-right whitespace-nowrap">
                              {activity.time}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
        </DataCard>
      </div>
    </DashboardLayout>
  );
};

export default memo(BaseDashboard);