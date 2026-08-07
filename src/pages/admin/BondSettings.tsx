import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  Save,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/**
 * BondSettings — /dashboard/admin/bond
 *
 * The control room for The Coach. Everything on this page is REAL: the model
 * list and its prices come live from the gateway, the usage figures come from
 * what was actually billed, and the settings are enforced server-side on the
 * next message rather than being a browser preference.
 *
 * The admin token lives in sessionStorage, not localStorage: it is a shared
 * secret and should not outlive the tab. It is a stopgap until the superadmin
 * role is a real signed-in identity (backlog B8) — the page says so out loud
 * rather than implying this is proper access control.
 */

interface ModelInfo {
  id: string;
  name: string;
  owner: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputPerToken: number | null;
  outputPerToken: number | null;
}

interface Settings {
  model: string;
  maxOutputTokens: number;
  dailyMessageCap: number;
  toneInstructions: string;
  modelEnabled: boolean;
  dailySpendCapUsd: number;
  anonymousTurnCap: number;
  ipRequestsPerMinute: number;
  requireBotCheck: boolean;
}

interface UsageWindow {
  messages: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface AdminPayload {
  settings: Settings;
  models: ModelInfo[];
  usage: {
    last24h: UsageWindow;
    last30d: UsageWindow;
    activeUsers24h: number;
    topUsers24h: Array<{ userKey: string; messages: number; costUsd: number }>;
    byDay: Array<{ day: string; messages: number; costUsd: number }>;
  };
  status: {
    hasApiKey: boolean;
    hasDatabase: boolean;
    writable: boolean;
    gatewayUrl: string;
    botCheckConfigured: boolean;
    deviceBudgetSecure: boolean;
    spentTodayUsd: number;
  };
}

const TOKEN_KEY = "bondable_admin_token";

/** USD per million tokens — the unit everyone actually compares models in. */
const perMillion = (perToken: number | null): string =>
  perToken == null ? "—" : `$${(perToken * 1_000_000).toFixed(2)}`;

const usd = (value: number): string =>
  value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;

const int = (value: number): string => value.toLocaleString("nl-BE");

const BondSettings = () => {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) ?? "",
  );
  const [modelFilter, setModelFilter] = useState("anthropic");

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coach-admin");
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as AdminPayload;
      setData(payload);
      setDraft(payload.settings);
    } catch {
      toast.error("Kon de Bond-configuratie niet laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch("/api/coach-admin", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": token },
        body: JSON.stringify(draft),
      });
      const body = await response.json();
      if (!response.ok) {
        toast.error(body?.message ?? "Bewaren mislukt.");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
      setDraft(body.settings);
      setData((prev) => (prev ? { ...prev, settings: body.settings } : prev));
      toast.success("Opgeslagen. Geldt vanaf het volgende bericht.");
    } catch {
      toast.error("Bewaren mislukt.");
    } finally {
      setSaving(false);
    }
  };

  const selected = useMemo(
    () => data?.models.find((m) => m.id === draft?.model) ?? null,
    [data, draft],
  );

  /**
   * Cost of one Bond message, from MEASURED averages where we have them.
   * Falls back to a modelled estimate only when nothing has been sent yet —
   * and says which one it is, because a made-up number presented as measured
   * is how budgets get set wrong.
   */
  const perMessage = useMemo(() => {
    if (!selected?.inputPerToken || !selected?.outputPerToken) return null;
    const measured = data?.usage.last30d;
    const hasHistory = (measured?.messages ?? 0) > 0;
    const inTok = hasHistory ? measured!.inputTokens / measured!.messages : 1100;
    const outTok = hasHistory ? measured!.outputTokens / measured!.messages : 140;
    return {
      measured: hasHistory,
      cost: inTok * selected.inputPerToken + outTok * selected.outputPerToken,
      inTok: Math.round(inTok),
      outTok: Math.round(outTok),
    };
  }, [selected, data]);

  const filteredModels = useMemo(() => {
    if (!data) return [];
    const q = modelFilter.trim().toLowerCase();
    const list = q
      ? data.models.filter(
          (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
        )
      : data.models;
    return list.slice(0, 60);
  }, [data, modelFilter]);

  const dirty =
    !!draft && !!data && JSON.stringify(draft) !== JSON.stringify(data.settings);

  if (loading || !data || !draft) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Bond-configuratie laden…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Bond — instellingen en kosten
          </h1>
          <p className="text-sm text-muted-foreground">
            Welk model draait, wat het kost, en hoeveel iemand mag gebruiken.
            Wijzigingen gelden vanaf het volgende bericht — geen deploy nodig.
          </p>
        </header>

        {/* Status: say plainly what is and isn't wired, so a blank number is
            never mistaken for a zero. */}
        <section className="grid gap-3 sm:grid-cols-3">
          <StatusCard
            icon={<KeyRound className="h-4 w-4" />}
            label="AI-sleutel"
            ok={data.status.hasApiKey}
            okText="ingesteld"
            badText="ontbreekt"
          />
          <StatusCard
            icon={<Database className="h-4 w-4" />}
            label="Database"
            ok={data.status.hasDatabase}
            okText="verbonden"
            badText="niet verbonden"
          />
          <StatusCard
            icon={<Bot className="h-4 w-4" />}
            label="Wijzigen"
            ok={data.status.writable}
            okText="mogelijk"
            badText="uitgeschakeld"
          />
        </section>

        {!data.status.hasApiKey && (
          <Notice>
            Er is geen <code>AI_GATEWAY_API_KEY</code> ingesteld. Bond valt terug
            op de scripted metgezel — clients krijgen antwoord, maar geen model.
          </Notice>
        )}

        {/* Usage first: the question "what does this cost" is the one people
            actually open this page with. */}
        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Verbruik</h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Metric label="Berichten (24u)" value={int(data.usage.last24h.messages)} />
            <Metric label="Kosten (24u)" value={usd(data.usage.last24h.costUsd)} />
            <Metric label="Actieve gebruikers (24u)" value={int(data.usage.activeUsers24h)} />
            <Metric label="Kosten (30d)" value={usd(data.usage.last30d.costUsd)} />
          </div>

          {perMessage && (
            <p className="mt-4 text-sm text-muted-foreground">
              Ongeveer <strong>{usd(perMessage.cost)}</strong> per bericht
              {" "}({int(perMessage.inTok)} in / {int(perMessage.outTok)} uit).{" "}
              {perMessage.measured
                ? "Gemeten over de laatste 30 dagen."
                : "Schatting — er zijn nog geen berichten om op te meten."}
              {" "}Duizend berichten ≈ {usd(perMessage.cost * 1000)}.
            </p>
          )}

          {data.usage.topUsers24h.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Gebruiker (gehasht)</th>
                    <th className="py-1 font-medium">Berichten</th>
                    <th className="py-1 font-medium">Kosten</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usage.topUsers24h.map((u) => (
                    <tr key={u.userKey} className="border-t border-border">
                      <td className="py-1 font-mono text-xs">{u.userKey}</td>
                      <td className="py-1">{int(u.messages)}</td>
                      <td className="py-1">{usd(u.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Model */}
        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Model</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            {data.models.length} taalmodellen beschikbaar op de gateway. Prijzen
            komen live van de gateway, niet uit een lijst in de code.
          </p>

          <Input
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            placeholder="Filter op naam of aanbieder…"
            className="mb-3"
          />

          <div className="max-h-72 overflow-y-auto rounded-ctl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="text-left text-muted-foreground">
                  <th className="p-2 font-medium">Model</th>
                  <th className="p-2 font-medium">In /1M</th>
                  <th className="p-2 font-medium">Uit /1M</th>
                  <th className="p-2 font-medium">Context</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setDraft({ ...draft, model: m.id })}
                    className={`cursor-pointer border-t border-border hover:bg-muted ${
                      draft.model === m.id ? "bg-muted" : ""
                    }`}
                  >
                    <td className="p-2">
                      <div className="font-medium">{m.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{m.id}</div>
                    </td>
                    <td className="p-2">{perMillion(m.inputPerToken)}</td>
                    <td className="p-2">{perMillion(m.outputPerToken)}</td>
                    <td className="p-2">
                      {m.contextWindow ? `${Math.round(m.contextWindow / 1000)}k` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-sm">
            Actief: <span className="font-mono">{draft.model}</span>
          </p>
          <Notice tone="muted">
            Niet elk model is beschikbaar op elk gateway-abonnement. Kiest u er
            een die het account niet mag gebruiken, dan valt Bond terug op de
            scripted metgezel en verschijnt dat in de serverlogs.
          </Notice>
        </section>

        {/* Protection — the four layers, with the guarantee first. */}
        <section className="space-y-4 rounded-card border border-border bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold">Bescherming</h2>
            <p className="text-sm text-muted-foreground">
              Vier lagen. De onderste drie maken misbruik moeilijk; het
              dagplafond maakt de schade eindig.
            </p>
          </div>

          {/* Layer 4 — the only guarantee, so it goes first and gets the
              live "spent today" figure next to it. */}
          <div>
            <Label htmlFor="spendcap">Dagplafond totale kosten (USD)</Label>
            <Input
              id="spendcap"
              type="number"
              min={0}
              step="0.5"
              value={draft.dailySpendCapUsd}
              onChange={(e) =>
                setDraft({ ...draft, dailySpendCapUsd: Number(e.target.value) })
              }
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Vandaag verbruikt: <strong>{usd(data.status.spentTodayUsd)}</strong>
              {draft.dailySpendCapUsd > 0
                ? ` van ${usd(draft.dailySpendCapUsd)}.`
                : " — geen plafond ingesteld."}{" "}
              Boven het plafond gaat het model uit en antwoordt Bond scripted;
              bezoekers merken geen storing. 0 = geen plafond.
            </p>
            {draft.dailySpendCapUsd === 0 && (
              <Notice>
                Zonder plafond is er geen bovengrens aan wat één dag kan kosten.
                De andere lagen maken misbruik moeilijker, maar begrenzen de
                schade niet.
              </Notice>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="anoncap">Gratis beurten per apparaat (24u)</Label>
              <Input
                id="anoncap"
                type="number"
                min={0}
                value={draft.anonymousTurnCap}
                onChange={(e) =>
                  setDraft({ ...draft, anonymousTurnCap: Number(e.target.value) })
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Daarna vraagt Bond om een account. Bewaard in een ondertekende
                cookie: niet te vervalsen, wel te wissen. 0 = onbeperkt.
              </p>
            </div>

            <div>
              <Label htmlFor="rpm">Verzoeken per IP per minuut</Label>
              <Input
                id="rpm"
                type="number"
                min={1}
                value={draft.ipRequestsPerMinute}
                onChange={(e) =>
                  setDraft({ ...draft, ipRequestsPerMinute: Number(e.target.value) })
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Gedeeld over alle servers, dus dit vangt ook iemand die telkens
                zijn cookies wist.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Botcontrole verplicht</Label>
              <p className="text-sm text-muted-foreground">
                Onzichtbare Turnstile-check voor anonieme bezoekers.
              </p>
            </div>
            <Switch
              checked={draft.requireBotCheck}
              onCheckedChange={(v) => setDraft({ ...draft, requireBotCheck: v })}
            />
          </div>

          {/* A control that is on but has no secret behind it does nothing.
              Say so, rather than letting the switch imply protection. */}
          {draft.requireBotCheck && !data.status.botCheckConfigured && (
            <Notice>
              Deze schakelaar staat aan, maar er is geen{" "}
              <code>TURNSTILE_SECRET_KEY</code> ingesteld — er wordt dus niets
              gecontroleerd. Zet de sleutel in <code>.env.local</code> om de
              laag echt aan te zetten.
            </Notice>
          )}

          {!data.status.deviceBudgetSecure && (
            <Notice>
              <code>COACH_COOKIE_SECRET</code> ontbreekt; het apparaatbudget
              wordt met een ontwikkelsleutel ondertekend. Zet er een eigen
              geheim voor je live gaat, anders is de handtekening te
              reproduceren.
            </Notice>
          )}
        </section>

        {/* Limits */}
        <section className="space-y-4 rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Grenzen</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>AI-model actief</Label>
              <p className="text-sm text-muted-foreground">
                Uit = Bond antwoordt scripted. Clients merken geen storing, en
                er lopen geen kosten.
              </p>
            </div>
            <Switch
              checked={draft.modelEnabled}
              onCheckedChange={(v) => setDraft({ ...draft, modelEnabled: v })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cap">Berichten per persoon per 24u</Label>
              <Input
                id="cap"
                type="number"
                min={0}
                value={draft.dailyMessageCap}
                onChange={(e) =>
                  setDraft({ ...draft, dailyMessageCap: Number(e.target.value) })
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                0 = onbeperkt.
                {perMessage &&
                  draft.dailyMessageCap > 0 &&
                  ` Max ≈ ${usd(perMessage.cost * draft.dailyMessageCap)} per persoon per dag.`}
              </p>
            </div>

            <div>
              <Label htmlFor="max">Max. lengte antwoord (tokens)</Label>
              <Input
                id="max"
                type="number"
                min={64}
                max={4000}
                value={draft.maxOutputTokens}
                onChange={(e) =>
                  setDraft({ ...draft, maxOutputTokens: Number(e.target.value) })
                }
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Bond antwoordt in enkele zinnen; dit is een plafond, geen doel.
              </p>
            </div>
          </div>
        </section>

        {/* Tone */}
        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Toon bijsturen</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Komt bovenop het vaste systeemprompt. Bedoeld voor toon en nadruk —
            de grenzen van Bond (geen diagnoses, geen medisch advies, crisis
            altijd doorverwijzen) staan vast en kunnen hiermee niet weg.
          </p>
          <Textarea
            rows={5}
            value={draft.toneInstructions}
            onChange={(e) => setDraft({ ...draft, toneInstructions: e.target.value })}
            placeholder="Bijv. Spreek de persoon aan met 'je'. Houd antwoorden onder de drie zinnen."
          />
        </section>

        {/* Save */}
        <section className="space-y-3 rounded-card border border-border bg-card p-4">
          <div>
            <Label htmlFor="token">Admin-token</Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="COACH_ADMIN_TOKEN"
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Gedeeld geheim uit <code>.env.local</code>. Blijft in deze tab
              staan, niet op de schijf. Tijdelijk, tot superadmin een echte
              ingelogde rol is.
            </p>
          </div>
          <Button onClick={save} disabled={!dirty || saving || !data.status.writable}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Opslaan
          </Button>
          {dirty && (
            <span className="ml-3 text-sm text-muted-foreground">
              Niet-opgeslagen wijzigingen.
            </span>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

function StatusCard({
  icon,
  label,
  ok,
  okText,
  badText,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <Badge variant={ok ? "success" : "warning"} className="mt-1 gap-1">
          {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {ok ? okText : badText}
        </Badge>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Notice({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "muted";
}) {
  return (
    <p
      className={`mt-3 rounded-ctl border p-3 text-sm ${
        tone === "warning"
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      {children}
    </p>
  );
}

export default BondSettings;
