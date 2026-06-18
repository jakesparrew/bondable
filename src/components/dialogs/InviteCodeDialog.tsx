import { useOptimizedState, useOptimizedEffect } from "@/hooks/performance/useOptimizedComponents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CopyButton from "@/components/CopyButton";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { inviteCodeService } from "@/services/api";
import { useTranslation } from "react-i18next";

interface InviteCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteCodeDialog = ({ open, onOpenChange }: InviteCodeDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const [inviteCode, setInviteCode] = useOptimizedState<string>("");
  const [isLoading, setIsLoading] = useOptimizedState(true);

  useOptimizedEffect(() => {
    const fetchInviteCode = async () => {
      if (!user?.id || !open) return;

      setIsLoading(true);
      try {
        const code = await inviteCodeService.getTherapistInviteCode(user.id);
        if (code) {
          setInviteCode(code);
        }
      } catch (error) {
        console.error("Error fetching invite code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInviteCode();
  }, [user?.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[#1f1f23] text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white mb-4">
            {t("client_invite_code")}
          </DialogTitle>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#3f3f3f] to-transparent" />
        </DialogHeader>
        <div className="space-y-4 ">
          <div className="text-gray-400 text-sm">
            {t("share_code_with_clients")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteCode" className="text-gray-300">
              {t("your_invite_code")}
            </Label>
            <div className="flex gap-2">
              <Input
                id="inviteCode"
                value={isLoading ? t("loading_ellipsis") : inviteCode}
                readOnly
                className="bg-[#0a0a0a] border-[#1f1f23] text-white font-mono text-lg tracking-wider"
              />
              <CopyButton
                textToCopy={inviteCode}
                className="bg-[#0a0a0a] border-[#1f1f23] text-white hover:bg-[#1a1a1a]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              {t("close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCodeDialog;
