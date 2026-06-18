import { useOptimizedState } from '@/hooks/performance/useOptimizedComponents';

import console from "@/lib/production-console";
import BaseDialog from "./BaseDialog";
import { Button } from "@/components/ui/button";
import { RequiredInput } from "@/components/ui/required-input";
import { EmailInput } from "@/components/ui/email-input";
import { Send, CornerRightDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/api";
import { clientInvitationService } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useTranslation } from "react-i18next";

interface AddClientDialogProps {
  children: React.ReactNode;
}

const AddClientDialog = ({ children }: AddClientDialogProps) => {
  const [open, setOpen] = useOptimizedState(false);
  const queryClient = useQueryClient();
  const { user, session } = useAuthManager();
  const { t } = useTranslation();

  const [formData, setFormData] = useOptimizedState({
    first_name: "",
    last_name: "",
    email: "",
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      // Create the client first
      const newClient = await clientService.createClient(clientData);

      // Get therapist profile for the invitation
      const { data: therapistProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user?.id)
        .single();

      const therapistName = therapistProfile ? `${therapistProfile.first_name || ''} ${therapistProfile.last_name || ''}`.trim() || "Your Therapist" : "Your Therapist";

      // Send invitation email
      await clientInvitationService.sendInvitation({
        clientId: newClient.id,
        clientEmail: newClient.email,
        clientName: `${newClient.firstName} ${newClient.lastName}`,
        therapistName: therapistName,
      });

      return newClient;
    },
    onSuccess: (newClient) => {
      // Force immediate query invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ["therapist-clients"] });
      queryClient.invalidateQueries({ queryKey: ["therapist-clients", user?.id] });
      
      // Force an immediate refetch to update the UI
      queryClient.refetchQueries({ queryKey: ["therapist-clients", user?.id] });
      
      toast.success(
        `Invitation sent to ${newClient.firstName} ${newClient.lastName}!`
      );
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error creating client and sending invitation:", error);
      
      // Check if it's an email sending error
      if (error.message?.includes("email") || error.message?.includes("invitation")) {
        toast.error("Client added but failed to send invitation email. Please try resending the invitation.");
      } else {
        toast.error("Failed to add client and send invitation. Please try again.");
      }
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to add a client");
      return;
    }

    if (!session?.access_token) {
      toast.error("Authentication session is invalid. Please sign in again.");
      return;  
    }

    // Create the client data object with therapist_id - status will be Pending by default
    const clientData = {
      therapist_id: user.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      status: "Pending" as const, // Explicitly set to Pending for potential clients
    };

    console.log("Creating potential client with data:", clientData);
    createClientMutation.mutate(clientData);
  };

  return (
    <BaseDialog
      trigger={children}
      open={open}
      onOpenChange={setOpen}
      title={t("invite_new_client")}
      description={t("add_potential_client_send_invitation")}
      className="bg-card border-border text-foreground sm:max-w-[500px]"
    >

        <form onSubmit={handleSubmit} className="space-y-4 pt-0">
          <div className="bg-blue-50 dark:bg-neutral-400/20 border border-neutral-200 dark:border-neutral-600 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex gap-2 items-center">
                  {t("how_it_works")}<CornerRightDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400 mt-0.5 flex-shrink-0" />
                </p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">
                  {t("email_invitation_instructions")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <RequiredInput
              label={t("first_name")}
              placeholder={t("enter_first_name")}
              value={formData.first_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, first_name: e.target.value }))
              }
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
            />
            <RequiredInput
              label={t("last_name")}
              placeholder={t("enter_last_name")}
              value={formData.last_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, last_name: e.target.value }))
              }
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
            />
          </div>

          <EmailInput
            label={t("email_address")}
            placeholder={t("enter_email_address")}
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            required
            className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-ring"
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createClientMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {createClientMutation.isPending
                ? t("sending")
                : t("send")}
            </Button>
          </div>
      </form>
    </BaseDialog>
  );
};

export default AddClientDialog;
