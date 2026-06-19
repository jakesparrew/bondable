import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Check,
  HeartHandshake,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useTherapistClients } from "@/hooks/api/useOptimizedTherapists";
import { useToast } from "@/hooks/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CrisisResources } from "@/components/safety/CrisisResources";

/**
 * Between-session check-in — a gentle, supportive way for a client to reach out
 * when things get hard *between* appointments, plus the therapist-side alert
 * surface that lists those flags so nobody slips through the cracks.
 *
 * Two exports:
 *   - `BetweenSessionCheckIn` (default): the CLIENT affordance — an "I'm not
 *     okay this week" button. Opens a calm dialog where the client can add an
 *     optional note and (gently) is pointed to CrisisResources for emergencies.
 *     Recording a check-in inserts a `client_checkins` row (kind 'distress').
 *   - `CheckInAlerts`: the THERAPIST surface — lists UNACKNOWLEDGED client
 *     check-ins with "Acknowledge" + "Message"/"View" actions. Acknowledging
 *     stamps `acknowledged_at` so the flag drops off the queue.
 *
 * Design intent: this is supervised, supportive care — NOT an emergency
 * dispatcher. Copy is warm and de-escalating; the strong-red `destructive`
 * token is deliberately avoided here and reserved for true emergencies (those
 * live in CrisisResources, which we link to rather than duplicate).
 *
 * Data: wired to the `client_checkins` table (owned by the Data phase) through
 * the shared `supabase` client, which runs against the in-memory explore-mode
 * mock during dev. Empty/loading/error states are all handled gracefully.
 *
 * i18n: every user-facing string uses t('key', 'English default') so the shared
 * locale JSON files stay untouched while remaining translatable later.
 */

/* -------------------------------------------------------------------------- */
/* Shared types + helpers                                                     */
/* -------------------------------------------------------------------------- */

interface ClientCheckinRow {
  id: string;
  client_id: string;
  therapist_id: string;
  kind: string;
  note: string | null;
  acknowledged_at: string | null;
  created_at: string | null;
}

const CHECKINS_QUERY_KEY = ["client_checkins"] as const;

/** Format an ISO timestamp into a short, locale-aware "when" label. */
function formatWhen(iso: string | null, locale?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale || undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ========================================================================== */
/* CLIENT: "I'm not okay this week"                                            */
/* ========================================================================== */

export interface BetweenSessionCheckInProps {
  /** Override the trigger label. */
  label?: string;
  className?: string;
  /** Passed to the trigger Button. */
  size?: React.ComponentProps<typeof Button>["size"];
  /** Passed to the trigger Button. Defaults to a calm outline. */
  variant?: React.ComponentProps<typeof Button>["variant"];
}

/**
 * Client-facing affordance. A soft, reassuring button that opens a dialog where
 * the client can flag a hard week and optionally leave a note for their
 * therapist. Calm by design — points to CrisisResources for emergencies.
 */
export const BetweenSessionCheckIn = ({
  label,
  className,
  size = "default",
  variant = "outline",
}: BetweenSessionCheckInProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthManager();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Resolve the client's connected therapist so the flag is addressed to
      // the right person. We don't block on it: a check-in should never fail
      // to send just because the relationship lookup is slow/empty.
      let therapistId: string | null = null;
      try {
        const { data: rel } = await supabase
          .from("client_therapist_relationships")
          .select("therapist_id")
          .eq("client_id", user?.id ?? "")
          .limit(1)
          .maybeSingle();
        therapistId = (rel as { therapist_id?: string } | null)?.therapist_id ?? null;
      } catch {
        therapistId = null;
      }

      const payload = {
        client_id: user?.id ?? "",
        therapist_id: therapistId ?? user?.id ?? "",
        kind: "distress",
        note: note.trim() ? note.trim() : null,
        acknowledged_at: null,
      };

      const { error } = await supabase.from("client_checkins").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: CHECKINS_QUERY_KEY });
    },
    onError: () => {
      toast({
        title: t("checkin_distress_error_title", "We couldn't send that just now"),
        description: t(
          "checkin_distress_error_body",
          "Please try again in a moment. If this is an emergency, use the crisis lines below.",
        ),
      });
    },
  });

  // Reset the dialog's internal state whenever it closes so a re-open is fresh.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setNote("");
      setSubmitted(false);
      submitMutation.reset();
    }
  };

  const triggerLabel = label ?? t("checkin_distress_button", "I'm not okay this week");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-label={t(
            "checkin_distress_button_aria",
            "Tell your therapist you're having a hard week",
          )}
          className={cn(
            "gap-2 rounded-full border-accent text-primary hover:bg-accent hover:text-accent-foreground",
            className,
          )}
        >
          <HeartHandshake className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl sm:max-w-md">
        {submitted ? (
          // --- Confirmation state: warm, reassuring, no alarm. ---
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground"
                >
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <DialogTitle>{t("checkin_distress_done_title", "Your therapist will see this")}</DialogTitle>
              </div>
              <DialogDescription>
                {t(
                  "checkin_distress_done_body",
                  "Thank you for reaching out — that takes courage. Your therapist has been gently notified and will follow up. You don't have to wait alone in the meantime.",
                )}
              </DialogDescription>
            </DialogHeader>

            <CrisisResources bare />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => handleOpenChange(false)}
              >
                {t("checkin_distress_close", "Close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // --- Compose state: optional note + calm framing. ---
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground"
                >
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <DialogTitle>{t("checkin_distress_title", "Having a hard week?")}</DialogTitle>
              </div>
              <DialogDescription>
                {t(
                  "checkin_distress_intro",
                  "Let your therapist know you could use some support before your next session. They'll see this and reach out — no need to explain everything right now.",
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <label
                htmlFor="checkin-distress-note"
                className="text-xs font-semibold text-foreground"
              >
                {t("checkin_distress_note_label", "Anything you'd like to share? (optional)")}
              </label>
              <Textarea
                id="checkin-distress-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={t(
                  "checkin_distress_note_placeholder",
                  "A word on how you're doing, if you'd like — totally optional.",
                )}
                className="resize-none rounded-2xl"
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t(
                  "checkin_distress_emergency_hint",
                  "This isn't an emergency line. If you're in immediate danger, please use the crisis resources below.",
                )}
              </p>
            </div>

            <CrisisResources bare />

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => handleOpenChange(false)}
                disabled={submitMutation.isPending}
              >
                {t("checkin_distress_cancel", "Not now")}
              </Button>
              <Button
                type="button"
                className="gap-2 rounded-full"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                )}
                {t("checkin_distress_submit", "Let my therapist know")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ========================================================================== */
/* THERAPIST: CheckInAlerts                                                    */
/* ========================================================================== */

export interface CheckInAlertsProps {
  className?: string;
  /** Hide the outer Card chrome (e.g. when embedding inside another card). */
  bare?: boolean;
  /** Called with a clientId when the therapist taps "Message". */
  onMessage?: (clientId: string) => void;
  /** Called with a clientId when the therapist taps "View". */
  onView?: (clientId: string) => void;
}

/**
 * Therapist-facing queue of unacknowledged client check-ins. Each row shows who
 * flagged, when, and any note, with "Acknowledge" (stamps acknowledged_at) plus
 * "Message"/"View" actions. Calm visual language (accent surface), never red.
 */
export const CheckInAlerts = ({
  className,
  bare = false,
  onMessage,
  onView,
}: CheckInAlertsProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthManager();
  const queryClient = useQueryClient();

  // Reuse the same source the rest of the therapist dashboard uses so names
  // line up with the active-clients table / clinical queue.
  const { data: clients = [] } = useTherapistClients();
  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients as Array<{ id?: string; name?: string }>) {
      if (c?.id) map.set(c.id, c.name ?? "");
    }
    return map;
  }, [clients]);

  const {
    data: checkins = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [...CHECKINS_QUERY_KEY, "therapist", user?.id ?? ""],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_checkins")
        .select("*")
        .eq("therapist_id", user?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ClientCheckinRow[];
      // Only surface flags that still need attention. (The mock's `.is()` is a
      // no-op, so we filter unacknowledged rows here to stay correct on both
      // the mock and a real backend.)
      return rows.filter((r) => !r.acknowledged_at);
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_checkins")
        .update({ id, acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic: drop the row immediately so the queue feels responsive.
    onMutate: async (id: string) => {
      const key = [...CHECKINS_QUERY_KEY, "therapist", user?.id ?? ""];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ClientCheckinRow[]>(key);
      queryClient.setQueryData<ClientCheckinRow[]>(key, (old) =>
        (old ?? []).filter((r) => r.id !== id),
      );
      return { previous, key };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous && ctx?.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
      toast({
        title: t("checkin_ack_error_title", "Couldn't acknowledge"),
        description: t("checkin_ack_error_body", "Please try again."),
      });
    },
    onSuccess: () => {
      toast({
        title: t("checkin_ack_done_title", "Acknowledged"),
        description: t("checkin_ack_done_body", "This check-in has been cleared from your queue."),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CHECKINS_QUERY_KEY });
    },
  });

  const count = checkins.length;

  const body = (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground"
          >
            <BellRing className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-foreground">
            {t("checkin_alerts_title", "Between-session check-ins")}
          </h2>
        </div>
        {count > 0 ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
          {t("checkin_alerts_error", "Couldn't load check-ins right now. Please refresh.")}
        </p>
      ) : count === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] font-medium text-foreground">
            {t("checkin_alerts_empty_title", "All caught up")}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t(
              "checkin_alerts_empty_body",
              "No clients have flagged a hard week. New check-ins will appear here.",
            )}
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={t("checkin_alerts_list_label", "Client check-ins")}>
          {checkins.map((row) => {
            const name =
              clientNameById.get(row.client_id) ||
              t("checkin_alerts_unknown_client", "A client");
            const when = formatWhen(row.created_at, i18n.language);
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-accent bg-accent/30 p-3"
              >
                <div className="flex items-start gap-2">
                  <HeartHandshake
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">{name}</span>
                      {when ? (
                        <span className="shrink-0 text-[10px] text-muted-foreground">{when}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] font-medium text-primary">
                      {t("checkin_alerts_flag_label", "Flagged a hard week")}
                    </p>
                    {row.note ? (
                      <p className="mt-1 rounded-xl bg-background/70 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        &ldquo;{row.note}&rdquo;
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full"
                    onClick={() => acknowledgeMutation.mutate(row.id)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("checkin_alerts_acknowledge", "Acknowledge")}
                  </Button>
                  {onMessage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 rounded-full"
                      onClick={() => onMessage(row.client_id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("checkin_alerts_message", "Message")}
                    </Button>
                  ) : null}
                  {onView ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full"
                      onClick={() => onView(row.client_id)}
                    >
                      {t("checkin_alerts_view", "View")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (bare) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card
      role="region"
      aria-label={t("checkin_alerts_title", "Between-session check-ins")}
      className={cn("rounded-3xl border-border p-6 shadow-sm", className)}
    >
      {body}
    </Card>
  );
};

export default BetweenSessionCheckIn;
