import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  UserPlus,
  CalendarDays,
  NotebookPen,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickAction {
  id: string;
  /** i18n key + Dutch default. The label must describe the destination exactly. */
  labelKey: string;
  labelDefault: string;
  /** One line of what actually happens on click — no promises the route can't keep. */
  hintKey: string;
  hintDefault: string;
  icon: LucideIcon;
  to: string;
}

/**
 * Every tile is named after the surface it opens. A tile never claims to create
 * something the destination cannot create: "Sessies & notities" opens the
 * session list (a clinical note is written on a session), and "Agenda" opens the
 * calendar where an appointment is planned.
 */
const ACTIONS: QuickAction[] = [
  {
    id: "new-client",
    labelKey: "qa_new_client",
    labelDefault: "Cliënt toevoegen",
    hintKey: "qa_new_client_hint",
    hintDefault: "Uitnodigen of handmatig",
    icon: UserPlus,
    to: "/dashboard/therapist/add-client",
  },
  {
    id: "calendar",
    labelKey: "qa_open_calendar",
    labelDefault: "Agenda",
    hintKey: "qa_open_calendar_hint",
    hintDefault: "Afspraak inplannen",
    icon: CalendarDays,
    to: "/dashboard/therapist/calendar",
  },
  {
    id: "sessions-notes",
    labelKey: "qa_sessions_notes",
    labelDefault: "Sessies & notities",
    hintKey: "qa_sessions_notes_hint",
    hintDefault: "Kies een sessie om te noteren",
    icon: NotebookPen,
    to: "/dashboard/therapist/sessions",
  },
  {
    id: "invoicing",
    labelKey: "qa_invoicing",
    labelDefault: "Facturatie",
    hintKey: "qa_invoicing_hint",
    hintDefault: "Facturen en btw",
    icon: Receipt,
    to: "/dashboard/therapist/invoicing",
  },
];

/**
 * Action-first Quick Actions row. Each tile links to a real app route and is
 * labelled after what that route actually does.
 */
const QuickActions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-label uppercase tracking-wide text-muted-foreground">
        {t("quick_actions", "Snelle acties")}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = t(action.labelKey, action.labelDefault);
          const hint = t(action.hintKey, action.hintDefault);
          return (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              onClick={() => navigate(action.to)}
              className="flex h-auto flex-col items-start justify-start gap-1 rounded-card border border-border bg-card p-4 text-left text-foreground transition-shadow hover:bg-card hover:shadow-raise"
            >
              <Icon className="mb-1 h-5 w-5 text-primary" aria-hidden="true" />
              <span className="w-full truncate text-sm font-semibold">{label}</span>
              <span className="w-full whitespace-normal text-xs font-normal text-muted-foreground">
                {hint}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
