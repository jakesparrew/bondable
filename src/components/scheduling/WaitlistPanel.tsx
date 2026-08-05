import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/ui/empty-state";
import LineBranch from "@/components/illustration/LineBranch";
import { Plus, Send, X, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { scheduleService } from "@/services/api/scheduleService";
import type {
  BusyBlock,
  OpenSlot,
  WaitlistEntry,
  WaitlistDaypart,
  SessionFormat,
  Weekday,
} from "@/services/api/scheduleService";
import { format as formatDate, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

/**
 * WaitlistPanel — the provider's waitlist surface (T-PX-13). A list of waiting
 * clients, a "voeg toe" form, and a "stel moment voor" action that (in the mock)
 * marks an entry offered and hands a proposed slot up to the parent so the
 * existing session request/confirm state machine can take over.
 *
 * Designed to drop onto the provider dashboard, the /clients page, or a
 * declined-lead flow. It is exported (default) and left UNMOUNTED — the parent
 * wires it where it belongs. Self-contained: reads/writes scheduleService and
 * only needs a providerId.
 *
 * Border-first, no mint (provider surface), 360px-safe. NL-first je/jij voice,
 * zero exclamation marks. Concrete Flemish demo names, real dates.
 */

const WEEKDAYS: { value: Weekday; nl: string }[] = [
  { value: 1, nl: "ma" },
  { value: 2, nl: "di" },
  { value: 3, nl: "wo" },
  { value: 4, nl: "do" },
  { value: 5, nl: "vr" },
  { value: 6, nl: "za" },
  { value: 7, nl: "zo" },
];

const DAYPARTS: { value: WaitlistDaypart; nl: string }[] = [
  { value: "morning", nl: "Voormiddag" },
  { value: "afternoon", nl: "Namiddag" },
  { value: "evening", nl: "Avond" },
];

interface WaitlistClientOption {
  id: string;
  name: string;
}

export interface WaitlistPanelProps {
  /** The provider whose waitlist this is (= profiles.id). */
  providerId: string;
  /**
   * Clients selectable in the "voeg toe" form. If omitted, a small set of
   * concrete Flemish demo clients is used so the panel is explorable standalone.
   */
  clients?: WaitlistClientOption[];
  /**
   * Optional concrete slot to match against (e.g. a gap on Today). When present,
   * the panel highlights matching entries and enables "stel dit moment voor".
   * When absent, the panel derives open slots itself from the painted grid and
   * proposes the first one that fits each entry's preference.
   */
  slot?: { date: string; time: string; format: SessionFormat };
  /** Already-booked time, so derived suggestions never land on a taken hour. */
  busy?: BusyBlock[];
  /** How far ahead to look for a matching gap. Default 21 days. */
  lookaheadDays?: number;
  /**
   * Called when the provider proposes a slot to a waiting client. The parent
   * turns this into a pending session via the existing state machine. When no
   * handler is given, the panel still marks the entry offered (mock).
   */
  onProposeSlot?: (entry: WaitlistEntry, slot: { date: string; time: string }) => void;
  className?: string;
}

const DEMO_CLIENTS: WaitlistClientOption[] = [
  { id: "demo-lotte", name: "Lotte Vermeulen" },
  { id: "demo-an", name: "An Verhaeghe" },
  { id: "demo-jeroen", name: "Jeroen Maes" },
];

const statusBadge = (
  status: WaitlistEntry["status"],
  t: (k: string, d: string) => string,
): { label: string; variant: "outline" | "info" | "success" | "warning" } => {
  switch (status) {
    case "offered":
      return { label: t("wl_status_offered", "Voorgesteld"), variant: "info" };
    case "booked":
      return { label: t("wl_status_booked", "Ingepland"), variant: "success" };
    case "removed":
      return { label: t("wl_status_removed", "Verwijderd"), variant: "outline" };
    default:
      return { label: t("wl_status_active", "Wacht"), variant: "outline" };
  }
};

/** "do 13 aug om 14:00" — compact, so it fits a button on 360px. */
const momentLabel = (date: string, time: string, isNl: boolean): string => {
  try {
    const d = parseISO(date);
    const day = isNl
      ? formatDate(d, "EEE d MMM", { locale: nl })
      : formatDate(d, "EEE d MMM");
    return `${day} ${isNl ? "om" : "at"} ${time}`;
  } catch {
    return `${date} ${time}`;
  }
};

const WaitlistPanel: React.FC<WaitlistPanelProps> = ({
  providerId,
  clients,
  slot,
  busy,
  lookaheadDays = 21,
  onProposeSlot,
  className,
}) => {
  const { t, i18n } = useTranslation();
  const isNl = i18n.language !== "en";
  const { toast } = useToast();

  const clientOptions = clients && clients.length > 0 ? clients : DEMO_CLIENTS;

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [format, setFormat] = useState<SessionFormat>("both");
  const [weekdays, setWeekdays] = useState<Weekday[]>([]);
  const [dayparts, setDayparts] = useState<WaitlistDaypart[]>([]);
  const [note, setNote] = useState("");

  const refresh = () => setEntries(scheduleService.listWaitlist(providerId));

  useEffect(() => {
    if (providerId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  // When a concrete slot is present, precompute the fit ranking once.
  const matchIds = useMemo(() => {
    if (!slot) return new Set<string>();
    return new Set(
      scheduleService
        .matchWaitlistForSlot(providerId, slot)
        .filter((m) => m.score > 0)
        .map((m) => m.entry.id),
    );
  }, [providerId, slot, entries]);

  /**
   * When the parent did not hand us a concrete gap, derive one: read the open
   * slots off the painted grid (minus verlof, minus what is booked) and find
   * the first that fits each waiting client's preference. That is what turns a
   * waitlist from a dead list into an action.
   */
  const openDays = useMemo(() => {
    if (slot || !providerId) return [];
    return scheduleService.getOpenSlots(
      providerId,
      scheduleService.localTodayIso(),
      lookaheadDays,
      { busy, notBefore: scheduleService.localNowIso(), maxPerDay: 4 },
    );
  }, [providerId, slot, busy, lookaheadDays]);

  const suggestionFor = (entry: WaitlistEntry): OpenSlot | null => {
    if (slot || entry.status !== "active") return null;
    return scheduleService.findSlotForPreference(entry.preference, openDays);
  };

  const resetForm = () => {
    setClientId("");
    setFormat("both");
    setWeekdays([]);
    setDayparts([]);
    setNote("");
    setShowForm(false);
  };

  const toggleWeekday = (w: Weekday) =>
    setWeekdays((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w],
    );

  const toggleDaypart = (d: WaitlistDaypart) =>
    setDayparts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );

  const handleAdd = () => {
    if (!clientId) {
      toast({
        title: t("wl_pick_client_title", "Kies een cliënt"),
        description: t(
          "wl_pick_client_desc",
          "Selecteer wie je op de wachtlijst wil zetten.",
        ),
      });
      return;
    }
    const name =
      clientOptions.find((c) => c.id === clientId)?.name ??
      t("wl_unknown_client", "Cliënt");
    scheduleService.addWaitlistEntry(providerId, {
      clientId,
      clientName: name,
      preference: { weekdays, dayparts, format },
      note: note.trim() || null,
    });
    refresh();
    resetForm();
    toast({
      title: t("wl_added_title", "Op de wachtlijst"),
      description: t(
        "wl_added_desc",
        "{{name}} staat nu op je wachtlijst. Je krijgt een seintje als er een gaatje matcht.",
      ).replace("{{name}}", name),
    });
  };

  const handlePropose = (
    entry: WaitlistEntry,
    proposed: { date: string; time: string },
  ) => {
    scheduleService.updateWaitlistStatus(providerId, entry.id, "offered", {
      date: proposed.date,
      time: proposed.time,
    });
    refresh();
    onProposeSlot?.(entry, { date: proposed.date, time: proposed.time });
    toast({
      title: t("wl_proposed_title", "Moment voorgesteld"),
      description: t(
        "wl_proposed_desc2",
        "{{name}} krijgt een voorstel voor {{moment}}. Zij bevestigt zelf.",
      )
        .replace("{{name}}", entry.clientName)
        .replace("{{moment}}", momentLabel(proposed.date, proposed.time, isNl)),
    });
  };

  const handleRemove = (entry: WaitlistEntry) => {
    scheduleService.removeWaitlistEntry(providerId, entry.id);
    refresh();
  };

  const prefLine = (entry: WaitlistEntry): string => {
    const p = entry.preference;
    const days =
      p.weekdays.length > 0
        ? p.weekdays
            .slice()
            .sort((a, b) => a - b)
            .map((w) => WEEKDAYS.find((d) => d.value === w)?.nl)
            .join(", ")
        : t("wl_any_day", "elke dag");
    const parts =
      p.dayparts.length > 0
        ? p.dayparts.map((d) => DAYPARTS.find((x) => x.value === d)?.nl).join(", ")
        : t("wl_any_time", "elk moment");
    const fmt =
      p.format === "in_person"
        ? t("wl_in_person", "in de praktijk")
        : p.format === "online"
          ? t("wl_online", "online")
          : t("wl_any_format", "praktijk of online");
    return `${days} · ${parts} · ${fmt}`;
  };

  const activeEntries = entries.filter((e) => e.status !== "removed");

  return (
    <Card className={`bg-card border-border ${className ?? ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0" />
              {t("wl_title", "Wachtlijst")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {slot
                ? t(
                    "wl_slot_desc",
                    "Je hebt een vrij moment. Stel het voor aan iemand die past.",
                  )
                : t(
                    "wl_desc",
                    "Cliënten die op een plek wachten. Voeg iemand toe of stel een moment voor.",
                  )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm((s) => !s)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t("wl_add", "Voeg toe")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="rounded-card border border-border bg-muted/30 p-4 space-y-4 animate-enter">
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("wl_client", "Cliënt")}
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={t("wl_client_ph", "Kies een cliënt")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Weekday preference */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("wl_weekdays", "Voorkeursdagen")}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => {
                  const on = weekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeekday(d.value)}
                      className={`rounded-ctl border px-2.5 py-1 text-label transition-colors ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.nl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daypart preference */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("wl_daypart", "Voorkeursmoment")}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYPARTS.map((d) => {
                  const on = dayparts.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDaypart(d.value)}
                      className={`rounded-ctl border px-2.5 py-1 text-label transition-colors ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.nl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("wl_format", "Vorm")}
              </Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as SessionFormat)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    {t("wl_any_format", "praktijk of online")}
                  </SelectItem>
                  <SelectItem value="in_person">
                    {t("wl_in_person", "in de praktijk")}
                  </SelectItem>
                  <SelectItem value="online">
                    {t("wl_online", "online")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-label text-foreground">
                {t("wl_note", "Notitie")}
              </Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "wl_note_ph",
                  "Bijv. kan enkel na 17u, of liefst op donderdag.",
                )}
                rows={2}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleAdd}>
                {t("wl_save", "Op wachtlijst zetten")}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                {t("cancel", "Annuleer")}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {activeEntries.length === 0 ? (
          <EmptyState
            motif={<LineBranch />}
            title={t("wl_empty_title", "Nog niemand op de wachtlijst")}
            description={t(
              "wl_empty_desc",
              "Zet cliënten hier als je even geen plek hebt. Zodra er een gaatje valt, matchen we het.",
            )}
          />
        ) : (
          <ul className="space-y-2">
            {activeEntries.map((entry) => {
              const badge = statusBadge(entry.status, t);
              const isMatch = matchIds.has(entry.id);
              const suggestion = suggestionFor(entry);
              return (
                <li
                  key={entry.id}
                  className={`rounded-card border p-3 transition-shadow hover:shadow-raise ${
                    isMatch ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-medium text-foreground truncate">
                          {entry.clientName}
                        </span>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {isMatch && (
                          <Badge variant="info">
                            {t("wl_matches", "Past bij dit moment")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-label text-muted-foreground">
                        {prefLine(entry)}
                      </p>
                      {entry.note && (
                        <p className="mt-1 text-label text-muted-foreground italic">
                          {entry.note}
                        </p>
                      )}
                      {entry.status === "offered" && entry.offeredSlot && (
                        <p className="mt-1 text-label text-info">
                          {t(
                            "wl_offered_line",
                            "Voorgesteld voor {{date}} om {{time}}",
                          )
                            .replace("{{date}}", entry.offeredSlot.date)
                            .replace("{{time}}", entry.offeredSlot.time)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {slot && entry.status === "active" && (
                        <Button
                          size="sm"
                          variant={isMatch ? "default" : "outline"}
                          onClick={() =>
                            handlePropose(entry, {
                              date: slot.date,
                              time: slot.time,
                            })
                          }
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {t("wl_propose", "Stel voor")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t("wl_remove", "Verwijder van wachtlijst")}
                        onClick={() => handleRemove(entry)}
                        className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* A gap that fits this preference just opened up. */}
                  {!slot && suggestion && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <span className="text-label text-muted-foreground">
                        {t("wl_gap_found", "Vrij:")}{" "}
                        <span className="tabular text-foreground">
                          {momentLabel(suggestion.date, suggestion.time, isNl)}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() =>
                          handlePropose(entry, {
                            date: suggestion.date,
                            time: suggestion.time,
                          })
                        }
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {t("wl_propose_this", "Stel dit moment voor")}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitlistPanel;
