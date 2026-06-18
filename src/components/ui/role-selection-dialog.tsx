
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface RoleSelectionDialogProps {
  open: boolean;
  onRoleSelect: (role: "therapist" | "client") => void;
}

export const RoleSelectionDialog: React.FC<RoleSelectionDialogProps> = ({
  open,
  onRoleSelect,
}) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground text-xl">Welcome! Please select your role</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            To provide you with the best experience, we need to know if you're a therapist or a client. 
            This will determine which dashboard and features you'll have access to.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={() => onRoleSelect("therapist")}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            I'm a Therapist
          </Button>
          <Button
            onClick={() => onRoleSelect("client")}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            I'm a Client
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
