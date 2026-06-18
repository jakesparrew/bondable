import React from "react";
import { useOptimizedState, useOptimizedEffect } from '@/hooks/performance/useOptimizedComponents';
import { useState, useEffect } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequiredInput } from "@/components/ui/required-input";
import { OptionalInput } from "@/components/ui/optional-input";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { WeeklyAvailability } from "@/components/ui/weekly-availability";
import { EmailInput } from "@/components/ui/email-input";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete/index";
import {
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  BookOpen,
  Share2,
  FileUp,
  Clock,
  CreditCard,
  Shield,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Download,
  Trash2,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { PasswordStrengthInput } from "@/components/ui/password-strength-input";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditMode } from "@/contexts/EditModeContext";
import { PasswordConfirmationDialog } from "@/components/ui/password-confirmation-dialog";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useTranslation } from "react-i18next";
import { useFileUpload } from "@/hooks/utils/use-file-upload";
import { localDocumentService, type LocalDocument } from "@/services/api/localDocumentService";
import PDFViewer from "@/components/PDFViewer";
import VideoPreviewDialog from "@/components/dialogs/VideoPreviewDialog";
import { ImagePreviewDialog } from "@/components/dialogs/ImagePreviewDialog";

// Time slots template for each day
const defaultTimeSlots = [
  { time: "09:00", available: false },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: true },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: false },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
];

interface ProfileData {
  id: string;
  role: "therapist" | "client" | "admin";
  created_at?: string;
  updated_at?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  age?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  avatar_url?: string;
  weekly_availability?: any;
}

const Profile = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { userType } = useParams<{ userType: string }>();
  const currentUserType = useAuthManager().getCurrentUserType();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const {
    isEditMode,
    setIsEditMode,
    pendingPasswordChange,
    setPendingPasswordChange,
  } = useEditMode();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<any>(null);

  const [address, setAddress] = useState<AddressType>({
    address1: "",
    address2: "",
    formattedAddress: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    lat: 0,
    lng: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [profileData, setProfileData] = useState<ProfileData>({
    id: "",
    role: "client",
    first_name: "",
    last_name: "",
    email: user?.email || "",
    phone: "",
    age: "",
    date_of_birth: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_relationship: "",
    emergency_contact_phone: "",
    avatar_url: "",
    weekly_availability:
      userType === "therapist" || currentUserType === "therapist"
        ? {
            monday: defaultTimeSlots,
            tuesday: defaultTimeSlots,
            wednesday: defaultTimeSlots,
            thursday: defaultTimeSlots,
            friday: defaultTimeSlots,
            saturday: defaultTimeSlots.map((slot) => ({
              ...slot,
              available: false,
            })),
            sunday: defaultTimeSlots.map((slot) => ({
              ...slot,
              available: false,
            })),
          }
        : undefined,
  });


  const [originalProfileData, setOriginalProfileData] = useState<ProfileData>(
    {} as ProfileData
  );

  // Local documents state
  const [localDocs, setLocalDocs] = useOptimizedState<LocalDocument[]>([]);
  const [pdfUrl, setPdfUrl] = useOptimizedState<string | null>(null);
  const [pdfName, setPdfName] = useOptimizedState<string>("");
  const [videoUrl, setVideoUrl] = useOptimizedState<string | null>(null);
  const [videoOpen, setVideoOpen] = useOptimizedState(false);
  const [videoName, setVideoName] = useOptimizedState<string>("");
  const [imageUrl, setImageUrl] = useOptimizedState<string | null>(null);
  const [imageName, setImageName] = useOptimizedState<string>("");
  const [docSignedUrls, setDocSignedUrls] = useOptimizedState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;
    const fetchUrls = async () => {
      try {
        if (localDocs.length === 0) { setDocSignedUrls({}); return; }
        const results = await Promise.all(
          localDocs.map(async (d) => {
            try {
              const url = await localDocumentService.getSignedUrl(d.file_url);
              return [d.id, url] as const;
            } catch {
              return null;
            }
          })
        );
        if (!isCancelled) {
          const map: Record<string, string> = {};
          results.forEach((entry) => { if (entry) map[entry[0]] = entry[1]; });
          setDocSignedUrls(map);
        }
      } catch {
        // ignore
      }
    };
    fetchUrls();
    return () => { isCancelled = true; };
  }, [localDocs]);

  const getRowSizes = (count: number): number[] => {
    if (count <= 0) return [];
    if (count === 1) return [1];
    const sizes: number[] = [];
    let remaining = count;
    let wantTwo = true;
    while (remaining > 0) {
      const target = wantTwo ? 2 : 3;
      if (remaining >= target) {
        sizes.push(target);
        remaining -= target;
      } else {
        sizes.push(remaining);
        remaining = 0;
      }
      wantTwo = !wantTwo;
    }
    return sizes;
  };

  // File upload handlers for Local Documents
  const [
    { files: localDocFiles, isDragging: isDocsDragging, errors: docErrors },
    {
      handleDragEnter: docsDragEnter,
      handleDragLeave: docsDragLeave,
      handleDragOver: docsDragOver,
      handleDrop: docsDrop,
      openFileDialog: openDocsDialog,
      removeFile: removeDocFile,
      clearFiles: clearDocFiles,
      getInputProps: getDocsInputProps,
    },
  ] = useFileUpload({ multiple: true, maxFiles: 20, maxSize: 100 * 1024 * 1024 });

  // Load profile data on component mount
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
      loadLocalDocuments();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log("Loading profile data for user:", user.id);

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
          weekly_availability:
            data.weekly_availability ||
            (userType === "therapist" || currentUserType === "therapist"
              ? {
                  monday: defaultTimeSlots,
                  tuesday: defaultTimeSlots,
                  wednesday: defaultTimeSlots,
                  thursday: defaultTimeSlots,
                  friday: defaultTimeSlots,
                  saturday: defaultTimeSlots.map((slot) => ({
                    ...slot,
                    available: false,
                  })),
                  sunday: defaultTimeSlots.map((slot) => ({
                    ...slot,
                    available: false,
                  })),
                }
              : undefined),
        };

        setProfileData(updatedProfileData);
        setOriginalProfileData(updatedProfileData);

        // Update address if available
        if (data.address) {
          setAddress((prev) => ({
            ...prev,
            formattedAddress: data.address,
          }));
          setSearchInput(data.address);
        }
      }
    } catch (error) {
      console.error("Error in loadProfileData:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocalDocuments = async () => {
    if (!user?.id) return;
    try {
      const docs = await localDocumentService.listDocuments(user.id);
      setLocalDocs(docs);
    } catch (e) {
      console.error("Failed to load local documents", e);
    }
  };
  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    console.log("Avatar updated to:", newAvatarUrl);
    setProfileData((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
    // Refresh the profile data to ensure we have the latest
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
        address: address.formattedAddress || profileData.address,
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
      console.log("Saving profile data:", profileData);

      // 1) Upload any newly added Local Documents
      const fileObjects = (localDocFiles || []).map((f: any) => f.file).filter((f: File) => f instanceof File) as File[];
      if (fileObjects.length > 0) {
        for (const file of fileObjects) {
          try {
            const path = await localDocumentService.uploadFile(file, user.id);
            await localDocumentService.createDocument({
              userId: user.id,
              fileName: file.name,
              filePath: path,
              mimeType: file.type,
              fileSize: file.size,
            });
          } catch (e) {
            console.error("Failed to upload document", e);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        clearDocFiles();
        await loadLocalDocuments();
        toast.success("Documents saved");
      }

      // 2) Save profile fields
      const updatedData = pendingSaveData || {
        ...profileData,
        address: address.formattedAddress || profileData.address,
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

  const handleWeeklyAvailabilityChange = (newAvailability: any) => {
    setProfileData({
      ...profileData,
      weekly_availability: newAvailability,
    });
  };

  const handleGoBack = () => {
    navigate(
      currentUserType === "admin"
        ? `/dashboard/admin/settings`
        : `/dashboard/${userType}/settings`
    );
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    console.log(`Updating ${field} to:`, value);
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // New handler for phone input changes
  const handlePhoneChange = (value: string) => {
    console.log("Phone changed to:", value);
    handleInputChange("phone", value);
  };

  // New handler for emergency contact phone changes
  const handleEmergencyPhoneChange = (value: string) => {
    console.log("Emergency contact phone changed to:", value);
    handleInputChange("emergency_contact_phone", value);
  };

  // New handler for date of birth changes
  const handleDateOfBirthChange = (value: string) => {
    console.log("Date of birth changed to:", value);
    handleInputChange("date_of_birth", value);
  };

  // Instant loading - no skeleton needed

  const displayUserType = currentUserType || userType;

  if (displayUserType === "therapist" || displayUserType === "admin") {
    return (
      <DashboardLayout
        userType={displayUserType as "therapist" | "client" | "admin"}
      >
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
                  {displayUserType === "admin"
                    ? t("admin_profile")
                    : t("therapist_profile")}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {displayUserType === "admin"
                    ? t("manage_admin_account_info_settings")
                    : t("manage_professional_info_settings")}
                </p>
              </div>
            </div>
            {!isMobile && (
              <Button
                onClick={() => {
                  if (isEditMode) {
                    handleCancel(); // reset to original profile data
                  } else {
                    setIsEditMode(true); // enter edit mode
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
                    handleCancel(); // reset to original profile data
                  } else {
                    setIsEditMode(true); // enter edit mode
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
                  onChange={(e) =>
                    handleInputChange("last_name", e.target.value)
                  }
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
                  required
                  disabled
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RequiredInput
                  label={t("age")}
                  placeholder={t("enter_your_age")}
                  value={profileData.age || ""}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  readOnly={!isEditMode}
                  className={`${
                    isEditMode
                      ? "bg-background border-border"
                      : "bg-card border-border"
                  } text-foreground placeholder:text-muted-foreground focus:border-ring`}
                />
                <SimpleDatePicker
                  label={t("date_of_birth")}
                  value={profileData.date_of_birth || ""}
                  onChange={handleDateOfBirthChange}
                  readOnly={!isEditMode}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t("location")}
                </Label>
                <AddressAutoComplete
                  address={address}
                  setAddress={setAddress}
                  searchInput={searchInput}
                  setSearchInput={setSearchInput}
                  dialogTitle="Address"
                  placeholder="123 Main Street, City, State/Province, Postal Code, Country"
                  showInlineError={false}
                  className={`${
                    isEditMode
                      ? "bg-background border-border"
                      : "bg-card border-border"
                  } text-foreground placeholder:text-muted-foreground focus:border-ring`}
                  readOnly={!isEditMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Availability - Only for therapists */}
          {displayUserType === "therapist" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-foreground text-lg">
                    {t("weekly_availability")}
                  </CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm">
                  {t("set_available_time_slots")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WeeklyAvailability
                  value={profileData.weekly_availability}
                  onChange={handleWeeklyAvailabilityChange}
                  readOnly={!isEditMode}
                />
              </CardContent>
            </Card>
          )}

          {/* Local Documents - Only for therapists */}
          {displayUserType === "therapist" && (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <FileUp className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-foreground text-lg">
                    {t("local_documents")}
                  </CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-sm">
                  {t("store_documents_practice")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Uploader (enabled only in edit mode) */}
                <div className={`${!isEditMode ? "pointer-events-none opacity-50" : ""}`}>
                  <FileUpload
                    maxSize={100 * 1024 * 1024}
                    maxFiles={20}
                    externalFiles={localDocFiles}
                    externalHandlers={{
                      isDragging: isDocsDragging,
                      errors: docErrors,
                      handleDragEnter: docsDragEnter,
                      handleDragLeave: docsDragLeave,
                      handleDragOver: docsDragOver,
                      handleDrop: docsDrop,
                      openFileDialog: openDocsDialog,
                      removeFile: removeDocFile,
                      clearFiles: clearDocFiles,
                      getInputProps: getDocsInputProps,
                    }}
                  />
                </div>

                {/* Existing documents list */}
                {localDocs.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {(() => {
                      const sizes = getRowSizes(localDocs.length);
                      let offset = 0;
                      return sizes.map((size, rowIdx) => {
                        const rowDocs = localDocs.slice(offset, offset + size);
                        offset += size;
                        const gridColsClass = size === 1 ? "md:grid-cols-1" : size === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
                        return (
                          <div key={`row-${rowIdx}`} className={`grid grid-cols-1 ${gridColsClass} gap-3`}>
                            {rowDocs.map((doc) => {
                              const signedUrl = docSignedUrls[doc.id];
                              const LeftContent = (
                                <div className="flex items-center space-x-3 min-w-0">
                                  {doc.file_type === 'image' && <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                                  {doc.file_type === 'video' && <VideoIcon className="h-5 w-5 text-muted-foreground shrink-0" />}
                                  {doc.file_type === 'pdf' && <FileText className="h-5 w-5 text-muted-foreground shrink-0" />}
                                  {doc.file_type === 'other' && <FileText className="h-5 w-5 text-muted-foreground shrink-0" />}
                                  <div className="min-w-0">
                                    <p className="text-foreground text-sm truncate">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{doc.mime_type}</p>
                                  </div>
                                </div>
                              );
                              return (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between w-full bg-background border border-border rounded-lg p-3 hover:bg-muted transition"
                                >
                                  <div className="flex-1 min-w-0">
                                    {doc.file_type === 'image' ? (
                                      <ImagePreviewDialog
                                        src={signedUrl || ""}
                                        alt={doc.file_name}
                                        trigger={<button className="w-full text-left">{LeftContent}</button>}
                                      />
                                    ) : (
                                      <button
                                        className="w-full text-left"
                                        onClick={() => {
                                          if (!signedUrl) return;
                                          if (doc.file_type === 'video') {
                                            setVideoUrl(signedUrl); setVideoName(doc.file_name); setVideoOpen(true);
                                          } else if (doc.file_type === 'pdf') {
                                            setPdfUrl(signedUrl); setPdfName(doc.file_name);
                                          } else {
                                            toast.info(t('no_preview_supported') || 'No preview supported');
                                          }
                                        }}
                                      >
                                        {LeftContent}
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 ml-3">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = signedUrl;
                                        if (!url) return;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = doc.file_name;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                      }}
                                      aria-label={t('download') || 'Download'}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await localDocumentService.deleteDocument(doc.id, doc.file_url);
                                          setLocalDocs(localDocs.filter(d => d.id !== doc.id));
                                          const { [doc.id]: _omit, ...rest } = docSignedUrls;
                                          setDocSignedUrls(rest);
                                          toast.success(t('deleted_successfully') || 'Deleted');
                                        } catch (err) {
                                          console.error('Delete failed', err);
                                          toast.error(t('failed_to_delete') || 'Failed to delete');
                                        }
                                      }}
                                      aria-label={t('delete') || 'Delete'}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* PDF viewer */}
                {pdfUrl && (
                  <PDFViewer fileUrl={pdfUrl} fileName={pdfName} onCancel={() => setPdfUrl(null)} />
                )}

                {/* Video viewer */}
                {videoUrl && (
                  <VideoPreviewDialog isOpen={videoOpen} onClose={() => { setVideoOpen(false); setVideoUrl(null); }} videoUrl={videoUrl} fileName={videoName || 'video'} />
                )}
              </CardContent>
            </Card>
          )}

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
                  placeholder={t("confirm_password_placeholder")}
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

          {/* Save Changes Button */}
          {isEditMode && (
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-border bg-transparent hover:bg-card text-muted-foreground hover:text-foreground"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {t("save_changes")}
              </Button>
            </div>
          )}
        </div>

        <PasswordConfirmationDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          onConfirm={handlePasswordConfirm}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userType={displayUserType as "therapist" | "client" | "admin"}
    >
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
                {t("client_profile")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("manage_personal_therapy_info")}
              </p>
            </div>
          </div>
          {!isMobile && (
            <Button
              onClick={() => {
                if (isEditMode) {
                  handleCancel(); // reset to original profile data
                } else {
                  setIsEditMode(true); // enter edit mode
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
                  handleCancel(); // reset to original profile data
                } else {
                  setIsEditMode(true); // enter edit mode
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OptionalInput
                label={t("age")}
                placeholder={t("enter_your_age")}
                value={profileData.age || ""}
                onChange={(e) => handleInputChange("age", e.target.value)}
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
               <SimpleDatePicker
                 label={t("date_of_birth")}
                value={profileData.date_of_birth || ""}
                onChange={handleDateOfBirthChange}
                readOnly={!isEditMode}
              />
            </div>
            <div className="space-y-2">
               <Label className="text-sm font-medium text-muted-foreground">
                 {t("address")}
               </Label>
              <AddressAutoComplete
                address={address}
                setAddress={setAddress}
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                dialogTitle="Address"
                placeholder="123 Main Street, City, State/Province, Postal Code, Country"
                showInlineError={false}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
                readOnly={!isEditMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
               <CardTitle className="text-foreground text-lg">
                 {t("emergency_contact")}
               </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RequiredInput
                 label={t("name")}
                 placeholder={t("emergency_contact_name")}
                value={profileData.emergency_contact_name || ""}
                onChange={(e) =>
                  handleInputChange("emergency_contact_name", e.target.value)
                }
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
              <RequiredInput
                 label={t("relationship")}
                 placeholder={t("relationship_to_you")}
                value={profileData.emergency_contact_relationship || ""}
                onChange={(e) =>
                  handleInputChange(
                    "emergency_contact_relationship",
                    e.target.value
                  )
                }
                readOnly={!isEditMode}
                className={`${
                  isEditMode
                    ? "bg-background border-border"
                    : "bg-card border-border"
                } text-foreground placeholder:text-muted-foreground focus:border-ring`}
              />
            </div>
            <PhoneInputComponent
              label={t("phone")}
              value={profileData.emergency_contact_phone || ""}
              onChange={handleEmergencyPhoneChange}
              readOnly={!isEditMode}
              disabled
            />
          </CardContent>
        </Card>

        {/* Documents for Therapist */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileUp className="h-5 w-5 text-muted-foreground" />
               <CardTitle className="text-foreground text-lg">
                 {t("documents_for_therapist")}
               </CardTitle>
             </div>
             <CardDescription className="text-muted-foreground text-sm">
               {t("upload_documents_therapist_requested")}
             </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`${
                !isEditMode ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <FileUpload maxSize={50 * 1024 * 1024} maxFiles={5} />
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
                placeholder={t("confirm_password_placeholder")}
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

        {/* Save Changes Button */}
        {isEditMode && (
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-border bg-transparent hover:bg-card text-muted-foreground hover:text-foreground"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {t("save_changes")}
            </Button>
          </div>
        )}
      </div>

      <PasswordConfirmationDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onConfirm={handlePasswordConfirm}
      />
    </DashboardLayout>
  );
};

export default Profile;
