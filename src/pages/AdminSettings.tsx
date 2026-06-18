import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Bell,
  Palette,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import ThemeSelector from "@/components/ThemeSelector";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useTranslation } from "react-i18next";
// Removed skeleton import - using instant loading

const AdminSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuthManager();
  const [isLoading, setIsLoading] = useOptimizedState(false); // Always false for instant loading

  useOptimizedEffect(() => {
    // Instant loading - no delay needed
    setIsLoading(false);
  }, [user?.id]);

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-1">{t("settings")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("manage_account_preferences")}
            </p>
          </div>
        </div>

        {/* Profile Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-foreground text-lg">
                {t("profile_management")}
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground text-sm">
              {t("manage_personal_info_admin")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isMobile ? (
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                <div>
                  <h4 className="text-foreground font-medium mb-1">
                    {t("edit_profile_information")}
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {t("update_personal_details")}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/dashboard/admin/profile`)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <span>{t("edit_profile")}</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => navigate(`/dashboard/admin/profile`)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>{t("edit_profile")}</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-foreground text-lg">{t("theme")}</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground text-sm">
              {t("customize_dashboard_appearance")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-foreground text-lg">
                {t("notification_preferences")}
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground text-sm">
              {t("choose_notification_method")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">{t("email_notifications")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("receive_notifications_email")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">{t("push_notifications")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("receive_push_notifications")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">{t("system_alerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("system_maintenance_updates")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-muted-foreground">{t("security_alerts")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("receive_security_notifications")}
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;