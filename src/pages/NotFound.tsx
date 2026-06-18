
import { useLocation } from "react-router-dom";
import { useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { Lock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { user } = useAuthManager();
  const { t } = useTranslation();

  useOptimizedEffect(() => {
    // Determine if this is a 404 or unauthorized access
    const isUnauthorizedAccess = user && location.pathname.includes('/dashboard/');
    
    if (isUnauthorizedAccess) {
      console.error(
        "Unauthorized Access: User attempted to access route not matching their role:",
        location.pathname
      );
    } else {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname, user]);

  const isUnauthorizedAccess = user && location.pathname.includes('/dashboard/');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-card border border-border">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">
            {isUnauthorizedAccess ? "403" : "404"}
          </h1>
          <h2 className="text-xl font-semibold text-muted-foreground">
            {isUnauthorizedAccess ? t("access_denied") : t("page_not_found")}
          </h2>
        </div>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed">
          {isUnauthorizedAccess 
            ? t("no_permission_message")
            : t("page_doesnt_exist_message")
          }
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={() => window.location.replace("/")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>{t("return_to_home")}</span>
          </Button>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {t("error_code")}: {isUnauthorizedAccess ? "403" : "404"} | 
            {t("path")}: <span className="font-mono">{location.pathname}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
