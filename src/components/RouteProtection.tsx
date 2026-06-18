
import { useEffect } from "react";
import console from "@/lib/production-console";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface RouteProtectionProps {
  children: React.ReactNode;
  requiredUserType?: "therapist" | "client" | "admin";
  isAdminRoute?: boolean;
}

const RouteProtection = ({ children, requiredUserType, isAdminRoute = false }: RouteProtectionProps) => {
  const { user, loading: authLoading, error, role, roleLoading } = useAuthManager();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Combined loading state
  const loading = authLoading || roleLoading;

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user && !error) {
      console.log('🚪 RouteProtection: Redirecting unauthenticated user to login');
      navigate("/", { replace: true });
      return;
    }
  }, [loading, user, error, navigate]);

  // Handle role-based access control
  useEffect(() => {
    console.log('🔍 RouteProtection: Role-based access control check', {
      loading, user: !!user, role, isAdminRoute, requiredUserType, pathname: location.pathname
    });
    
    if (!loading && user && role) {
      // Admin users can only access admin routes
      if (role === 'admin') {
        if (!isAdminRoute) {
          console.log('🔒 Admin user redirected to admin dashboard from non-admin route');
          navigate("/dashboard/admin", { replace: true });
          return;
        }
      } else {
        // Non-admin users cannot access admin routes
        if (isAdminRoute) {
          console.log('🚫 Non-admin user blocked from admin route');
          navigate("/", { replace: true });
          return;
        }
        
        // Check specific user type requirements for non-admin routes
        if (requiredUserType && role !== requiredUserType) {
          console.log(`🚫 User with role ${role} blocked from ${requiredUserType} route`);
          // Redirect to appropriate dashboard based on role
          if (role === 'therapist') {
            navigate("/dashboard/therapist", { replace: true });
          } else if (role === 'client') {
            navigate("/dashboard/client", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
          return;
        }
      }
    }
  }, [loading, user, role, isAdminRoute, requiredUserType, location.pathname, navigate]);

  // Instant render; navigation guards handled in effects above
  return <>{children}</>;
};

export default RouteProtection;
