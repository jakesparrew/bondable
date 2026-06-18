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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import {
  User,
  Bell,
  Shield,
  ExternalLink,
  Palette,
  Copy,
  Check,
  Globe,
  CheckIcon,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import ThemeSelector from "@/components/ThemeSelector";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { inviteCodeService } from "@/services/api";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import PricingSection from "@/components/PricingSection";

const Settings = () => {
  const { t } = useTranslation();
  const { userType } = useParams<{ userType: string }>();
  const currentUserType = useAuthManager().getCurrentUserType();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuthManager();
  const [inviteCode, setInviteCode] = useOptimizedState<string | null>(null);
  const [copied, setCopied] = useOptimizedState(false);

  const [currentPassword, setCurrentPassword] = useOptimizedState("");
  const [newPassword, setNewPassword] = useOptimizedState("");
  const [confirmPassword, setConfirmPassword] = useOptimizedState("");
  const [isLoading, setIsLoading] = useOptimizedState(false); // Always false for instant loading
  const { i18n } = useTranslation();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);  // Save the language to localStorage
  };

  const languageOptions = [
    { code: "en", label: "English", icon: "🇬🇧" },
    { code: "fr", label: "Français", icon: "🇫🇷" },
    { code: "es", label: "Espagnol", icon: "🇪🇸" },
  ];

  useOptimizedEffect(() => {
    const fetchInviteCode = async () => {
      if (
        (userType === "therapist" || currentUserType === "therapist") &&
        user?.id
      ) {
        const code = await inviteCodeService.getTherapistInviteCode(user.id);
        setInviteCode(code);
      }
      // Instant loading - no delay needed
      setIsLoading(false);
    };

    fetchInviteCode();
  }, [userType, user?.id]);

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Instant loading - no skeleton needed

  const displayUserType =
    currentUserType || (userType as "therapist" | "client" | "admin");

  return (
    <DashboardLayout userType={displayUserType}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">{t("settings")}</h2>
            <p className="text-gray-400 text-sm">
              {t("manage_account_preferences_notifications")}
            </p>
          </div>
        </div>

        {/* Profile Management */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-white text-lg">
                {t("profile_management")}
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400 text-sm">
              {t("manage_personal_therapy_emergency_info")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isMobile ? (
              <div className="flex items-center justify-between p-4 border border-[#1f1f23] rounded-lg bg-[#0a0a0a]">
                <div>
                  <h4 className="text-white font-medium mb-1">
                    {t("edit_profile_information")}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {t("update_personal_therapy_emergency_details")}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    navigate(
                      currentUserType === "admin"
                        ? `/dashboard/admin/profile`
                        : `/dashboard/${userType}/profile`
                    )
                  }
                  className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <span>{t("edit_profile")}</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() =>
                  navigate(
                    currentUserType === "admin"
                      ? `/dashboard/admin/profile`
                      : `/dashboard/${userType}/profile`
                  )
                }
                className="w-full bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>{t("edit_profile")}</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-white text-lg">{t("theme")}</CardTitle>
            </div>
            <CardDescription className="text-gray-400 text-sm">
              {t("customize_dashboard_appearance")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-[#111111] border-[#1f1f23]">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-400" />
              <CardTitle className="text-white text-lg">
                {t("notification_preferences")}
              </CardTitle>
            </div>
            <CardDescription className="text-gray-400 text-sm">
              {t("choose_notification_method_important_events")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">{t("email_notifications")}</Label>
                  <p className="text-sm text-gray-400">
                    {t("receive_notifications_via_email")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-[#1f1f23]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">{t("push_notifications")}</Label>
                  <p className="text-sm text-gray-400">
                    {t("receive_push_notifications_browser")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-[#1f1f23]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">{t("appointment_reminders")}</Label>
                  <p className="text-sm text-gray-400">
                    {t("get_notified_before_appointments")}
                  </p>
                </div>
                <Switch />
              </div>
              <Separator className="bg-[#1f1f23]" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-gray-300">{t("new_client_messages")}</Label>
                  <p className="text-sm text-gray-400">
                    {t("receive_notifications_new_messages")}
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <PricingSection />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 w-48 justify-between ml-auto !mt-3 bg-[#111111] border-[#1f1f23]"
            >
              <span>
                {
                  languageOptions.find((lang) => lang.code === i18n.language)
                    ?.icon
                }{" "}
                {i18n.language.toUpperCase()}
              </span>
              <Globe className="h-5 w-5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>

          {/* Dropdown content with full width and space between items */}
          <DropdownMenuContent
            className="bg-[#111111] border-[#1f1f23] w-48 space-y-1"
            align="start"
          >
            {languageOptions.map(({ code, label, icon }) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`flex items-center p-2 rounded-md hover:bg-[#333333] cursor-pointer ${
                  i18n.language === code ? "bg-[#333333]" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  {icon} {label}
                </span>
                {i18n.language === code && (
                  <CheckIcon className="h-5 w-5 ml-auto" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
