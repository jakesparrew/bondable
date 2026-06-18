import React from "react";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import console from "@/lib/production-console";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequiredInput } from "@/components/ui/required-input";
import { OptionalInput } from "@/components/ui/optional-input";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { User, Phone, Mail, Shield, ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { PasswordConfirmationDialog } from "@/components/ui/password-confirmation-dialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
// Removed skeleton import - using instant loading
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface ProfileData {
  id: string;
  role: "therapist" | "client" | "admin";
  created_at?: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

const AdminProfile = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [currentPassword, setCurrentPassword] = useOptimizedState("");
  const [newPassword, setNewPassword] = useOptimizedState("");
  const [confirmPassword, setConfirmPassword] = useOptimizedState("");
  const [loading, setLoading] = useOptimizedState(true);
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const {
    isEditMode,
    setIsEditMode,
    pendingPasswordChange,
    setPendingPasswordChange,
  } = useEditMode();
  const [showPasswordDialog, setShowPasswordDialog] = useOptimizedState(false);
  const [pendingSaveData, setPendingSaveData] = useOptimizedState<any>(null);

  const [profileData, setProfileData] = useOptimizedState<ProfileData>({
    id: "",
    role: "admin" as const,
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    avatar_url: "",
  });

  const [originalProfileData, setOriginalProfileData] = useOptimizedState<ProfileData>(
    {} as ProfileData
  );

  // Load profile data on component mount
  useOptimizedEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log("Loading profile data for admin user:", user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        return;
      }

      if (data) {
        console.log("Profile data loaded:", data);

        // Use existing first_name and last_name
        const firstName = data.first_name || "";
        const lastName = data.last_name || "";

        const updatedProfileData: ProfileData = {
          ...data,
          first_name: firstName,
          last_name: lastName,
          email: user.email || data.email || "",
          avatar_url: data.avatar_url || "",
        };

        setProfileData(updatedProfileData);
        setOriginalProfileData(updatedProfileData);
      }
    } catch (error) {
      console.error("Error in loadProfileData:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    console.log("Avatar updated to:", newAvatarUrl);
    setProfileData((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
    await loadProfileData();
  };

  const handleCancel = () => {
    setProfileData(originalProfileData);
    setIsEditMode(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPendingPasswordChange(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    const hasPasswordChange = currentPassword || newPassword || confirmPassword;

    if (hasPasswordChange) {
      setPendingPasswordChange(true);
      const updatedData = {
        ...profileData,
        updated_at: new Date().toISOString(),
      };
      setPendingSaveData(updatedData);
      setShowPasswordDialog(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    if (!user?.id) return;

    try {
      console.log("Saving admin profile data:", profileData);

      const updatedData = pendingSaveData || {
        ...profileData,
        updated_at: new Date().toISOString(),
      };

      console.log("Final data being saved:", updatedData);

      const { error } = await supabase
        .from("profiles")
        .update(updatedData)
        .eq("id", user.id);

      if (error) {
        console.error("Error saving profile:", error);
        toast.error("Failed to save profile changes");
        return;
      }

      console.log("Profile saved successfully");
      toast.success("Profile updated successfully");
      setOriginalProfileData(updatedData);
      setIsEditMode(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPendingPasswordChange(false);
      setPendingSaveData(null);
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast.error("An error occurred while saving");
    }
  };

  const handlePasswordConfirm = () => {
    setShowPasswordDialog(false);
    performSave();
  };

  const handlePasswordCancel = () => {
    setShowPasswordDialog(false);
    setPendingSaveData(null);
    setPendingPasswordChange(false);
  };

  const handleGoBack = () => {
    navigate(`/dashboard/admin/settings`);
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    console.log(`Updating ${field} to:`, value);
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhoneChange = (value: string) => {
    console.log("Phone changed to:", value);
    handleInputChange("phone", value);
  };

  // Instant loading - no skeleton needed

  return (
    <DashboardLayout userType="admin">
      <div className="flex items-center gap-4 mb-2">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground hover:bg-muted p-2"
          onClick={handleGoBack}
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back_to_settings")}
        </Button>
      </div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AvatarUpload
              currentAvatarUrl={profileData.avatar_url}
              onAvatarUpdate={handleAvatarUpdate}
              size="md"
            />
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">
                {t("admin_profile")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("manage_admin_account")}
              </p>
            </div>
          </div>
          {!isMobile && (
            <Button
              onClick={() => {
                if (isEditMode) {
                  handleCancel();
                } else {
                  setIsEditMode(true);
                }
              }}
              variant={isEditMode ? "outline" : "default"}
              className={` ${
                isEditMode
                  ? "border-border bg-transparent hover:bg-card text-muted-foreground hover:text-foreground"
                  : " bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
              }`}
            >
              {isEditMode ? t("cancel") : t("edit_profile")}
            </Button>
          )}
        </div>
        {isMobile && (
          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => {
                if (isEditMode) {
                  handleCancel();
                } else {
                  setIsEditMode(true);
                }
              }}
              variant={isEditMode ? "outline" : "default"}
              className={` ${
                isEditMode
                  ? "w-full border-border bg-transparent hover:bg-card text-muted-foreground hover:text-foreground"
                  : "w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
              }`}
            >
              {isEditMode ? t("cancel") : t("edit_profile")}
            </Button>
          </div>
        )}

        {/* Personal Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-foreground text-lg">
                {t("personal_information")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <RequiredInput
                 label={t("first_name")}
                placeholder={t("enter_your_first_name")}
                value={profileData.first_name || ""}
                onChange={(e) =>
                  handleInputChange("first_name", e.target.value)
                }
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
               <RequiredInput
                 label={t("last_name")}
                 placeholder={t("enter_your_last_name")}
                value={profileData.last_name || ""}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EmailInput
                label={t("email")}
                placeholder={t("enter_your_email")}
                value={profileData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                readOnly={!isEditMode}
                required
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
              <PhoneInputComponent
                label={t("phone")}
                value={profileData.phone || ""}
                onChange={handlePhoneChange}
                readOnly={!isEditMode}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-foreground text-lg">
                {t("security_privacy")}
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground text-sm">
              {t("manage_account_security")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-muted-foreground">
                {t("current_password")}
              </Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={t("enter_current_password")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border text-foreground"
                    : "bg-card border-border text-muted-foreground"
                } placeholder:text-muted-foreground focus:border-ring`}
              />
            </div>

            <div>
              <PasswordStrengthInput
                label={t("new_password")}
                placeholder={t("enter_new_password")}
                value={newPassword}
                onChange={setNewPassword}
                className={`${
                  isEditMode
                    ? "bg-background border-border text-foreground"
                    : "bg-card border-border text-muted-foreground"
                } placeholder:text-muted-foreground focus:border-ring`}
                readOnly={!isEditMode}
                state={isEditMode ? "default" : "always"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                {t("confirm_new_password")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("confirm_password")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border text-foreground"
                    : "bg-card border-border text-muted-foreground"
                } placeholder:text-muted-foreground focus:border-ring`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditMode && (
          <div className="flex justify-end space-x-3">
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {t("save_changes")}
            </Button>
          </div>
        )}
      </div>

      {/* Password confirmation dialog */}
      <PasswordConfirmationDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onConfirm={handlePasswordConfirm}
      />
    </DashboardLayout>
  );
};

export default AdminProfile;
