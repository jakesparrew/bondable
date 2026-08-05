/**
 * BaseDialog Component
 *
 * A reusable dialog wrapper that provides consistent styling and behavior
 * across all dialog components in the application.
 *
 * Features:
 * - Consistent card surface + border-first styling
 * - Optional trigger element
 * - Customizable title and description
 * - Optional divider line
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <BaseDialog
 *   title="Edit Profile"
 *   description="Update your profile information"
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * >
 *   <ProfileForm />
 * </BaseDialog>
 * ```
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DialogProps } from "@/types/components";

/**
 * Props for the BaseDialog component
 */

interface BaseDialogProps extends Omit<DialogProps, 'title'> {
  /** Optional trigger element to open the dialog */
  trigger?: React.ReactNode;
  /** Whether to show the divider line under the title */
  showDivider?: boolean;
  /** Dialog title - can be string or React element */
  title?: string | React.ReactNode;
}

/**
 * Base dialog component with consistent styling and behavior
 *
 * @param props - Component props
 * @returns JSX element representing the dialog
 */

const BaseDialog = ({
  children,
  trigger,
  open,
  onOpenChange,
  title,
  description,
  className = "bg-card border-border text-foreground",
  showDivider = true,
}: BaseDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={className}>
        <DialogHeader>
          {title && (
            <DialogTitle className="text-title text-foreground mb-3">
              {title}
            </DialogTitle>
          )}
          {showDivider && <div className="h-px w-full bg-border" />}
          {description && (
            <p className="text-muted-foreground text-body-sm pt-2">
              {description}
            </p>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

export default BaseDialog;