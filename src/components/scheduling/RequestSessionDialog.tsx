import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format as formatDate, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarCheck, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/ui/use-toast";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import {
  useCreateSession,
  useOptimizedSessions,
} from "@/hooks/api/useOptimizedSessions";
import { analyticsService } from "@/services/api/analyticsService";
import { ANALYTICS_EVENTS } from "@/config/analyticsEvents";
import { scheduleService } from "@/services/api/scheduleService";
import type {
  OpenSlot,
  SessionFormat,
  WaitlistDaypart,
} from "@/services/api/scheduleService";
import SlotPicker from "@/components/scheduling/SlotPicker";

/**
 * RequestSessionDialog — the CLIENT half of the booking loop.
 *
 * The client sees the moments their begeleider actually left open (painted
 * availability minus verlof minus what is already taken), picks one, and sends
 * a request. It creates a Pending session through the existing session path
 * (SessionService via useCreateSession) — there is no parallel store; the
 * provider's confirm/deny state machine takes it from there.
 *
 * Honest by construction: a chosen chip is a REQUEST, not a booking. Every
 * screen in this dialog repeats "Je begeleider bevestigt dit moment."
 *
 * Privacy: the client never sees the provider's other appointments. Busy time
 * folded in here is the client's OWN agenda only; the real double-book guard
 * runs on the provider side at confirm time.
 *
 * When the weeks ahead are full, the dialog offers the waitlist instead of a
 * dead end (scheduleService.addWaitlistEntry — the same list the provider's
 * WaitlistPanel reads).
 *
 * Exported unmounted — the parent wires it (client dashboard, sessions page,
 * provider profile). Border-first, no mint (not an AI surface), 360px-safe.
 */

export interface RequestSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The begeleider this request goes to. Null while the parent loads. */
  provider: { id: string; name: string } | null;
  /** Session length offered. Default 50. */
  durationMinutes?: number;
  /** Fired after a request was created, e.g. to refetch a list. */
  onRequested?: (slot: { date: string; time: string }) => void;
}

const DAYPARTS: { value: WaitlistDaypart; nl: string; en: string }[] = [
  { value: "morning", nl: "Voormiddag", en: "Morning" },
  { value: "afternoon", nl: "Namiddag", en: "Afternoon" },
  { value: "evening", nl: "Avond", en: "Evening" },
];

const prettyMoment = (
  date: string,
  time: string,
  isNl: boolean,
): string => {
  try {
    const label = isNl
      ? formatDate(parseISO(date), "EEEE d MMMM", { locale: nl })
      : formatDate(parseISO(date), "EEEE d MMMM");
    return `${label.charAt(0).toUpperCase() + label.slice(1)} — ${time}`;
  } catch {
    return `${date} — ${time}`;
  }
};

const RequestSessionDialog: React.FC<RequestSessionDialogProps> = ({
  open,
  onOpenChange,
  provider,
  durationMinutes = 50,
  onRequested,
}) => {
  const { t, i18n } = useTranslation();
  const isNl = i18n.language !== "en";
  const { toast } = useToast();
  const { user } = useAuthManager();
  const createSession = useCreateSession();

  const { data: mySessions = [] } = useOptimizedSessions("client", open);

  const [format, setFormat] = useState<SessionFormat>("both");
  const [slot, setSlot] = useState<OpenSlot | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<{ date: string; time: string } | null>(null);
  const [hasSlots, setHasSlots] = useState(true);
  const [waitlistDayparts, setWaitlistDayparts] = useState<WaitlistDaypart[]>([]);
  const [onWaitlist, setOnWaitlist] = useState(false);

  // Reset every time the dialog opens so a second request starts clean.
  useEffect(() => {
    if (!open) return;
    setFormat("both");
    setSlot(null);
    setNote("");
    setSent(null);
    setOnWaitlist(false);
    setWaitlistDayparts([]);
  }, [open]);

  // Only the client's own agenda — never the provider's other clients.
  const busy = useMemo(
    () => scheduleService.busyFromSessions(mySessions ?? []),
    [mySessions],
  );

  const providerId = provider?.id ?? "";

  const handleSubmit = async () => {
    if (!provider || !slot || !user?.id) return;

    // Double-book guard: availability may have shifted while this was open.
    const free = scheduleService.isSlotStillFree(
      provider.id,
      {
        date: slot.date,
        time: slot.time,
        durationMinutes,
        format: format === "both" ? "both" : format,
      },
      busy,
    );
    if (!free) {
      setSlot(null);
      toast({
        title: t("req_slot_gone_title", "Dat moment is net weg"),
        description: t(
          "req_slot_gone_desc",
          "Kies een ander vrij moment, of zet je op de wachtlijst.",
        ),
      });
      return;
    }

    try {
      await createSession.mutateAsync({
        client_id: user.id,
        therapist_id: provider.id,
        session_date: slot.date,
        session_time: slot.time,
        session_type: "individual",
        session_format: format === "online" ? "video" : "in_person",
        duration_minutes: durationMinutes,
        location: format === "online" ? "Videogesprek" : slot.location ?? "",
        notes: note.trim() || undefined,
      });

      analyticsService.track(ANALYTICS_EVENTS.session_created, {
        provider_id: provider.id,
        is_recurring: false,
      });

      setSent({ date: slot.date, time: slot.time });
      onRequested?.({ date: slot.date, time: slot.time });
    } catch {
      // useCreateSession already surfaces the failure toast.
    }
  };

  const handleWaitlist = () => {
    if (!provider || !user?.id) return;
    scheduleService.addWaitlistEntry(provider.id, {
      clientId: user.id,
      clientName:
        (user as { user_metadata?: { full_name?: string } }).user_metadata
          ?.full_name ?? t("req_you", "Jij"),
      preference: {
        weekdays: [],
        dayparts: waitlistDayparts,
        format,
      },
      note: note.trim() || null,
    });
    setOnWaitlist(true);
    toast({
      title: t("req_waitlist_title", "Je staat op de wachtlijst"),
      description: t(
        "req_waitlist_desc",
        "{{name}} stelt je een moment voor zodra er een gaatje valt dat past.",
      ).replace("{{name}}", provider.name),
    });
  };

  const toggleDaypart = (d: WaitlistDaypart) =>
    setWaitlistDayparts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const waitlistCta = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={onWaitlist || !providerId}
      onClick={handleWaitlist}
    >
      {onWaitlist
        ? t("req_waitlist_done", "Je staat op de wachtlijst")
        : t("req_waitlist_cta", "Zet me op de wachtlijst")}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {sent
              ? t("req_sent_title", "Je aanvraag is verstuurd")
              : t("req_title", "Vraag een sessie aan")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {sent
              ? t(
                  "req_sent_desc",
                  "Je begeleider bevestigt dit moment. Je ziet het meteen in je agenda zodra dat gebeurt.",
                )
              : provider
                ? t(
                    "req_desc",
                    "Dit zijn de momenten die {{name}} openliet. Je begeleider bevestigt dit moment.",
                  ).replace("{{name}}", provider.name)
                : t("req_desc_loading", "Even je begeleider ophalen.")}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-card border border-border bg-muted/30 p-4">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-foreground">
                  {prettyMoment(sent.date, sent.time, isNl)}
                </p>
                <p className="mt-1 text-label text-muted-foreground">
                  {t(
                    "req_pending_line",
                    "In afwachting van bevestiging. Je krijgt een bericht zodra je begeleider antwoordt.",
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                {t("req_close", "Sluit")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Format — also filters which slots make sense. */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("req_format", "Vorm")}
              </Label>
              <Select
                value={format}
                onValueChange={(v) => {
                  setFormat(v as SessionFormat);
                  setSlot(null);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    {t("req_format_any", "Praktijk of online")}
                  </SelectItem>
                  <SelectItem value="in_person">
                    {t("req_format_in_person", "In de praktijk")}
                  </SelectItem>
                  <SelectItem value="online">
                    {t("req_format_online", "Online")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Open slots */}
            {providerId ? (
              <SlotPicker
                providerId={providerId}
                value={slot}
                onSelect={setSlot}
                durationMinutes={durationMinutes}
                format={format}
                busy={busy}
                emptyAction={waitlistCta}
                onAvailabilityChange={setHasSlots}
              />
            ) : (
              <p className="text-body-sm text-muted-foreground">
                {t("req_no_provider", "Kies eerst een begeleider.")}
              </p>
            )}

            {/* Waitlist preference — only when there is nothing to pick. */}
            {!hasSlots && !onWaitlist && (
              <div className="space-y-1.5 animate-enter">
                <Label className="text-label text-foreground">
                  {t("req_waitlist_pref", "Wanneer kan jij meestal")}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYPARTS.map((d) => {
                    const on = waitlistDayparts.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleDaypart(d.value)}
                        className={`rounded-ctl border px-2.5 py-1 text-label transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isNl ? d.nl : d.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional note */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("req_note", "Iets dat je begeleider vooraf moet weten")}
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "req_note_ph",
                  "Bijv. ik kom met de trein en ben mogelijk vijf minuten later.",
                )}
                rows={2}
              />
            </div>

            {/* Chosen moment + the honest expectation, right above the CTA. */}
            {slot && (
              <div className="rounded-ctl border border-border bg-muted/30 p-3 animate-enter">
                <p className="text-body-sm font-medium text-foreground">
                  {prettyMoment(slot.date, slot.time, isNl)}
                </p>
                <p className="mt-1 text-label text-muted-foreground">
                  {t(
                    "req_confirm_line",
                    "Je begeleider bevestigt dit moment. Tot dan staat het als aanvraag in je agenda.",
                  )}
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel", "Annuleer")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!slot || !provider || createSession.isPending}
              >
                {createSession.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("req_submit", "Vraag dit moment aan")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RequestSessionDialog;
