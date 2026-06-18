import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface ConfirmationDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

const ConfirmationDialog = ({
  trigger,
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmationDialogProps) => {
  const { t } = useTranslation();
  
  const defaultConfirmText = confirmText || t("confirm");
  const defaultCancelText = cancelText || t("cancel");
  const handleConfirm = async () => {
    await onConfirm();
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  // If open and onOpenChange are provided, use controlled mode
  if (open !== undefined && onOpenChange) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-[#111111] border-[#1f1f23] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              {defaultCancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading}
              className={
                variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
              }
            >
              {isLoading ? t("loading") : defaultConfirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Uncontrolled mode with trigger
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-[#111111] border-[#1f1f23] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
          >
            {defaultCancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
            }
          >
            {isLoading ? t("loading") : defaultConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationDialog;