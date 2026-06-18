
import { ReactNode, useEffect } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import NotificationCenter from "@/components/NotificationCenter"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Capacitor } from "@capacitor/core";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { getFcmToken, onTokenRefresh, isNativePlatform } from "@/services/native/pushNotifications";
import { userDeviceService } from "@/services/api/userDeviceService";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: "therapist" | "client" | "admin";
  contentClassName?: string; 
}

const DashboardLayout = ({ children, userType, contentClassName }: DashboardLayoutProps) => {
  const { t } = useTranslation()
  const location = useLocation();
  const navigate = useNavigate();
  const isNative = Capacitor.getPlatform() !== 'web';
  const isMobile = useIsMobile();
  // Suppress bottom padding on mobile Messages list when no selection is made
  const pathSegmentsAll = location.pathname.split('/').filter(Boolean);
  const lastSeg = pathSegmentsAll[pathSegmentsAll.length - 1];
  const isMessagesRoute = lastSeg === 'messages';
  const searchParams = new URLSearchParams(location.search);
  const hasSelection =
    searchParams.has('clientId') ||
    searchParams.has('therapistId') ||
    pathSegmentsAll.length > 3; // e.g., /messages/<id>
  const suppressBottomPadding = isNative && isMobile && isMessagesRoute && !hasSelection;

  const getPageTitleKey = (page: string) => {
    // Map page names to translation keys
    const pageMap: { [key: string]: string } = {
      'settings': 'settings',
      'clients': 'clients', 
      'tasks': 'tasks',
      'sessions': 'sessions',
      'messages': 'messages',
      'calendar': 'calendar',
      'journal': 'journal',
      'payments': 'payments',
      'therapists': 'therapists',
      'profile': 'profile',
      'client-profile': 'client_profile',
      'weekly-timetable': 'weekly_timetable',
      'notification-settings': 'notification_settings',
      'api-settings': 'api_settings'
    }
    return pageMap[page] || page
  }

  const getPageTitle = () => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace('-', ' ');
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Handle admin vs regular users differently
    if (userType === "admin") {
      // For admin, just show admin dashboard
      if (location.pathname !== '/dashboard') {
        breadcrumbs.push({
          title: t("admin_dashboard"),
          href: "/dashboard",
          isPage: true
        });
      }
    } else {
      // Add dashboard as first crumb if not already there
      if (pathSegments.length > 2) {
        breadcrumbs.push({
          title: t("dashboard"),
          href: `/dashboard/${userType}`,
          isPage: false
        });
      }
      
      // Add current page
      if (pathSegments.length > 2) {
        const currentPage = pathSegments[pathSegments.length - 1];
        const pageKey = getPageTitleKey(currentPage);
        breadcrumbs.push({
          title: t(pageKey),
          href: location.pathname,
          isPage: true
        });
      }
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Register push token on native platforms (once)
  useEffect(() => {
    if (!isNative) return;
    let isMounted = true;

    getFcmToken()
      .then(({ token, platform }) => {
        if (!isMounted) return;
        if (token) userDeviceService.register(token, platform);
      })
      .catch(() => {});

    onTokenRefresh((token) => {
      const platform = (Capacitor.getPlatform() as 'ios' | 'android' | 'web');
      userDeviceService.register(token, platform);
    });

    return () => {
      isMounted = false;
    };
  }, [isNative]);

  return (
    <div className={`min-h-screen bg-background text-foreground w-full ${isNative ? (suppressBottomPadding ? 'pt-14' : 'pt-14 pb-2') : ''}`}>
      <SidebarProvider>
        <AppSidebar userType={userType} />
        <SidebarInset className="bg-background">
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-card border-b border-border">
            <div className="flex items-center gap-2 px-4 flex-1">
              <SidebarTrigger className="-ml-1 text-foreground" />
              <Separator
                orientation="vertical"
                className="mr-2 h-4 bg-border"
              />
              {breadcrumbs.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.href} className="flex items-center">
                        {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                        <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                          {crumb.isPage ? (
                            <BreadcrumbPage className="text-foreground">{crumb.title}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink 
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => navigate(crumb.href)}
                            >
                              {crumb.title}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>
            {/* Notifications in the top right of the header */}
            <div className="px-4">
              <NotificationCenter />
            </div>
          </header>
          <div className={`flex flex-1 flex-col gap-4 p-4 pt-4 bg-background rounded-xl ${contentClassName || ""}`}>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
