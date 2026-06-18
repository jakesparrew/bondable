import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  CalendarPlus,
  FileEdit,
  CreditCard,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/ui/use-toast";

interface QuickAction {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** When set, navigate to this route on click. */
  to?: string;
  /** Solid teal "primary" treatment (used for Join Room). */
  primary?: boolean;
}

const ACTIONS: QuickAction[] = [
  { id: "new-client", labelKey: "qa_new_client", icon: UserPlus, to: "/dashboard/therapist/add-client" },
  { id: "schedule", labelKey: "qa_schedule", icon: CalendarPlus, to: "/dashboard/therapist/sessions" },
  { id: "clinical-note", labelKey: "qa_clinical_note", icon: FileEdit, to: "/dashboard/therapist/sessions" },
  { id: "invoice", labelKey: "qa_invoice", icon: CreditCard, to: "/dashboard/therapist/payments" },
  { id: "join-room", labelKey: "qa_join_room", icon: Video, primary: true },
];

/**
 * Action-first Quick Actions row. Each tile links to a real app route; the
 * solid-teal "Join Room" tile is a placeholder telehealth entry point.
 */
const QuickActions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleClick = (action: QuickAction) => {
    if (action.to) {
      navigate(action.to);
      return;
    }
    // Join Room placeholder — telehealth room not yet wired.
    toast({
      title: t("qa_join_room"),
      description: t("qa_join_room_placeholder"),
    });
  };

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("quick_actions")}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = t(action.labelKey);
          return (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              onClick={() => handleClick(action)}
              aria-label={label}
              className={
                action.primary
                  ? "flex h-auto flex-col items-center justify-center gap-2 rounded-2xl border border-primary bg-primary p-4 text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                  : "flex h-auto flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-card"
              }
            >
              <span
                className={
                  action.primary
                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                    : "flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary"
                }
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold">{label}</span>
            </Button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
