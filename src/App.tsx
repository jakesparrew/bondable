
/**
 * Main Application Component
 * 
 * Implements route-based code splitting for optimal performance.
 * All page components are lazy loaded to reduce initial bundle size.
 */

// ONE toast system: sonner (ink surface). The parallel shadcn Toaster is gone —
// two mounted systems meant double portals and inconsistent styling.
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
const Home = lazy(() => import("./pages/Home"));
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
// Provider signup + the wachtlijst products (Phase "build it all").
const SignupProvider = lazy(() => import("@/pages/SignupProvider"));
const Wachttijden = lazy(() => import("./pages/Wachttijden"));
const WachttijdenStad = lazy(() => import("./pages/WachttijdenStad"));
const WachtruimtePage = lazy(() => import("./features/wachtruimte/WachtruimtePage"));
// Tokenised lead conversation — how a provider reaches someone who contacted
// them without an account (the magic link doubles as their account seed).
const LeadThread = lazy(() => import("./pages/LeadThread"));
const Journal = lazy(() => import("./pages/Journal"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const WeeklyTimetable = lazy(() => import("./pages/WeeklyTimetable"));
const AdminDashboardContent = lazy(() => import("./components/layout/AdminDashboardContent"));
const AdminNotificationSettingsPage = lazy(() => import("./pages/AdminNotificationSettings"));
const AdminAPISettingsPage = lazy(() => import("./pages/AdminAPISettings"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
// Superadmin management surfaces (all chats, clients, coaches/therapists)
const AdminAllChats = lazy(() => import("./pages/AdminAllChats"));
const AdminClients = lazy(() => import("./pages/AdminClients"));
const AdminProviders = lazy(() => import("./pages/AdminProviders"));
// Phase 5 owner cockpit: command dashboard, safety/verification queues, ops.
const OwnerCommand = lazy(() => import("./pages/admin/OwnerCommand"));
const SafetyQueue = lazy(() => import("./pages/admin/SafetyQueue"));
const VerificationQueue = lazy(() => import("./pages/admin/VerificationQueue"));
const RevenueOps = lazy(() => import("./pages/admin/RevenueOps"));
const FeatureFlags = lazy(() => import("./pages/admin/FeatureFlags"));
const GdprQueue = lazy(() => import("./pages/admin/GdprQueue"));
const IntakeTemplates = lazy(() => import("@/pages/IntakeTemplates"));
const IntakeTemplateBuilder = lazy(() => import("@/pages/IntakeTemplateBuilder"));
const ClientIntake = lazy(() => import("@/pages/ClientIntake"));
const BondChatPage = lazy(() => import("@/pages/BondChat"));
// Public Finder marketplace (NOT behind RouteProtection — visitors can browse)
const Find = lazy(() => import("@/pages/Find"));
const FindMatch = lazy(() => import("@/pages/FindMatch"));
const ProviderProfilePublic = lazy(() => import("@/pages/ProviderProfilePublic"));
// Therapist-only: edit the provider's own public Finder profile (protected).
const ProviderPublicProfileEdit = lazy(() => import("@/pages/ProviderPublicProfileEdit"));
// Public client self-onboarding via a therapist invite link.
const InviteAccept = lazy(() => import("@/pages/InviteAccept"));
// Role-aware first-run welcome flows (Phase 2 onboarding).
const WelcomeClient = lazy(() => import("@/pages/WelcomeClient"));
const WelcomeProvider = lazy(() => import("@/pages/WelcomeProvider"));
const WelcomePractice = lazy(() => import("@/pages/WelcomePractice"));
// Group practice management + staff invite (public accept) + email preview.
const PracticeSettings = lazy(() => import("@/pages/PracticeSettings"));
const PracticeInviteAccept = lazy(() => import("@/pages/PracticeInviteAccept"));
const DevEmails = lazy(() => import("@/pages/DevEmails"));
// Public pricing + ranking-neutrality transparency (dichotomieverbod).
const Pricing = lazy(() => import("@/pages/Pricing"));
const RankingTransparency = lazy(() => import("@/pages/RankingTransparency"));
// Client value surfaces (Phase 3.2/3.3): outcomes, consent, resources, care plan.
const ClientProgress = lazy(() => import("@/pages/ClientProgress"));
const ClientData = lazy(() => import("@/pages/ClientData"));
const ClientResources = lazy(() => import("@/pages/ClientResources"));
const ClientCarePlan = lazy(() => import("@/pages/ClientCarePlan"));
// Provider Belgium-aware client invoicing (distinct from the subscription).
const ProviderInvoicing = lazy(() => import("@/pages/ProviderInvoicing"));
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
                  <Sonner />
                  <BrowserRouter>
                    <Suspense fallback={<RouteSkeleton />}>
                  <Routes>
                {/* Public homepage (front door) - no protection needed */}
                <Route path="/" element={<Home />} />

                {/* Login route - no protection needed */}
                <Route path="/login" element={<Login />} />

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
                {/* Therapist's own editable public Finder profile */}
                <Route
                  path="/dashboard/therapist/public-profile"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <ProviderPublicProfileEdit />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/therapist/practice"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <PracticeSettings />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/therapist/invoicing"
                  element={
                    <RouteProtection requiredUserType="therapist">
                      <ProviderInvoicing />
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
                <Route
                  path="/dashboard/client/progress"
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientProgress />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/client/data"
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientData />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/client/resources"
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientResources />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/client/care-plan"
                  element={
                    <RouteProtection requiredUserType="client">
                      <ClientCarePlan />
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
                {/* /payments is gone: it showed US bank details to Belgian
                    providers. Belgian invoicing lives at /dashboard/therapist/
                    invoicing; the provider's own subscription comes with Stripe
                    in Phase 4. */}
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
                {/* Owner cockpit (Phase 5) */}
                <Route
                  path="/dashboard/admin/command"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <OwnerCommand />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/safety"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <SafetyQueue />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/verification"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <VerificationQueue />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/revenue"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <RevenueOps />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/flags"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <FeatureFlags />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/gdpr"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <GdprQueue />
                    </RouteProtection>
                  }
                />

                {/* Admin specific routes */}
                <Route
                  path="/dashboard/admin/chats"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminAllChats />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/clients"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminClients />
                    </RouteProtection>
                  }
                />
                <Route
                  path="/dashboard/admin/providers"
                  element={
                    <RouteProtection requiredUserType="admin" isAdminRoute={true}>
                      <AdminProviders />
                    </RouteProtection>
                  }
                />
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
                
                {/* Public Finder marketplace — no RouteProtection so
                    prospective clients can browse without an account.
                    Order matters: /find/match before /find/:providerId. */}
                <Route path="/find" element={<Find />} />
                <Route path="/find/match" element={<FindMatch />} />
                <Route path="/find/:providerId" element={<ProviderProfilePublic />} />

                {/* Public client self-onboarding via a therapist invite link. */}
                <Route path="/invite/:token" element={<InviteAccept />} />

                {/* Role-aware first-run welcome flows (enter demo at the end). */}
                <Route path="/welcome/client" element={<WelcomeClient />} />
                <Route path="/welcome/provider" element={<WelcomeProvider />} />
                <Route path="/welcome/practice" element={<WelcomePractice />} />

                {/* Public staff-invite accept + dev email-template preview. */}
                <Route path="/practice-invite/:token" element={<PracticeInviteAccept />} />
                <Route path="/dev/emails" element={<DevEmails />} />

                {/* Public pricing + ranking-transparency. */}
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/how-ranking-works" element={<RankingTransparency />} />

                {/* Provider signup (public — the €39 funnel finally has a door). */}
                <Route path="/signup/provider" element={<SignupProvider />} />

                {/* Wachtlijst products: the public wait-time index + the
                    "start while you wait" surface (public, indexable). */}
                <Route path="/wachttijden" element={<Wachttijden />} />
                <Route path="/wachttijden/:stad" element={<WachttijdenStad />} />
                <Route path="/wachtruimte" element={<WachtruimtePage />} />

                {/* Tokenised, noindex — a lead reads and answers here. */}
                <Route path="/lead/:token" element={<LeadThread />} />

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
