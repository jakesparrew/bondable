
import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import BaseDialog from "./BaseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RequiredInput } from "@/components/ui/required-input";
import { PhoneInputComponent } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { useTranslation } from "react-i18next";

type Client = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Pending";
  joinDate: string;
  lastSession: string;
  image?: string;
};

interface EditClientDialogProps {
  client: Client;
  onSave: (updatedClient: Client) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditClientDialog = ({
  client,
  onSave,
  open,
  onOpenChange
}: EditClientDialogProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formData, setFormData] = useOptimizedState({
    firstName: client.firstName || client.name.split(" ")[0] || "",
    lastName: client.lastName || client.name.split(" ").slice(1).join(" ") || "",
    email: client.email && client.email !== t("no_email_provided") && client.email !== "No email provided" ? client.email : "",
    phone: client.phone && client.phone !== t("no_phone_provided") && client.phone !== "No phone provided" ? client.phone : "",
    status: client.status,
  });

  const handleSave = () => {
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert(t("first_name_last_name_required"));
      return;
    }

    const updatedClient = {
      ...client,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      email: formData.email.trim() || t("no_email_provided"),
      phone: formData.phone.trim() || t("no_phone_provided"),
      status: formData.status,
    };

    console.log("Saving client with data:", updatedClient);
    onSave(updatedClient);
    onOpenChange(false);
  };

  const handleViewProfile = () => {
    // Navigate to full client profile page
    navigate(`/dashboard/therapist/clients/${client.id}/client-profile`);
    onOpenChange(false);
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("edit_client")}
      className="bg-card border-border text-foreground sm:max-w-[425px]"
    >
        <div className="space-y-4 pt-0">
          <div className="flex gap-2">
            <div className="space-y-2">
              <RequiredInput
                label={t("first_name")}
                placeholder={t("enter_first_name")}
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                readOnly
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />
            </div>
            <div className="space-y-2">
              <RequiredInput
                label={t("last_name")}
                placeholder={t("enter_last_name")}
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                readOnly
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />
            </div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl">
            <div className="space-y-2">
              <EmailInput
                label={t("email")}
                placeholder={t("enter_email_address")}
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                readOnly
                required
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
              />
            </div>
            <div className="space-y-2 pt-2">
              <PhoneInputComponent
                label={t("phone")}
                value={formData.phone}
                required
                onChange={(newValue) =>
                  setFormData((prev) => ({ ...prev, phone: newValue }))
                }
                readOnly
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status" className="text-muted-foreground">
              {t("status")}
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: "Active" | "Inactive" | "Pending") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem
                  value="Active"
                  className="text-muted-foreground hover:bg-muted"
                >
                  {t("active")}
                </SelectItem>
                <SelectItem
                  value="Inactive"
                  className="text-muted-foreground hover:bg-muted"
                >
                  {t("inactive")}
                </SelectItem>
                <SelectItem
                  value="Pending"
                  className="text-muted-foreground hover:bg-muted"
                >
                  {t("pending")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3 ">
            <Button
              onClick={handleViewProfile}
              className="bg-background border-border text-foreground w-full mb-1 border hover:bg-muted hover:text-muted-foreground"
            >
              <User className="w-4 h-4 mr-2" />
              {t("view_full_profile")}
            </Button>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("save_changes")}
              </Button>
            </div>
          </div>
        </div>
    </BaseDialog>
  );
};

export default EditClientDialog;
