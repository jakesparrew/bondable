import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, PenLine, Lock, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOptimizedJournalEntries } from "@/hooks/api/useOptimizedJournal";

const MAX_ENTRIES = 3;

/**
 * Right column — recent journal entries (snippet + date + sharing badge). When
 * the client has no entries, shows a gentle "How are you feeling today?"
 * check-in prompt instead. Wired to useOptimizedJournalEntries.
 */
const RecentJournalCard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: entries = [], isLoading } = useOptimizedJournalEntries();

  const recent = useMemo(() => entries.slice(0, MAX_ENTRIES), [entries]);

  const formatDate = (value?: string) => {
    if (!value) return "";
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) return "";
    return new Date(ts).toLocaleDateString(i18n.language || undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const snippet = (content: string) => {
    const clean = (content ?? "").trim();
    return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
  };

  const goToJournal = () => navigate("/dashboard/client/journal");

  return (
    <Card className="rounded-3xl border-border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{t("recent_journal")}</h2>
        {recent.length > 0 ? (
          <Button
            type="button"
            variant="link"
            className="h-auto gap-1 p-0 text-[11px] font-bold text-primary"
            onClick={goToJournal}
          >
            {t("view_all_journal")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
          {t("loading")}
        </p>
      ) : recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold text-foreground">{t("checkin_title")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("checkin_body")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-auto gap-2 rounded-2xl py-2.5 text-[11px] font-bold"
            onClick={goToJournal}
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
            {t("checkin_cta")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((entry) => {
            const shared = entry.sharing === "therapist";
            return (
              <button
                key={entry.id}
                type="button"
                onClick={goToJournal}
                className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-foreground">
                    {snippet(entry.content) || formatDate(entry.date)}
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">{formatDate(entry.date)}</span>
                    <Badge
                      variant="outline"
                      className={
                        shared
                          ? "rounded-full border-mint/30 bg-mint/15 px-2 py-0 text-[8px] font-bold uppercase text-mint"
                          : "rounded-full border-border bg-muted px-2 py-0 text-[8px] font-bold uppercase text-muted-foreground"
                      }
                    >
                      {shared ? (
                        <Share2 className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                      ) : (
                        <Lock className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                      )}
                      {shared ? t("journal_shared_label") : t("journal_private_label")}
                    </Badge>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default RecentJournalCard;
