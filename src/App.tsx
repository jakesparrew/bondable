
/**
 * Main Application Component
 * 
 * Implements route-based code splitting for optimal performance.
 * All page components are lazy loaded to reduce initial bundle size.
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { EditModeProvider } from "@/contexts/EditModeContext";
import { AuthManagerProvider } from "@/hooks/api/useAuthManager";
import RouteProtection from "@/components/RouteProtection";
import ErrorBoundary from "@/components/ErrorBoundary";
import { 
  DashboardSkeleton, 
  TableSkeleton, 
  CalendarSkeleton, 
  SettingsSkeleton,
  MessagesSkeleton,
  JournalSkeleton,
  TasksSkeleton,
  SessionsTableSkeleton
} from "@/components/layout/skeletons";

// Lazy load all page components for code splitting
const Login = lazy(() => import("./pages/Login"));
const SetupPassword = lazy(() => import("./pages/SetupPassword"));
const TherapistDashboard = lazy(() => import("./pages/TherapistDashboard"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const Therapists = lazy(() => import("./pages/Therapists"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));;
const AddClient = lazy(() => import("./pages/AddClient"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Sessions = lazy(() => import("./pages/Sessions"));
const SessionDetail = lazy(() => import("./pages/SessionDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Messages = lazy(() => import("./pages/Messages"));
const Payments = lazy(() => import("./pages/Payments"));
const Journal = lazy(() => import("./pages/Journal"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const WeeklyTimetable = lazy(() => import("./pages/WeeklyTimetable"));
const AdminDashboardContent = lazy(() => import("./components/layout/AdminDashboardContent"));
const AdminNotificationSettingsPage = lazy(() => import("./pages/AdminNotificationSettings"));
const AdminAPISettingsPage = lazy(() => import("./pages/AdminAPISettings"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const IntakeTemplates = lazy(() => import("@/pages/IntakeTemplates"));
const IntakeTemplateBuilder = lazy(() => import("@/pages/IntakeTemplateBuilder"));
const ClientIntake = lazy(() => import("@/pages/ClientIntake"));
const BondChatPage = lazy(() => import("@/pages/BondChat"));
const NotFound = lazy(() => import("./pages/NotFound"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0, // No retries for instant feel
      retryDelay: 0,
      staleTime: 600000, // 10 minutes cache
      gcTime: 1800000, // 30 minutes cache
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});


const App = () => {
  const RouteSkeleton = () => {
    const location = useLocation();
    const path = location.pathname;
    
    // Extract user type from path
    const userTypeMatch = path.match(/\/dashboard\/(therapist|client|admin)/);
    const userType = userTypeMatch ? userTypeMatch[1] as "therapist" | "client" | "admin" : "therapist";
    
    // Return appropriate skeleton based on route
    if (path.includes('/dashboard/therapist') || path.includes('/dashboard/client') || path.includes('/dashboard/admin')) {
      if (path.endsWith('/dashboard/therapist') || path.endsWith('/dashboard/client') || path.endsWith('/dashboard/admin')) {
        return <DashboardSkeleton userType={userType} />;
      }
    }
    
    if (path.includes('/clients') || path.includes('/therapists')) {
      return <TableSkeleton userType={userType} />;
    }
    
    if (path.includes('/calendar')) {
      return <CalendarSkeleton userType={userType} />;
    }
    
    if (path.includes('/sessions')) {
      return <SessionsTableSkeleton userType={userType} />;
    }
    
    if (path.includes('/settings') || path.includes('/profile')) {
      return <SettingsSkeleton userType={userType} />;
    }
    
    if (path.includes('/messages')) {
      return <MessagesSkeleton userType={userType} />;
    }
    
    if (path.includes('/journal')) {
      return <JournalSkeleton userType={userType} />;
    }
    
    if (path.includes('/tasks')) {
      return <TasksSkeleton userType={userType} />;
    }
    
    // Default fallback
    return <DashboardSkeleton userType={userType} />;
  };

  const SkeletonFallback = () => {
    // Default skeleton for when router context isn't available yet
    return <DashboardSkeleton userType="therapist" />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthManagerProvider>
        <EditModeProvider>
          <ThemeProvider>
            <TooltipProvider>
              <ErrorBoundary>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Suspense fallback={<RouteSkeleton />}>
                  <Routes>
                {/* Login route - no protection needed */}
                <Route path="/" element={<Login />} />
                
                {/* Setup Password route - no protection needed */}
                <Route path="/setup-password" element={<SetupPassword />} />
                
                {/* Admin Dashboard route - accessible at /dashboard/admin for admin users */}
                <Route 
                  path="/dashboard/admin" 
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminDashboardContent />
                    </RouteProtection>
                  } 
                />
                
                {/* Therapist Routes */}
                <Route 
                  path="/dashboard/therapist" 
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <TherapistDashboard />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/therapist/clients" 
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <Clients />
                    </RouteProtection>
                  } 
                />
                  <Route 
                    path="/dashboard/therapist/clients/:clientId/client-profile" 
                    element={
                      <RouteProtection requiredUserType="therapist">
                        <ClientProfile />
                      </RouteProtection>
                    } 
                  />
                <Route
                  path="/dashboard/therapist/add-client"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <AddClient />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/therapist/intake-forms"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <IntakeTemplates />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/therapist/intake-forms/:id"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <IntakeTemplateBuilder />
                    </RouteProtection>
                  }
                />

                {/* Client Routes */}
                <Route 
                  path="/dashboard/client" 
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientDashboard />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/client/therapists" 
                  element={
                    <RouteProtection requiredUserType="client">
                      <Therapists />
                    </RouteProtection>
                  } 
                />
                <Route
                  path="/dashboard/client/journal"
                  element={
                    <RouteProtection requiredUserType="client">
                      <Journal />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/client/intake"
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientIntake />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/client/bond"
                  element={
                    <RouteProtection requiredUserType="client">
                      <BondChatPage />
                    </RouteProtection>
                  }
                />

                {/* Shared Routes */}
                <Route 
                  path="/dashboard/:userType/calendar" 
                  element={
                    <RouteProtection>
                      <Calendar />
                    </RouteProtection>
                  } 
                />
<Route 
                  path="/dashboard/:userType/sessions" 
                  element={
                    <RouteProtection>
                      <Sessions />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/sessions/:sessionId"
                  element={
                    <RouteProtection>
                      <SessionDetail />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/tasks" 
                  element={
                    <RouteProtection>
                      <Tasks />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/messages" 
                  element={
                    <RouteProtection>
                      <Messages />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/payments" 
                  element={
                    <RouteProtection>
                      <Payments />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/settings" 
                  element={
                    <RouteProtection>
                      <Settings />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/profile" 
                  element={
                    <RouteProtection>
                      <Profile />
                    </RouteProtection>
                  } 
                />
                {/* Admin specific routes */}
                <Route 
                  path="/dashboard/admin/settings" 
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminSettings />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/admin/profile" 
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminProfile />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/admin/notification-settings" 
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminNotificationSettingsPage />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/admin/api-settings" 
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminAPISettingsPage />
                    </RouteProtection>
                  } 
                />
                <Route 
                  path="/dashboard/:userType/weekly-timetable" 
                  element={
                    <RouteProtection>
                      <WeeklyTimetable />
                    </RouteProtection>
                  } 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
                  </Suspense>
                  </BrowserRouter>
              </ErrorBoundary>
            </TooltipProvider>
          </ThemeProvider>
        </EditModeProvider>
      </AuthManagerProvider>
    </QueryClientProvider>
  );
};

export default App;
