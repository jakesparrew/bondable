import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Power, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { can, currentAdminRole } from "@/lib/adminAbility";
import { opsService, type FeatureFlag } from "@/services/api/opsService";

/**
 * FeatureFlags — /dashboard/admin/flags (plan 07 §5, ticket T-OC-9).
 *
 * Every risky feature ships behind a flag with a kill switch — one click
 * disables it for everyone, bypassing rollout logic, no deploy. Flags that gate
 * a LIVE feature (bond_live_llm, stripe_checkout) require a confirm before you
 * enable them, so a stray click can't put clients on the live LLM or take real
 * card payments. Mutations are gated by adminAbility: a readonly advisor sees the
 * table but the switches are disabled.
 */

function formatDate(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale || undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const FeatureFlags = () => {
  const { t, i18n } = useTranslation();
  const role = currentAdminRole();
  const mayToggle = can(role, "flags.toggle");

  const [flags, setFlags] = useState<FeatureFlag[]>(() => opsService.listFlags());
  // A pending confirm for enabling a live-gating flag.
  const [confirmEnable, setConfirmEnable] = useState<FeatureFlag | null>(null);

  const activeKillSwitches = useMemo(
    () => flags.filter((f) => f.killSwitch).length,
    [flags],
  );

  const applyToggle = (key: string, enabled: boolean) => {
    setFlags(opsService.setFlagEnabled(key, enabled));
  };

  const onSwitch = (flag: FeatureFlag, next: boolean) => {
    // Enabling a live-gating flag → confirm first. Disabling never needs one.
    if (next && flag.gatesLiveFeature) {
      setConfirmEnable(flag);
      return;
    }
    applyToggle(flag.key, next);
  };

  const onKill = (flag: FeatureFlag) => {
    setFlags(opsService.setKillSwitch(flag.key, !flag.killSwitch));
  };

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-display-lg text-foreground">
            {t("ops_flags_title", "Feature flags")}
          </h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {t(
              "ops_flags_subtitle",
              "Zet risicovolle functies aan of uit zonder deploy. De kill-switch schakelt een functie voor iedereen ineens uit.",
            )}
          </p>
        </div>

        {activeKillSwitches > 0 ? (
          <div className="flex items-center gap-2 rounded-card border border-warning/40 bg-warning-soft px-3 py-2 text-body-sm text-warning">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("ops_flags_kill_active", "{{n}} kill-switch actief — die functie ligt stil.", {
              n: activeKillSwitches,
            })}
          </div>
        ) : null}

        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="rounded-card border bg-card p-4 animate-enter hover:shadow-raise"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="text-body-sm font-semibold text-foreground">{flag.key}</code>
                    {flag.gatesLiveFeature ? (
                      <Badge variant="warning" className="text-label">
                        {t("ops_flags_live_gate", "Live-functie")}
                      </Badge>
                    ) : null}
                    {flag.killSwitch ? (
                      <Badge variant="destructive" className="text-label">
                        {t("ops_flags_killed", "Kill-switch aan")}
                      </Badge>
                    ) : flag.enabled ? (
                      <Badge variant="success" className="text-label">
                        {t("ops_flags_on", "Aan")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-label">
                        {t("ops_flags_off", "Uit")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-body-sm text-muted-foreground">{flag.description}</p>
                  <p className="mt-1 text-label text-muted-foreground">
                    {t("ops_flags_audience", "Publiek")}: {flag.audience}
                  </p>
                  <p className="mt-0.5 text-label text-muted-foreground">
                    {t("ops_flags_updated", "Laatst gewijzigd door {{who}} op {{when}}", {
                      who: flag.updatedBy,
                      when: formatDate(flag.updatedAt, i18n.language),
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Switch
                    checked={flag.enabled}
                    disabled={!mayToggle || flag.killSwitch}
                    onCheckedChange={(next) => onSwitch(flag, next)}
                    aria-label={t("ops_flags_toggle_aria", "Zet {{key}} aan of uit", {
                      key: flag.key,
                    })}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={flag.killSwitch ? "outline" : "ghost"}
                    disabled={!mayToggle}
                    className="gap-1.5"
                    onClick={() => onKill(flag)}
                  >
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                    {flag.killSwitch
                      ? t("ops_flags_kill_release", "Kill-switch lossen")
                      : t("ops_flags_kill", "Kill-switch")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!mayToggle ? (
          <p className="text-label text-muted-foreground">
            {t(
              "ops_flags_readonly_note",
              "Je hebt alleen-leestoegang — flags aanpassen kan met de rol eigenaar, financiën of veiligheid.",
            )}
          </p>
        ) : null}
      </div>

      {/* Confirm before enabling a live-gating flag */}
      <AlertDialog
        open={!!confirmEnable}
        onOpenChange={(open) => !open && setConfirmEnable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ops_flags_confirm_title", "Live-functie aanzetten?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmEnable
                ? t(
                    "ops_flags_confirm_body",
                    "Je staat op het punt {{key}} voor het echte publiek aan te zetten. Dit raakt live cliënten of betalingen. Zeker weten?",
                    { key: confirmEnable.key },
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ops_cancel", "Annuleren")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmEnable) applyToggle(confirmEnable.key, true);
                setConfirmEnable(null);
              }}
            >
              {t("ops_flags_confirm_enable", "Ja, aanzetten")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FeatureFlags;
