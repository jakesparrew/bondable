import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import LineBranch from "@/components/illustration/LineBranch";
import { CrisisHelpButton } from "@/components/safety/CrisisResources";
import { useToast } from "@/hooks/ui/use-toast";
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
import {
  consentService,
  type AccessLogEntry,
  type ConsentGrant,
} from "@/services/api/consentService";

/**
 * ClientData — the Consent & Data Center (ticket T-CX-4), the seed of the
 * client-owned portable-profile layer. Three deliberately boring-clear tabs, a
 * typographic ledger rather than a wall of icon cards:
 *
 *   1. Toestemmingen — every provider-visible artifact as a revocable grant.
 *   2. Inzage       — the R17 access log: who viewed what, when.
 *   3. Jouw gegevens — plain-language inventory, JSON export, calm erasure ask.
 *
 * No dark patterns: revoke is one honest tap, erasure explains the process, and
 * the persistent "Hulp nodig?" safety affordance sits in the footer on every
 * tab. These are client-care surfaces — no mint here (Bond is not embedded).
 */
export default function ClientData() {
  const { t } = useTranslation();

  return (
    <DashboardLayout userType="client">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 animate-enter">
        <header className="mb-8">
          <h1 className="font-display text-display-lg text-foreground">
            {t("clientData:title", "Jouw gegevens en toestemmingen")}
          </h1>
          <p className="mt-2 max-w-xl text-body-sm text-muted-foreground">
            {t(
              "clientData:subtitle",
              "Jouw gegevens blijven van jou. Hier zie je wat je deelt, wie het bekeek, en hoe je alles meeneemt of laat verwijderen.",
            )}
          </p>
        </header>

        <Tabs defaultValue="consents">
          <TabsList className="mb-6 grid w-full grid-cols-3 rounded-ctl">
            <TabsTrigger value="consents">
              {t("clientData:tab_consents", "Toestemmingen")}
            </TabsTrigger>
            <TabsTrigger value="access">
              {t("clientData:tab_access", "Inzage")}
            </TabsTrigger>
            <TabsTrigger value="data">
              {t("clientData:tab_data", "Jouw gegevens")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consents">
            <ConsentsTab />
          </TabsContent>
          <TabsContent value="access">
            <AccessTab />
          </TabsContent>
          <TabsContent value="data">
            <DataTab />
          </TabsContent>
        </Tabs>

        <ClientDataFooter />
      </div>
    </DashboardLayout>
  );
}

// ── Tab 1: Toestemmingen ──────────────────────────────────────────────────────

function ConsentsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [grants, setGrants] = useState<ConsentGrant[]>(() =>
    consentService.listGrants(),
  );

  const handleToggle = (grant: ConsentGrant) => {
    const next = consentService.toggleGrant(grant.id);
    setGrants(next);
    const updated = next.find((g) => g.id === grant.id);
    const nowGranted = updated?.status === "granted";
    toast({
      title: nowGranted
        ? t("clientData:toast_granted_title", "Toestemming aangezet")
        : t("clientData:toast_revoked_title", "Toestemming ingetrokken"),
      description: nowGranted
        ? t("clientData:toast_granted_body", "{{label}} is nu weer gedeeld.", {
            label: grant.label,
          })
        : t(
            "clientData:toast_revoked_body",
            "{{label}} is nu privé. Je begeleider ziet dit niet meer, ook niet van vroeger.",
            { label: grant.label },
          ),
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-body-sm text-muted-foreground">
        {t(
          "clientData:consents_intro",
          "Elke schakelaar bepaalt wat je begeleider kan zien. Zet je iets uit, dan verdwijnt het meteen, ook wat je eerder deelde.",
        )}
      </p>

      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
        {grants.map((grant) => (
          <li
            key={grant.id}
            className="flex items-start justify-between gap-4 p-4 sm:p-5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body font-medium text-foreground">
                  {grant.label}
                </span>
                {grant.status === "granted" ? (
                  <Badge variant="success">
                    {t("clientData:status_on", "Aan")}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {t("clientData:status_off", "Uit")}
                  </Badge>
                )}
                {grant.foundational ? (
                  <Badge variant="info">
                    {t("clientData:foundational", "Nodig voor begeleiding")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1.5 text-body-sm text-muted-foreground">
                {grant.description}
              </p>
              <p className="mt-2 text-label text-muted-foreground">
                {t("clientData:audience", "Wie dit kan zien: {{audience}}", {
                  audience: grant.audience,
                })}
                <span className="mx-1.5 text-border">·</span>
                {t("clientData:last_changed", "Laatst gewijzigd {{date}}", {
                  date: format(new Date(grant.lastChangedAt), "d MMM yyyy", {
                    locale: nl,
                  }),
                })}
              </p>
            </div>
            <div className="shrink-0 pt-1">
              <Switch
                checked={grant.status === "granted"}
                onCheckedChange={() => handleToggle(grant)}
                aria-label={t(
                  "clientData:toggle_aria",
                  "Toestemming voor {{label}}",
                  { label: grant.label },
                )}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Tab 2: Inzage (R17 access log) ────────────────────────────────────────────

function AccessTab() {
  const { t } = useTranslation();
  const entries: AccessLogEntry[] = useMemo(
    () => consentService.listAccessLog(),
    [],
  );

  return (
    <div className="space-y-6">
      <p className="text-body-sm text-muted-foreground">
        {t(
          "clientData:access_intro",
          "Voor de openheid houden we bij wanneer je begeleider iets van jou bekeek. Wat je niet deelt, staat hier niet.",
        )}
      </p>

      {entries.length === 0 ? (
        <EmptyState
          motif={<LineBranch />}
          title={t("clientData:access_empty_title", "Nog niets ingekeken")}
          description={t(
            "clientData:access_empty_body",
            "Zodra je begeleider iets bekijkt dat je deelde, verschijnt het hier.",
          )}
          bordered
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 p-4 sm:p-5">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50"
              />
              <div className="min-w-0">
                <p className="text-body text-foreground">
                  {t(
                    "clientData:access_line",
                    "Bekeken door {{viewer}} op {{date}}",
                    {
                      viewer: entry.viewer,
                      date: format(new Date(entry.viewedAt), "d MMMM yyyy", {
                        locale: nl,
                      }),
                    },
                  )}
                </p>
                <p className="mt-0.5 text-body-sm text-muted-foreground">
                  {entry.artifactLabel}
                  <span className="mx-1.5 text-border">·</span>
                  {format(new Date(entry.viewedAt), "HH:mm", { locale: nl })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Tab 3: Jouw gegevens ──────────────────────────────────────────────────────

function DataTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [eraseOpen, setEraseOpen] = useState(false);
  const [erasureAsked, setErasureAsked] = useState(false);
  const inventory = useMemo(() => consentService.getDataInventory(), []);

  const inventoryLines: { key: string; label: string; count: number }[] = [
    {
      key: "journal",
      label: t("clientData:inv_journal", "dagboekfragmenten"),
      count: inventory.journalEntries,
    },
    {
      key: "checkins",
      label: t("clientData:inv_checkins", "check-ins"),
      count: inventory.checkins,
    },
    {
      key: "questionnaires",
      label: t("clientData:inv_questionnaires", "vragenlijsten"),
      count: inventory.questionnaires,
    },
    {
      key: "bond",
      label: t("clientData:inv_bond", "berichten met Bond"),
      count: inventory.bondMessages,
    },
    {
      key: "sessions",
      label: t("clientData:inv_sessions", "gesprekken"),
      count: inventory.sessions,
    },
  ];

  const handleExport = () => {
    const payload = consentService.buildExportPayload();
    consentService.recordExportRequest("json");
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bondable-gegevens-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* download can fail in restricted environments — the toast still confirms intent */
    }
    toast({
      title: t("clientData:toast_export_title", "Export klaar"),
      description: t(
        "clientData:toast_export_body",
        "Je gegevens zijn gedownload als bestand. In de demo is dit een voorbeeld.",
      ),
    });
  };

  const confirmErasure = () => {
    consentService.recordErasureRequest();
    setEraseOpen(false);
    setErasureAsked(true);
    toast({
      title: t("clientData:toast_erase_title", "Aanvraag ontvangen"),
      description: t(
        "clientData:toast_erase_body",
        "We nemen contact met je op om je aanvraag te bevestigen. Er verdwijnt nu nog niets.",
      ),
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-display-md text-foreground">
          {t("clientData:inventory_heading", "Wat er van jou is")}
        </h2>
        <p className="mt-2 text-body-sm text-muted-foreground">
          {t(
            "clientData:inventory_intro",
            "Dit staat er in je profiel. Alles hiervan is en blijft van jou.",
          )}
        </p>
        <ul className="mt-4 overflow-hidden rounded-card border border-border bg-card">
          {inventoryLines.map((line) => (
            <li
              key={line.key}
              className="flex items-baseline justify-between border-b border-border px-4 py-3 last:border-b-0 sm:px-5"
            >
              <span className="text-body text-foreground">{line.label}</span>
              <span className="font-display text-display-md tabular-nums text-foreground">
                {line.count}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-body font-medium text-foreground">
          {t("clientData:export_heading", "Neem je gegevens mee")}
        </h3>
        <p className="mt-1.5 text-body-sm text-muted-foreground">
          {t(
            "clientData:export_body",
            "Download een kopie van je gegevens. Handig als je overstapt of gewoon alles zelf wilt bewaren.",
          )}
        </p>
        <Button className="mt-4" onClick={handleExport}>
          {t("clientData:export_button", "Exporteer mijn gegevens")}
        </Button>
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <h3 className="text-body font-medium text-foreground">
          {t("clientData:erase_heading", "Gegevens laten verwijderen")}
        </h3>
        <p className="mt-1.5 text-body-sm text-muted-foreground">
          {t(
            "clientData:erase_body",
            "Je kunt vragen om je gegevens te laten verwijderen. We leggen je rustig uit wat er dan gebeurt, voordat er iets verandert.",
          )}
        </p>
        {erasureAsked ? (
          <p className="mt-4 text-body-sm text-success">
            {t(
              "clientData:erase_pending",
              "Je aanvraag staat genoteerd. We nemen contact met je op.",
            )}
          </p>
        ) : (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setEraseOpen(true)}
          >
            {t("clientData:erase_button", "Gegevens laten verwijderen")}
          </Button>
        )}
      </section>

      <p className="text-body-sm text-muted-foreground">
        {t(
          "clientData:ownership_line",
          "Jouw gegevens zijn van jou. Als je stopt bij een begeleider, neem je alles gewoon mee.",
        )}
      </p>

      <AlertDialog open={eraseOpen} onOpenChange={setEraseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("clientData:erase_confirm_title", "Weet je het zeker?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "clientData:erase_confirm_body",
                "We beginnen niets automatisch. Je vraagt aan om je gegevens te verwijderen; wij bevestigen eerst met jou wat wél en niet mag verdwijnen. Sommige notities van een erkende begeleider moeten wettelijk bewaard blijven; dat leggen we je dan uit. Je zelf geschreven dagboek, check-ins en Bond-berichten kun je altijd laten wissen.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("clientData:erase_cancel", "Toch niet")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmErasure}>
              {t("clientData:erase_confirm_action", "Aanvraag versturen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Persistent safety affordance ──────────────────────────────────────────────

function ClientDataFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-6">
      <p className="text-body-sm text-muted-foreground">
        {t(
          "clientData:footer_note",
          "Vragen over je gegevens? Je begeleider helpt je graag verder.",
        )}
      </p>
      <CrisisHelpButton />
    </footer>
  );
}
