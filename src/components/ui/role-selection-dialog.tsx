
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
      <AlertDialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl">Welcome! Please select your role</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            To provide you with the best experience, we need to know if you're a therapist or a client. 
            This will determine which dashboard and features you'll have access to.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={() => onRoleSelect("therapist")}
            className="flex-1 bg-white text-black hover:bg-gray-100"
          >
            I'm a Therapist
          </Button>
          <Button
            onClick={() => onRoleSelect("client")}
            className="flex-1 bg-white text-black hover:bg-gray-100"
          >
            I'm a Client
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
