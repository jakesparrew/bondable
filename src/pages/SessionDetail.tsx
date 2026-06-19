import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Type,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SessionService, type Session } from "@/services/api/SessionService";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { isSessionPast } from "@/components/sessions/sessionLoopUtils";
import SessionRecapCard from "@/components/sessions/SessionRecapCard";
import PostSessionAllianceCheck from "@/components/sessions/PostSessionAllianceCheck";
import PreSessionNudge from "@/components/sessions/PreSessionNudge";

/** Session enriched with resolved counterpart names for display. */
interface SessionWithNames extends Session {
  clientName?: string;
  therapistName?: string;
}

/**
 * Fetch a single session and resolve the client/therapist display names.
 *
 * `SessionService.getSession` selects the raw row (no profile join), so we
 * look the two profiles up directly — the dev mock resolves `profiles` by id.
 */
const fetchSessionWithNames = async (
  sessionId: string,
): Promise<SessionWithNames | null> => {
  const session = await SessionService.getSession(sessionId);
  if (!session) return null;

  const ids = [session.client_id, session.therapist_id].filter(Boolean);
  let nameById: Record<string, string> = {};
  if (ids.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ids);
    nameById = (data || []).reduce<Record<string, string>>((acc, p: any) => {
      acc[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim();
      return acc;
    }, {});
  }

  return {
    ...session,
    clientName: session.client?.full_name || nameById[session.client_id],
    therapistName:
      session.therapist?.full_name || nameById[session.therapist_id],
  };
};

const getSessionIcon = (type?: string) => {
  switch (type) {
    case "video":
    case "video_call":
      return <Video className="h-4 w-4" />;
    case "phone":
    case "phone_call":
      return <Phone className="h-4 w-4" />;
    default:
      return <Type className="h-4 w-4" />;
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (time?: string) => (time ? time.slice(0, 5) : "");

/** Brand-token status chip; only genuinely-negative states use destructive red. */
const getStatusBadgeClasses = (status: Session["status"]) => {
  switch (status) {
    case "Cancelled":
    case "Denied":
    case "No Show":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Completed":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      // Pending / Confirmed / upcoming
      return "bg-secondary text-secondary-foreground border-border";
  }
};

const InfoTile = ({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  className?: string;
}) => (
  <div className={`p-4 transition-colors hover:bg-muted ${className}`}>
    <div className="mb-3 flex items-center gap-3">
      <div className="rounded-lg bg-muted p-2 text-foreground">{icon}</div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
    <p className="text-sm font-semibold leading-tight text-muted-foreground">
      {value}
    </p>
  </div>
);

const SessionDetail = () => {
  const { t } = useTranslation();
  const { userType, sessionId } = useParams<{
    userType: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuthManager();

  const isTherapist = userType === "therapist";

  const {
    data: session,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSessionWithNames(sessionId as string),
    enabled: Boolean(sessionId),
  });

  const handleBack = () => navigate(`/dashboard/${userType}/sessions`);

  // ---- Loading ----------------------------------------------------------
  if (isLoading) {
    return (
      <DashboardLayout userType={userType as "therapist" | "client"}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  // ---- Not found / error ------------------------------------------------
  if (isError || !session) {
    return (
      <DashboardLayout userType={userType as "therapist" | "client"}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
              aria-label={t("back", "Back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold text-foreground">
              {t("session_not_found_title", "Session not found")}
            </h1>
          </div>
          <Card className="border border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {t(
                  "session_not_found_body",
                  "We couldn't find this session. It may have been removed or the link is out of date.",
                )}
              </p>
              <Button onClick={handleBack} className="mt-2">
                {t("back_to_sessions", "Back to sessions")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ---- Loaded -----------------------------------------------------------
  const counterpartName = isTherapist
    ? session.clientName
    : session.therapistName;
  const counterpartLabel = isTherapist ? t("client") : t("therapist");

  const canEditRecap = isTherapist && session.therapist_id === user?.id;
  const past = isSessionPast(session);
  const isClientOwner = !isTherapist && session.client_id === user?.id;
  const sessionFormat = session.session_format || session.session_type;

  return (
    <DashboardLayout userType={userType as "therapist" | "client"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
              aria-label={t("back", "Back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {t("therapy_session", "Therapy session")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.session_date)}
                {session.session_time
                  ? ` • ${formatTime(session.session_time)}`
                  : ""}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={getStatusBadgeClasses(session.status)}
          >
            {t(`status_${session.status.toLowerCase().replace(/ /g, "_")}`, session.status)}
          </Badge>
        </div>

        {/* Session details */}
        <Card className="overflow-hidden border border-border bg-card">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
              <InfoTile
                icon={<Calendar className="h-4 w-4" />}
                label={t("date")}
                value={formatDate(session.session_date)}
              />
              <InfoTile
                icon={<Clock className="h-4 w-4" />}
                label={t("time")}
                value={
                  session.session_time
                    ? formatTime(session.session_time)
                    : t("not_specified", "Not specified")
                }
              />
              <InfoTile
                icon={getSessionIcon(sessionFormat)}
                label={t("type")}
                value={
                  <span className="capitalize">
                    {(sessionFormat || t("not_specified", "Not specified"))
                      .toString()
                      .replace(/[-_]/g, " ")}
                  </span>
                }
              />
              <InfoTile
                icon={<MapPin className="h-4 w-4" />}
                label={t("location")}
                value={session.location || t("not_specified", "Not specified")}
              />
            </div>

            {/* Counterpart */}
            {counterpartName && (
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-3 text-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      {counterpartLabel}
                    </span>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {counterpartName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-session nudge — upcoming sessions; client can add a prep note.
            (The component self-hides unless the session is within 24h.) */}
        {!past && (
          <PreSessionNudge
            session={session}
            canAddPrepNote={isClientOwner}
          />
        )}

        {/* Session recap — therapist authors/edits; client sees it read-only. */}
        <SessionRecapCard
          sessionId={session.id}
          recap={session.recap}
          canEdit={canEditRecap}
        />

        {/* Therapist-authored notes (read-only surface). */}
        {session.notes && (
          <Card className="border border-border bg-card">
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">
                  {t("session_notes", "Session notes")}
                </h4>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {session.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Post-session alliance micro-check — client only, past/completed. */}
        {past && isClientOwner && (
          <PostSessionAllianceCheck sessionId={session.id} />
        )}
      </div>
    </DashboardLayout>
  );
};

export default SessionDetail;
