import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminRecentUsers, type AdminRecentUser } from "./useAdminStats";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase() || "?";
};

const roleBadgeClass = (role: string | null) => {
  switch (role) {
    case "therapist":
      return "border-mint/30 bg-mint/15 text-mint";
    case "client":
      return "border-border bg-secondary text-secondary-foreground";
    case "admin":
      return "border-primary/30 bg-primary/10 text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
};

const formatDate = (iso: string | null, language?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(language || undefined, { month: "short", day: "numeric", year: "numeric" });
};

/**
 * "Recent Users" panel — newest profiles across the platform, driven by
 * useAdminRecentUsers. Mirrors the therapist dashboard's ActiveClientsTable
 * card/table treatment (rounded card, uppercase column heads, status badges)
 * and renders an explicit empty state since the mock seeds little admin data.
 */
const RecentUsersTable = () => {
  const { t, i18n } = useTranslation();
  const { data: users = [], isLoading } = useAdminRecentUsers(6);

  return (
    <Card className="overflow-hidden rounded-3xl border-border shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 className="text-sm font-bold text-foreground">{t("admin_recent_users", "Recent Users")}</h2>
          <p className="text-[11px] text-muted-foreground">
            {t("admin_recent_users_sub", "Newest accounts across the platform")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin_th_user", "User")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin_th_role", "Role")}
              </TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin_th_status", "Status")}
              </TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("admin_th_joined", "Joined")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  {t("loading", "Loading...")}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto mb-2 h-6 w-6 opacity-50" aria-hidden="true" />
                  {t("admin_no_users", "No users yet")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: AdminRecentUser) => (
                <TableRow key={user.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-[10px] font-semibold text-primary">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{user.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{user.email ?? "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${roleBadgeClass(user.role)}`}
                    >
                      {t(`admin_role_${user.role ?? "unknown"}`, user.role ?? "—")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {user.status
                      ? t(`admin_status_${user.status}`, user.status)
                      : t("admin_status_unknown", "—")}
                  </TableCell>
                  <TableCell className="text-right text-[11px] text-muted-foreground">
                    {formatDate(user.createdAt, i18n.language)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default RecentUsersTable;
