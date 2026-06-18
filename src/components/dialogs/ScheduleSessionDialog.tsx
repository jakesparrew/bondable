
import { useState, useEffect } from "react";
import console from "@/lib/production-console";
import { 
  useOptimizedState, 
  useOptimizedEffect 
} from "@/hooks/performance/useOptimizedComponents";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleDatePicker } from "@/components/ui/simple-date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import AddressAutoComplete, {
  AddressType,
} from "@/components/ui/address-autocomplete";
import { Session } from "@/types/session";
import { Client } from "@/types/client";
import { Trash2 } from "lucide-react";
import { therapistClientService } from "@/services/api";
import { clientTherapistService } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useTranslation } from "react-i18next";

interface ScheduleSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (session: Omit<Session, "id">, clientId?: string) => void;
  editingSession?: Session | null;
  onDelete?: (sessionId: string) => void;
  preselectedClient?: Client;
  userType: "therapist" | "client";
}

const ScheduleSessionDialog = ({
  isOpen,
  onClose,
  onSchedule,
  editingSession,
  onDelete,
  preselectedClient,
  userType,
}: ScheduleSessionDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const [formData, setFormData] = useOptimizedState({
    clientId: "",
    clientName: "",
    therapistId: "",
    therapistName: "",
    date: "",
    time: "10:00",
    duration: "50",
    customDuration: "",
    type: "Individual Therapy",
    sessionType: "In-Person" as "In-Person" | "Video",
    notes: "",
  });

  const [address, setAddress] = useOptimizedState<AddressType>({
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

  const [searchInput, setSearchInput] = useOptimizedState("");

  // Normalize therapy type to match Select values
  const normalizeTherapyType = (input?: string) => {
    const s = (input || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
    switch (s) {
      case "individual_therapy":
      case "individual":
        return "Individual Therapy";
      case "couples_therapy":
      case "couples":
        return "Couples Therapy";
      case "group_therapy":
      case "group":
        return "Group Therapy";
      case "family_therapy":
      case "family":
        return "Family Therapy";
      default:
        return input && ["Individual Therapy","Couples Therapy","Group Therapy","Family Therapy"].includes(input)
          ? (input as string)
          : "Individual Therapy";
    }
  };

  // Fetch therapist's clients using the correct service
  const { data: therapistClients = [] } = useQuery({
    queryKey: ['therapist-clients', user?.id],
    queryFn: () => user?.id ? therapistClientService.getClientsForTherapist(user.id) : Promise.resolve([]),
    enabled: !!user?.id && userType === "therapist",
  });

  // Fetch client's therapists for client view
  const { data: clientTherapists = [] } = useQuery({
    queryKey: ['client-therapists', user?.id],
    queryFn: () => user?.id ? clientTherapistService.getConnectedTherapists(user.id) : Promise.resolve([]),
    enabled: !!user?.id && userType === "client",
  });

  // Pre-fill form when editing or when preselected client is provided
  useOptimizedEffect(() => {
    if (editingSession) {
      setFormData({
        clientId: editingSession.client_id,
        clientName: userType === "therapist" ? (editingSession.client?.full_name || "") : "",
        therapistId: editingSession.therapist_id,
        therapistName: userType === "client" ? (editingSession.therapist?.full_name || "") : "",
        date: editingSession.session_date,
        time: editingSession.session_time || "10:00",
        duration: editingSession.duration_minutes?.toString() || "50",
        customDuration: "",
        type: normalizeTherapyType(editingSession.therapy_type || editingSession.session_type || "Individual Therapy"),
        sessionType: (editingSession.session_format as "In-Person" | "Video") || "In-Person",
        notes: editingSession.notes || "",
      });

      setAddress((prev) => ({
        ...prev,
        formattedAddress: editingSession.location || "",
      }));
      setSearchInput(editingSession.location || "");
    } else if (preselectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: preselectedClient.id,
        clientName: preselectedClient.name,
      }));
    } else {
      // Reset form for new session
      setFormData({
        clientId: "",
        clientName: "",
        therapistId: "",
        therapistName: "",
        date: "",
        time: "10:00",
        duration: "50",
        customDuration: "",
        type: "Individual Therapy",
        sessionType: "In-Person",
        notes: "",
      });
      setAddress({
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
      setSearchInput("");
    }
  }, [editingSession, preselectedClient, userType]);

  const handleClientSelect = (clientId: string) => {
    const selectedClient = therapistClients.find(client => client.id === clientId);
    if (selectedClient) {
      console.log("Client selected:", selectedClient);
      setFormData(prev => ({
        ...prev,
        clientId,
        clientName: selectedClient.name,
      }));
    }
  };

  const handleTherapistSelect = (therapistId: string) => {
    const selectedTherapist = clientTherapists.find(therapist => therapist.id === therapistId);
    if (selectedTherapist) {
      console.log("Therapist selected:", selectedTherapist);
      setFormData(prev => ({
        ...prev,
        therapistId,
        therapistName: selectedTherapist.name,
      }));
    }
  };

  const handleDateChange = (date: string) => {
    console.log("Date changed to:", date);
    setFormData(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleDurationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, duration: value }));
    if (value !== "custom") {
      setFormData((prev) => ({ ...prev, customDuration: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submission started with data:", formData);

    // Validate required fields
    if (userType === "therapist" && !formData.clientId) {
      console.error("Client selection is required for therapists");
      return;
    }

    if (userType === "client" && !formData.therapistId) {
      console.error("Therapist selection is required for clients");
      return;
    }

    if (!formData.date) {
      console.error("Date is required");
      return;
    }

    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    const finalDuration = formData.duration === "custom" 
      ? parseInt(formData.customDuration) || 50
      : parseInt(formData.duration);

    const sessionData: Omit<Session, "id"> = {
      session_date: formData.date,
      session_time: formData.time,
      duration_minutes: finalDuration,
      session_type: formData.type,
      therapy_type: formData.type,
      session_format: formData.sessionType,
      location: address.formattedAddress || (formData.sessionType === "Video" ? "Video Call" : "Office"),
      status: "Pending", // Always set to pending when creating/editing
      notes: formData.notes,
      therapist_id: userType === "therapist" ? user.id : formData.therapistId,
      client_id: userType === "client" ? user.id : formData.clientId,
      current_requester_id: user.id, // Mark current user as requester
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Calling onSchedule with:", sessionData, "Client ID:", formData.clientId);
    onSchedule(sessionData, formData.clientId);
    onClose();
  };

  const handleDelete = () => {
    if (editingSession && onDelete) {
      onDelete(editingSession.id);
      onClose();
    }
  };

  // Determine if client dropdown should be read-only
  const isViewingMode = editingSession && editingSession.status === "Confirmed";
  const shouldShowClientReadOnly = isViewingMode || (editingSession && editingSession.status !== "Pending");
  
  // Add request update functionality for confirmed sessions in view details
  const canRequestUpdate = editingSession?.status === "Confirmed" && user?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground mb-4">
            {editingSession
              ? userType === "client"
                ? t("edit_session_request")
                : t("edit_session")
              : userType === "client"
              ? t("request_new_session")
              : t("schedule_new_session")}
          </DialogTitle>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Therapist Selection for Clients */}
          {userType === "client" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("select_therapist")} <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.therapistId}
                onValueChange={handleTherapistSelect}
                required
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder={t("select_a_therapist")} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {clientTherapists.map((therapist) => (
                    <SelectItem
                      key={therapist.id}
                      value={therapist.id}
                      className="text-muted-foreground hover:bg-muted"
                    >
                      {therapist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Client Selection for Therapists */}
          {preselectedClient ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("client")}
              </Label>
              <div className="bg-background border border-border rounded-md px-3 py-2 text-foreground">
                {preselectedClient.name}
              </div>
            </div>
          ) : userType === "therapist" ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {t("select_client")} <span className="text-red-400">*</span>
              </Label>
              {shouldShowClientReadOnly ? (
                <div className="bg-background border border-border rounded-md px-3 py-2 text-foreground">
                  {formData.clientName || "Unknown Client"}
                </div>
              ) : (
                <Select
                  value={formData.clientId}
                  onValueChange={handleClientSelect}
                  required
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder={t("select_a_client")} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {therapistClients.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={client.id}
                        className="text-muted-foreground hover:bg-muted"
                      >
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}

          <div className="bg-card border border-border p-4 rounded-xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <SimpleDatePicker
                  label={t("date")}
                  value={formData.date}
                  className="flex-1 "
                  onChange={handleDateChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <TimePicker
                  label={t("time")}
                  value={formData.time}
                  onChange={(time) =>
                    setFormData((prev) => ({ ...prev, time }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">{t("duration_minutes")}<span className="text-red-400">&nbsp;*</span></Label>
                <Select
                  value={formData.duration}
                  onValueChange={handleDurationChange}
                  required
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="30" className="text-muted-foreground">
                      30 {t("min")}
                    </SelectItem>
                    <SelectItem value="45" className="text-muted-foreground">
                      45 {t("min")}
                    </SelectItem>
                    <SelectItem value="50" className="text-muted-foreground">
                      {t("50_min")}
                    </SelectItem>
                    <SelectItem value="60" className="text-muted-foreground">
                      60 {t("min")}
                    </SelectItem>
                    <SelectItem value="90" className="text-muted-foreground">
                      90 {t("min")}
                    </SelectItem>
                    <SelectItem value="custom" className="text-muted-foreground">
                      {t("custom")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {formData.duration === "custom" && (
                  <Input
                    type="number"
                    value={formData.customDuration}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customDuration: e.target.value,
                      }))
                    }
                    placeholder={t("enter_duration_minutes")}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">{t('session_format')}<span className="text-red-400">&nbsp;*</span></Label>
                <Select
                  value={formData.sessionType}
                  onValueChange={(value: "In-Person" | "Video") =>
                    setFormData((prev) => ({ ...prev, sessionType: value }))
                  }
                  required
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="In-Person" className="text-muted-foreground">
                      {t("in_person")}
                    </SelectItem>
                    <SelectItem value="Video" className="text-muted-foreground">
                      {t("video_call")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('therapy_type')}<span className="text-red-400">&nbsp;*</span></Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
              required
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem
                  value="Individual Therapy"
                  className="text-muted-foreground"
                >
                  {t("individual_therapy")}
                </SelectItem>
                <SelectItem value="Couples Therapy" className="text-muted-foreground">
                  {t("couples_therapy")}
                </SelectItem>
                <SelectItem value="Group Therapy" className="text-muted-foreground">
                  {t("group_therapy")}
                </SelectItem>
                <SelectItem value="Family Therapy" className="text-muted-foreground">
                  {t("family_therapy")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('location')}</Label>
            <AddressAutoComplete
              address={address}
              setAddress={setAddress}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              dialogTitle={t("select_location")}
              placeholder={
                formData.sessionType === "Video"
                  ? t("video_call")
                  : t("enter_office_address")
              }
              className="bg-background border-border text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">{t('notes')}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder={t("session_notes_instructions")}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-between gap-2 pt-4">
            {canRequestUpdate && (
              <Button
                type="button"
                variant="outline"
                className="border-border bg-card hover:bg-muted text-muted-foreground"
                onClick={() => {
                  if (editingSession) {
                    // Convert to pending with current user as requester
                    const updateData = {
                      status: "Pending" as const,
                      current_requester_id: user.id
                    };
                    onSchedule({ ...editingSession, ...updateData } as any);
                  }
                }}
              >
                {t("request_update")}
              </Button>
            )}
            
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                {t("cancel")}
              </Button>

              {(!editingSession || editingSession.status === "Pending") && (
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingSession
                    ? t("update")
                    : userType === "client"
                    ? t("request_session")
                    : t("schedule_session")}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleSessionDialog;
