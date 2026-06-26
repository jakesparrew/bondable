import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService, type AdminConversation } from "@/services/api/adminService";

/**
 * Compact "conversations needing review" card for the admin dashboard. Lists up
 * to 3 flagged conversations, each linking to the All Chats oversight page.
 * Degrades gracefully when there is nothing to review.
 */
const FlaggedConversationsCard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [flagged, setFlagged] = useState<AdminConversation[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    adminService
      .listConversations({ status: "flagged" })
      .then((rows) => {
        if (!alive) return;
        setFlagged(rows.slice(0, 3));
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
          {t("admin_review_title", "Gesprekken die aandacht nodig hebben")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : flagged.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("admin_review_empty", "Geen gesprekken die aandacht nodig hebben.")}
          </div>
        ) : (
          <ul className="space-y-2">
            {flagged.map((conv) => (
              <li key={conv.id}>
                <Link
                  to="/dashboard/admin/chats"
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-destructive/50 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {conv.clientName}
                      </span>
                      <Badge variant="destructive" className="text-[10px]">
                        {t("admin_review_flagged", "Gemarkeerd")}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.counterpartName}
                      {conv.supervisingTherapistName
                        ? ` · ${t("admin_review_supervised", "supervisie")}: ${conv.supervisingTherapistName}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default FlaggedConversationsCard;
