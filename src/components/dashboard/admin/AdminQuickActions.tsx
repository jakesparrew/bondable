import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, KeyRound, ShieldCheck, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminAction {
  id: string;
  labelKey: string;
  label: string;
  icon: LucideIcon;
  to: string;
  /** Solid-teal primary treatment (used for the AI / API settings entry). */
  primary?: boolean;
}

const ACTIONS: AdminAction[] = [
  {
    id: "notifications",
    labelKey: "admin_qa_notification_settings",
    label: "Notification Settings",
    icon: Bell,
    to: "/dashboard/admin/notification-settings",
  },
  {
    id: "api",
    labelKey: "admin_qa_api_settings",
    label: "API Settings",
    icon: KeyRound,
    to: "/dashboard/admin/api-settings",
  },
  {
    id: "admins",
    labelKey: "admin_qa_manage_admins",
    label: "Manage Admins",
    icon: ShieldCheck,
    to: "/dashboard/admin/settings",
  },
  {
    id: "settings",
    labelKey: "admin_qa_platform_settings",
    label: "Platform Settings",
    icon: Settings,
    to: "/dashboard/admin/settings",
  },
  {
    id: "ai",
    labelKey: "admin_qa_ai_settings",
    label: "AI Settings",
    icon: Sparkles,
    to: "/dashboard/admin/api-settings",
    primary: true,
  },
];

/**
 * Action-first quick actions row for admins. Every tile routes to a real,
 * existing admin route. The solid-teal "AI Settings" tile follows the same
 * primary treatment used on the therapist dashboard's "Join Room" tile.
 */
const AdminQuickActions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {t("quick_actions", "Quick Actions")}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = t(action.labelKey, action.label);
          return (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              onClick={() => navigate(action.to)}
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

export default AdminQuickActions;
