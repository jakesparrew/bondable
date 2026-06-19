import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  MessageSquare,
  CalendarPlus,
  FileEdit,
  CheckSquare,
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
  /** Mint "AI" treatment — reserved for Bond, the standout tile. */
  ai?: boolean;
}

const ACTIONS: QuickAction[] = [
  { id: "bond", labelKey: "cqa_talk_to_bond", icon: Sparkles, ai: true },
  { id: "message", labelKey: "cqa_message_therapist", icon: MessageSquare, to: "/dashboard/client/messages" },
  { id: "book", labelKey: "cqa_book_session", icon: CalendarPlus, to: "/dashboard/client/sessions" },
  { id: "journal", labelKey: "cqa_new_journal", icon: FileEdit, to: "/dashboard/client/journal" },
  { id: "tasks", labelKey: "cqa_my_tasks", icon: CheckSquare, to: "/dashboard/client/tasks" },
];

/**
 * Action-first Quick Actions row for the client. Each tile links to a real app
 * route; the mint-accented "Talk to Bond" tile is the standout AI entry point
 * (placeholder until the Bond companion is wired).
 */
const ClientQuickActions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleClick = (action: QuickAction) => {
    if (action.to) {
      navigate(action.to);
      return;
    }
    // Bond placeholder — AI companion not yet wired.
    toast({
      title: t("bond_coming_soon_title", "Bond is coming soon"),
      description: t(
        "bond_coming_soon_body",
        "Your supervised AI companion is on the way. You'll be able to chat with Bond here soon.",
      ),
    });
  };

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("quick_actions")}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
                action.ai
                  ? "flex h-auto flex-col items-center justify-center gap-2 rounded-2xl border border-mint/40 bg-mint/10 p-4 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-mint/15"
                  : "flex h-auto flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-card"
              }
            >
              <span
                className={
                  action.ai
                    ? "flex h-10 w-10 items-center justify-center rounded-full bg-mint text-mint-foreground"
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

export default ClientQuickActions;
