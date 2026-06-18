import { useId } from "react";
import {
  Bell,
  Calendar,
  CheckCheckIcon,
  CheckIcon,
  MessageSquare,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

export function AutomationSwitches({
  activeTab,
  autoReminders,
  setAutoReminders,
  autoTasks,
  setAutoTasks,
  autoMessages,
  setAutoMessages,
}: {
  activeTab: "sms" | "whatsapp";
  autoReminders: boolean;
  setAutoReminders: (val: boolean) => void;
  autoTasks: boolean;
  setAutoTasks: (val: boolean) => void;
  autoMessages: boolean;
  setAutoMessages: (val: boolean) => void;
}) {
  const { t } = useTranslation();
  const idReminders = useId();
  const idTasks = useId();
  const idMessages = useId();

  return (
    <div className="space-y-4">
      <section className="flex items-stretch gap-2">
        {/* Toggle icon bar */}
        <button
          type="button"
          onClick={() => setAutoReminders(!autoReminders)}
          className={`rounded-md p-1 flex items-center justify-center transition-colors ${
            autoReminders ? "bg-green-600/50" : "bg-red-600/50"
          }`}
        >
          {autoReminders ? (
            <CheckIcon className="text-white h-4 w-4" />
          ) : (
            <X className="text-white h-4 w-4" />
          )}
        </button>

        {/* Main content with conditional opacity */}
        <div
          className={`border-border bg-card relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none transition-opacity ${
            !autoReminders ? "opacity-50" : ""
          }`}
        >
          <div className="grid grow gap-2">
            <Label htmlFor={idReminders} className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {t('auto_reminders')}
            </Label>
            <p
              id={`${idReminders}-description`}
              className="text-muted-foreground text-xs"
            >
              {t('auto_reminders_desc')}
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-stretch gap-2">
        {/* Toggle icon bar */}
        <button
          type="button"
          onClick={() => setAutoTasks(!autoTasks)}
          className={`rounded-md p-1 flex items-center justify-center transition-colors ${
            autoTasks ? "bg-green-600/50" : "bg-red-600/50"
          }`}
        >
          {autoTasks ? (
            <CheckIcon className="text-white h-4 w-4" />
          ) : (
            <X className="text-white h-4 w-4" />
          )}
        </button>

        {/* Main content with conditional opacity */}
        <div
          className={`border-border bg-card relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none transition-opacity ${
            !autoTasks ? "opacity-50" : ""
          }`}
        >
          <div className="grid grow gap-2">
            <Label htmlFor={idTasks} className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {t('task_notifications')}
            </Label>
            <p id={`${idTasks}-description`} className="text-muted-foreground text-xs">
              {t(activeTab === "sms" ? 'task_notifications_sms_desc' : 'task_notifications_whatsapp_desc')}
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-stretch gap-2">
        {/* Toggle icon bar */}
        <button
          type="button"
          onClick={() => setAutoMessages(!autoMessages)}
          className={`rounded-md p-1 flex items-center justify-center transition-colors ${
            autoMessages ? "bg-green-600/50" : "bg-red-600/50"
          }`}
        >
          {autoMessages ? (
            <CheckIcon className="text-white h-4 w-4" />
          ) : (
            <X className="text-white h-4 w-4" />
          )}
        </button>

        {/* Main content with conditional opacity */}
        <div
          className={`border-border bg-card relative flex w-full items-start gap-2 rounded-md border p-4 shadow-xs outline-none transition-opacity ${
            !autoMessages ? "opacity-50" : ""
          }`}
        >
          <div className="grid grow gap-2">
            <Label htmlFor={idMessages} className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              {t('message_notifications')}
            </Label>
            <p
              id={`${idMessages}-description`}
              className="text-muted-foreground text-xs"
            >
              {t(activeTab === "sms" ? 'message_notifications_sms_desc' : 'message_notifications_whatsapp_desc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
