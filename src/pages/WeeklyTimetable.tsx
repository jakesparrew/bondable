import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  X,
  Umbrella,
  MonitorSmartphone,
  Building2,
} from "lucide-react";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useToast } from "@/hooks/ui/use-toast";
import { scheduleService } from "@/services/api/scheduleService";
import type {
  AvailabilityRule,
  AvailabilityException,
  SessionFormat,
  Weekday,
} from "@/services/api/scheduleService";
import { toMinutes, toHHmm } from "@/services/api/scheduleService";

/**
 * WeeklyTimetable — REBUILT (T-PX-12) from a static demo grid into the provider's
 * availability editor. Two calm parts:
 *
 *   1. A paint-grid (Mon–Sun × 30-min rows, 09:00–20:00). Click-drag to paint the
 *      hours you take clients. On save, contiguous painted cells collapse into
 *      AvailabilityRule blocks in scheduleService — which feed client booking,
 *      the Finder "beschikbaarheid" summary, and gaps-to-fill on Today.
 *   2. A verlof/exception list (closed days & extra hours) below the grid.
 *
 * Border-first, no mint (provider surface, teal focus), 360px-safe: on mobile the
 * grid becomes a single-day painter with prev/next. Route unchanged
 * (/dashboard/:userType/weekly-timetable), DashboardLayout kept.
 *
 * NL-first je/jij voice, zero exclamation marks, real EUR/dates in demo copy.
 * No payment or ranking interaction lives here — availability is a fit signal only.
 */

/* ---- Grid model -------------------------------------------------------- */

const SLOT_MINUTES = 30;
const GRID_START = 9 * 60; // 09:00
const GRID_END = 20 * 60; // 20:00 (exclusive)
const SLOTS: number[] = [];
for (let m = GRID_START; m < GRID_END; m += SLOT_MINUTES) SLOTS.push(m);

const WEEKDAYS: { value: Weekday; nl: string; en: string }[] = [
  { value: 1, nl: "Maandag", en: "Monday" },
  { value: 2, nl: "Dinsdag", en: "Tuesday" },
  { value: 3, nl: "Woensdag", en: "Wednesday" },
  { value: 4, nl: "Donderdag", en: "Thursday" },
  { value: 5, nl: "Vrijdag", en: "Friday" },
  { value: 6, nl: "Zaterdag", en: "Saturday" },
  { value: 7, nl: "Zondag", en: "Sunday" },
];

/** painted[weekday][slotStartMinutes] = true when the provider is available. */
type PaintGrid = Record<number, Record<number, boolean>>;

const emptyGrid = (): PaintGrid => {
  const g: PaintGrid = {};
  for (const d of WEEKDAYS) {
    g[d.value] = {};
    for (const s of SLOTS) g[d.value][s] = false;
  }
  return g;
};

/** Rebuild the paint grid from persisted rules (default-format only for paint). */
const gridFromRules = (rules: AvailabilityRule[]): PaintGrid => {
  const g = emptyGrid();
  for (const r of rules) {
    const s = toMinutes(r.startTime);
    const e = toMinutes(r.endTime);
    for (let m = s; m < e; m += SLOT_MINUTES) {
      if (g[r.weekday] && m in g[r.weekday]) g[r.weekday][m] = true;
    }
  }
  return g;
};

/** Collapse painted cells into contiguous blocks → AvailabilityRule inputs. */
const rulesFromGrid = (
  grid: PaintGrid,
  format: SessionFormat,
  location: string | null,
): Omit<AvailabilityRule, "id" | "providerId">[] => {
  const out: Omit<AvailabilityRule, "id" | "providerId">[] = [];
  for (const d of WEEKDAYS) {
    let runStart: number | null = null;
    for (let i = 0; i <= SLOTS.length; i++) {
      const slot = SLOTS[i];
      const on = slot != null && grid[d.value]?.[slot];
      if (on && runStart == null) {
        runStart = slot;
      } else if (!on && runStart != null) {
        const prev = SLOTS[i - 1];
        out.push({
          weekday: d.value,
          startTime: toHHmm(runStart),
          endTime: toHHmm(prev + SLOT_MINUTES),
          format,
          location,
          validFrom: null,
          validUntil: null,
        });
        runStart = null;
      }
    }
  }
  return out;
};

const WeeklyTimetable: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isNl = i18n.language !== "en";
  const { userType } = useParams<{ userType: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuthManager();
  const { toast } = useToast();

  const providerId = user?.id ?? "demo-provider";

  const [grid, setGrid] = useState<PaintGrid>(emptyGrid);
  const [savedGrid, setSavedGrid] = useState<PaintGrid>(emptyGrid);
  const [format, setFormat] = useState<SessionFormat>("both");
  const [location, setLocation] = useState<string>("Praktijk De Brug");
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // Drag-paint state
  const [painting, setPainting] = useState<null | boolean>(null);

  const loadExceptions = () =>
    setExceptions(scheduleService.listExceptions(providerId));

  useEffect(() => {
    const rules = scheduleService.listRules(providerId);
    const g = gridFromRules(rules);
    setGrid(g);
    setSavedGrid(g);
    // Reuse the format/location off the first rule so the editor round-trips.
    if (rules[0]) {
      setFormat(rules[0].format);
      if (rules[0].location) setLocation(rules[0].location);
    }
    loadExceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  // End a drag anywhere the pointer is released.
  useEffect(() => {
    const up = () => setPainting(null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(grid) !== JSON.stringify(savedGrid),
    [grid, savedGrid],
  );

  const setCell = (weekday: Weekday, slot: number, on: boolean) =>
    setGrid((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], [slot]: on },
    }));

  const beginPaint = (weekday: Weekday, slot: number) => {
    const next = !grid[weekday]?.[slot];
    setPainting(next);
    setCell(weekday, slot, next);
  };

  const paintOver = (weekday: Weekday, slot: number) => {
    if (painting == null) return;
    setCell(weekday, slot, painting);
  };

  const dayHours = (weekday: Weekday): number => {
    const count = SLOTS.filter((s) => grid[weekday]?.[s]).length;
    return (count * SLOT_MINUTES) / 60;
  };

  const totalHours = WEEKDAYS.reduce((sum, d) => sum + dayHours(d.value), 0);

  const handleSave = () => {
    const rules = rulesFromGrid(grid, format, location.trim() || null);
    scheduleService.setRules(providerId, rules);
    setSavedGrid(grid);
    toast({
      title: t("wt_saved_title", "Beschikbaarheid bewaard"),
      description: t(
        "wt_saved_desc",
        "Je uren staan klaar. Cliënten zien enkel wanneer je open bent, nooit je tarief of plaats in de Finder.",
      ),
    });
  };

  const handleReset = () => setGrid(savedGrid);

  const handleClearDay = (weekday: Weekday) =>
    setGrid((prev) => {
      const cleared: Record<number, boolean> = {};
      for (const s of SLOTS) cleared[s] = false;
      return { ...prev, [weekday]: cleared };
    });

  const formatLabel = (f: SessionFormat) =>
    f === "in_person"
      ? t("wt_in_person", "In de praktijk")
      : f === "online"
        ? t("wt_online", "Online")
        : t("wt_both", "Praktijk of online");

  /* ---- Cell renderer ---- */
  const Cell: React.FC<{ weekday: Weekday; slot: number }> = ({
    weekday,
    slot,
  }) => {
    const on = grid[weekday]?.[slot];
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={`${WEEKDAYS.find((d) => d.value === weekday)?.[isNl ? "nl" : "en"]} ${toHHmm(slot)}`}
        onPointerDown={(e) => {
          e.preventDefault();
          beginPaint(weekday, slot);
        }}
        onPointerEnter={() => paintOver(weekday, slot)}
        className={`h-7 w-full rounded-[6px] border transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          on
            ? "border-primary/50 bg-primary/15 hover:bg-primary/25"
            : "border-border bg-card hover:bg-muted"
        }`}
      >
        <span className="sr-only">{on ? t("wt_open", "Open") : t("wt_closed", "Dicht")}</span>
      </button>
    );
  };

  /* ---- Verlof / exceptions ---- */
  const [excKind, setExcKind] = useState<"closed" | "extra">("closed");
  const [excDate, setExcDate] = useState("");
  const [excStart, setExcStart] = useState("09:00");
  const [excEnd, setExcEnd] = useState("12:00");
  const [excNote, setExcNote] = useState("");

  const addException = () => {
    if (!excDate) {
      toast({
        title: t("wt_exc_need_date", "Kies een datum"),
        description: t("wt_exc_need_date_desc", "Selecteer de dag die je wil aanpassen."),
      });
      return;
    }
    scheduleService.addException(providerId, {
      date: excDate,
      kind: excKind,
      startTime: excKind === "extra" ? excStart : null,
      endTime: excKind === "extra" ? excEnd : null,
      note: excNote.trim() || null,
    });
    loadExceptions();
    setExcDate("");
    setExcNote("");
    toast({
      title:
        excKind === "closed"
          ? t("wt_exc_closed_added", "Verlof toegevoegd")
          : t("wt_exc_extra_added", "Extra uren toegevoegd"),
      description: t(
        "wt_exc_added_desc",
        "Deze uitzondering gaat voor op je vaste weekrooster.",
      ),
    });
  };

  const removeException = (id: string) => {
    scheduleService.removeException(providerId, id);
    loadExceptions();
  };

  /* ---- Grid (desktop) ---- */
  const renderDesktopGrid = () => (
    <div className="overflow-x-auto">
      <div
        className="grid gap-1.5 min-w-[640px]"
        style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
      >
        {/* Header row */}
        <div className="text-label text-muted-foreground py-2 text-center">
          {t("wt_time", "Uur")}
        </div>
        {WEEKDAYS.map((d) => (
          <div key={d.value} className="text-center py-2">
            <div className="text-body-sm font-medium text-foreground">
              {isNl ? d.nl.slice(0, 2) : d.en.slice(0, 3)}
            </div>
            <div className="text-label text-muted-foreground">
              {dayHours(d.value) > 0 ? `${dayHours(d.value)}u` : "—"}
            </div>
            <button
              type="button"
              onClick={() => handleClearDay(d.value)}
              className="mt-0.5 text-label text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {t("wt_clear", "wis")}
            </button>
          </div>
        ))}

        {/* Slot rows */}
        {SLOTS.map((slot) => (
          <React.Fragment key={slot}>
            <div className="flex items-center justify-end pr-2 text-label text-muted-foreground">
              {toHHmm(slot)}
            </div>
            {WEEKDAYS.map((d) => (
              <Cell key={`${d.value}-${slot}`} weekday={d.value} slot={slot} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  /* ---- Grid (mobile single-day) ---- */
  const renderMobileGrid = () => {
    const d = WEEKDAYS[currentDayIndex];
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDayIndex((i) => Math.max(0, i - 1))}
            disabled={currentDayIndex === 0}
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="text-body font-medium text-foreground">
              {isNl ? d.nl : d.en}
            </div>
            <div className="text-label text-muted-foreground">
              {dayHours(d.value) > 0
                ? t("wt_hours_open", "{{h}}u open").replace(
                    "{{h}}",
                    String(dayHours(d.value)),
                  )
                : t("wt_day_closed", "Dicht")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDayIndex((i) => Math.min(6, i + 1))}
            disabled={currentDayIndex === 6}
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SLOTS.map((slot) => (
            <div key={slot} className="flex items-center gap-2">
              <span className="w-12 text-label text-muted-foreground">
                {toHHmm(slot)}
              </span>
              <div className="flex-1">
                <Cell weekday={d.value} slot={slot} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleClearDay(d.value)}
          className="mt-3 text-label text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {t("wt_clear_day", "Wis deze dag")}
        </button>
      </div>
    );
  };

  const summary = scheduleService.getAvailabilitySummary(providerId);

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/${userType}/profile`)}
            className="text-muted-foreground hover:text-foreground h-9 px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back_to_profile", "Terug naar profiel")}
          </Button>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                {t("wt_reset", "Herstel")}
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!dirty}>
              <Check className="h-4 w-4 mr-1.5" />
              {t("wt_save", "Bewaar")}
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="font-display text-display-md text-foreground">
            {t("wt_page_title", "Je beschikbaarheid")}
          </h1>
          <p className="mt-1 text-body-sm text-muted-foreground max-w-xl">
            {t(
              "wt_page_sub",
              "Schilder de uren waarop je cliënten ziet. Dit stuurt boekingsvoorstellen en toont je vrije momenten. Je tarief of plaats in de Finder verandert hier nooit door.",
            )}
          </p>
        </div>

        {/* Format + location controls */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-label text-foreground">
                  {t("wt_default_format", "Standaardvorm")}
                </Label>
                <Select
                  value={format}
                  onValueChange={(v) => setFormat(v as SessionFormat)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">{formatLabel("both")}</SelectItem>
                    <SelectItem value="in_person">
                      {formatLabel("in_person")}
                    </SelectItem>
                    <SelectItem value="online">{formatLabel("online")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-label text-foreground">
                  {t("wt_location", "Locatie")}
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("wt_location_ph", "Praktijk De Brug, Gent")}
                  className="h-9"
                  disabled={format === "online"}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-label text-muted-foreground">
              {format === "online" ? (
                <MonitorSmartphone className="h-3.5 w-3.5" />
              ) : (
                <Building2 className="h-3.5 w-3.5" />
              )}
              <span>
                {t("wt_week_total", "Deze week: {{h}}u open over {{d}} dagen")
                  .replace("{{h}}", String(totalHours))
                  .replace(
                    "{{d}}",
                    String(WEEKDAYS.filter((d) => dayHours(d.value) > 0).length),
                  )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Paint grid */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">
              {t("wt_grid_title", "Weekrooster")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isMobile
                ? t("wt_grid_hint_mobile", "Tik op een uur om het open of dicht te zetten.")
                : t(
                    "wt_grid_hint",
                    "Klik en sleep over de uren die je open wil zetten. Nog eens klikken zet ze weer dicht.",
                  )}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ touchAction: "none" }}>
            {isMobile ? renderMobileGrid() : renderDesktopGrid()}
          </CardContent>
        </Card>

        {/* Verlof / exceptions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Umbrella className="h-5 w-5 text-muted-foreground" />
              {t("wt_exc_title", "Verlof en uitzonderingen")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t(
                "wt_exc_desc",
                "Een dag dicht of net extra uren op één datum. Dit gaat altijd voor op je vaste weekrooster.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add row */}
            <div className="rounded-card border border-border bg-muted/30 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-label text-foreground">
                    {t("wt_exc_kind", "Wat")}
                  </Label>
                  <Select
                    value={excKind}
                    onValueChange={(v) => setExcKind(v as "closed" | "extra")}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closed">
                        {t("wt_exc_closed", "Dicht (verlof)")}
                      </SelectItem>
                      <SelectItem value="extra">
                        {t("wt_exc_extra", "Extra uren")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-label text-foreground">
                    {t("wt_exc_date", "Datum")}
                  </Label>
                  <Input
                    type="date"
                    value={excDate}
                    onChange={(e) => setExcDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {excKind === "extra" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-label text-foreground">
                      {t("wt_exc_from", "Van")}
                    </Label>
                    <Input
                      type="time"
                      value={excStart}
                      onChange={(e) => setExcStart(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-label text-foreground">
                      {t("wt_exc_to", "Tot")}
                    </Label>
                    <Input
                      type="time"
                      value={excEnd}
                      onChange={(e) => setExcEnd(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-label text-foreground">
                  {t("wt_exc_note", "Notitie")}
                </Label>
                <Input
                  value={excNote}
                  onChange={(e) => setExcNote(e.target.value)}
                  placeholder={t("wt_exc_note_ph", "Bijv. vakantie, of avondspreekuur.")}
                  className="h-9"
                />
              </div>

              <Button size="sm" onClick={addException}>
                <Plus className="h-4 w-4 mr-1.5" />
                {t("wt_exc_add", "Voeg uitzondering toe")}
              </Button>
            </div>

            {/* List */}
            {exceptions.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">
                {t(
                  "wt_exc_empty",
                  "Nog geen uitzonderingen. Je vaste weekrooster geldt.",
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {exceptions.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex items-center gap-2 flex-wrap">
                      <Badge variant={e.kind === "closed" ? "warning" : "info"}>
                        {e.kind === "closed"
                          ? t("wt_exc_closed_badge", "Dicht")
                          : t("wt_exc_extra_badge", "Extra")}
                      </Badge>
                      <span className="text-body-sm text-foreground">{e.date}</span>
                      {e.startTime && e.endTime && (
                        <span className="text-label text-muted-foreground">
                          {e.startTime}–{e.endTime}
                        </span>
                      )}
                      {e.note && (
                        <span className="text-label text-muted-foreground italic truncate">
                          {e.note}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t("wt_exc_remove", "Verwijder uitzondering")}
                      onClick={() => removeException(e.id)}
                      className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Finder summary preview — the client-safe fit signal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">
              {t("wt_finder_title", "Zo zien cliënten je beschikbaarheid")}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t(
                "wt_finder_desc",
                "Een zachte hint op je Finder-profiel. Geen tarief, geen rangschikking — enkel wanneer je open bent.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-body text-foreground">
              {isNl ? summary.summaryNl : summary.summaryEn}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default WeeklyTimetable;
