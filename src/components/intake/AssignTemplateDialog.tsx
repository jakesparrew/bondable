import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplates } from "@/hooks/api/useIntakeTemplates";
import { useAssignTemplate } from "@/hooks/api/useIntakeAssignments";

export function AssignTemplateDialog({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const { data: templates = [] } = useIntakeTemplates(therapistId);
  const published = templates.filter((tpl) => tpl.is_published);
  const assignMut = useAssignTemplate(clientId);
  const [selected, setSelected] = useState<string | null>(null);

  const onAssign = async () => {
    if (!selected) return;
    await assignMut.mutateAsync(selected);
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("intake:assign_to_client")}</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {published.length === 0 ? (
            <p className="text-sm text-gray-400">{t("intake:no_templates")}</p>
          ) : published.map((tpl) => (
            <button key={tpl.id}
              className={`w-full text-left p-3 rounded border ${selected === tpl.id ? "border-white" : "border-[#1f1f23]"} hover:border-[#2a2a2a]`}
              onClick={() => setSelected(tpl.id)}>
              <div className="text-sm text-white">{tpl.title}</div>
              {tpl.category && <div className="text-xs text-gray-400">{tpl.category}</div>}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!selected || assignMut.isPending} onClick={onAssign}>
            {assignMut.isPending ? t("intake:saving") : t("intake:assign_form")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
