import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * AdminAISettings — replaced.
 *
 * This screen used to present a hardcoded list of OpenAI models with invented
 * prices, and announced "Current Status: Active — Using GPT-4.1". None of that
 * was true. It wrote `ai_api_enabled` / `ai_model_config` rows that NOTHING
 * read, its price table was wrong (o3 at $60/$240, GPT-4.1 at $0.50/$2.00), and
 * the model it named was never the model Bond ran.
 *
 * It was removed rather than repaired because a settings screen that reports a
 * configuration the system does not have is worse than no screen: it is
 * confidently wrong, and someone will make a budget or a privacy decision on
 * it. The real control room is /dashboard/admin/bond, which reads the live
 * model, live gateway pricing, and actual recorded spend.
 *
 * This component now states what is really running, fetched from the same
 * endpoint that serves the real console — so it cannot drift back into fiction.
 */

interface LiveState {
  model: string;
  enabled: boolean;
}

const AdminAISettings = () => {
  const [live, setLive] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach-admin")
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled || !payload) return;
        setLive({
          model: payload.settings.model,
          enabled: payload.settings.modelEnabled,
        });
      })
      .catch(() => {
        /* leave `live` null — the notice below still stands without it */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="space-y-2">
          <h2 className="font-semibold">Deze pagina klopte niet</h2>
          <p className="text-sm text-muted-foreground">
            Hier stond dat Bondable op GPT-4.1 draaide. Dat was nooit zo. De
            modellenlijst en prijzen op deze pagina waren vast ingetypt en
            werden door niets gelezen — de instelling ging nergens heen.
          </p>
          <p className="text-sm text-muted-foreground">
            De echte instellingen staan nu op één plek, met het model dat
            werkelijk draait, live prijzen van de gateway en de kosten die
            daadwerkelijk gemaakt zijn.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground">Wat er nu écht draait</div>
        {loading ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ophalen…
          </div>
        ) : live ? (
          <div className="mt-1">
            <div className="font-mono text-lg">{live.model}</div>
            <div className="text-sm text-muted-foreground">
              AI-model {live.enabled ? "actief" : "uitgeschakeld (scripted)"}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted-foreground">
            Kon de live configuratie niet ophalen.
          </div>
        )}
      </div>

      <Button asChild>
        <Link to="/dashboard/admin/bond">
          Naar Bond — instellingen en kosten
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

export default AdminAISettings;
