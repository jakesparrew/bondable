
import { useOptimizedState } from "@/hooks/performance/useOptimizedComponents";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInviteCode } from "@/hooks/api/useInviteCode";
import { clientTherapistService } from "@/services/api";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useToast } from "@/hooks/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface JoinTherapistDialogProps {
  children: React.ReactNode;
  onTherapistConnected?: () => void;
}

const JoinTherapistDialog = ({ children, onTherapistConnected }: JoinTherapistDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useOptimizedState(false);
  const [inviteCode, setInviteCode] = useOptimizedState("");
  const [isConnecting, setIsConnecting] = useOptimizedState(false);
  const { validateCode, isValidating, validationResult } = useInviteCode();
  const { user } = useAuthManager();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;

    setIsConnecting(true);

    try {
      // First validate the code
      const validationResponse = await validateCode(inviteCode.trim());

      if (!validationResponse.isValid) {
        toast({
          title: "Invalid Invite Code",
          description: validationResponse.error || "Please check the code and try again.",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      // Connect to the therapist
      const result = await clientTherapistService.connectToTherapist(inviteCode.trim(), user.id);

      if (result.success) {
        toast({
          title: "Successfully Connected!",
          description: `You are now connected to ${result.therapistName}`,
        });

        // Close dialog and reset form
        setOpen(false);
        setInviteCode("");

        // Trigger refresh of the therapists list
        if (onTherapistConnected) {
          onTherapistConnected();
        }
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Failed to connect to therapist",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error connecting to therapist:", error);
      toast({
        title: "Connection Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{t("join_therapist")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("enter_invite_code_description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="text-muted-foreground">
              {t("invite_code")}
            </Label>
            <Input
              id="inviteCode"
              placeholder={t("enter_8_character_code")}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground"
              disabled={isValidating || isConnecting}
            />
            {validationResult?.error && (
              <p className="text-sm text-destructive">{validationResult.error}</p>
            )}
            {validationResult?.isValid && !isConnecting && (
              <p className="text-sm text-success">
                {t("ready_to_connect_with", { therapistName: validationResult.therapistName })}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isConnecting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!inviteCode.trim() || isValidating || isConnecting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("connecting")}
                </>
              ) : (
                t("connect")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinTherapistDialog;
