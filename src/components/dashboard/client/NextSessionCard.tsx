import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Video, MapPin, CalendarPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOptimizedSessions } from "@/hooks/api/useOptimizedSessions";
import { getNextSession, getLastSession, formatSessionDateTime } from "./clientSessionUtils";
import PreSessionNudge from "@/components/sessions/PreSessionNudge";
import SessionRecapCard from "@/components/sessions/SessionRecapCard";
import PostSessionAllianceCheck from "@/components/sessions/PostSessionAllianceCheck";

/**
 * Right column — upcoming session card. Shows the soonest non-terminal session
 * for the client (therapist, date/time, format) with Join / Details actions.
 */
const NextSessionCard = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: sessions = [], isLoading } = useOptimizedSessions("client");

  const next = useMemo(() => getNextSession(sessions), [sessions]);
  const last = useMemo(() => getLastSession(sessions), [sessions]);
  const isVideo = next?.session_format === "video";

  return (
    <Card className="rounded-3xl border-border p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">{t("next_session_title")}</h2>
        {next ? (
          <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
            {t("upcoming")}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
          {t("loading")}
        </p>
      ) : !next ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="text-xs font-bold text-foreground">{t("no_upcoming_session")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("no_upcoming_session_sub")}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-auto gap-2 rounded-2xl py-2.5 text-[11px] font-bold"
            onClick={() => navigate("/dashboard/client/sessions")}
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("cqa_book_session")}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-mint/30 bg-mint/10 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              {isVideo ? (
                <Video className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MapPin className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">
                {next.therapist?.full_name
                  ? t("with_therapist", { name: next.therapist.full_name })
                  : t("next_session_title")}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatSessionDateTime(next, i18n.language)}
              </p>
              {next.location ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{next.location}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              className="h-auto flex-1 rounded-xl bg-primary py-2 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate("/dashboard/client/sessions")}
            >
              {t("session_join")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-1 rounded-xl py-2 text-[11px] font-bold"
              onClick={() => navigate("/dashboard/client/sessions")}
            >
              {t("session_details")}
            </Button>
          </div>

          {/* 24h-before reminder + optional prep note (renders only when due) */}
          <div className="mt-3">
            <PreSessionNudge session={next} canAddPrepNote />
          </div>
        </div>
      )}

      {/* Continuity from the last session: therapist recap + a quick
          "how connected did you feel?" micro-check the client can still answer. */}
      {last && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("last_session_label", "Your last session")}
          </p>
          <SessionRecapCard
            sessionId={last.id}
            recap={last.recap}
            canEdit={false}
            compact
          />
          <PostSessionAllianceCheck sessionId={last.id} compact />
        </div>
      )}
    </Card>
  );
};

export default NextSessionCard;
