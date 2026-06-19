import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";

export interface AdminPlatformStats {
  totalUsers: number;
  totalTherapists: number;
  totalClients: number;
  totalSessions: number;
  activeRelationships: number;
}

export interface AdminRecentUser {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  status: string | null;
  createdAt: string | null;
}

const safeCount = (rows: unknown): number => (Array.isArray(rows) ? rows.length : 0);

/**
 * Aggregates platform-wide counts for the admin dashboard. Reads directly from
 * the same tables the rest of the app uses (profiles / sessions /
 * client_therapist_relationships) so the figures reflect the live (seeded) data
 * and degrade gracefully — every query is wrapped so a failure yields 0 rather
 * than throwing. The mock backend seeds little admin data, so empty/"—" states
 * are expected and handled by the consuming components.
 */
export const useAdminPlatformStats = () => {
  return useQuery<AdminPlatformStats>({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      try {
        const [profilesRes, sessionsRes, relationshipsRes] = await Promise.allSettled([
          supabase.from("profiles").select("id, role"),
          supabase.from("sessions").select("id"),
          supabase.from("client_therapist_relationships").select("id, status"),
        ]);

        const profiles =
          profilesRes.status === "fulfilled" ? ((profilesRes.value.data ?? []) as Array<{ role?: string }>) : [];
        const sessions =
          sessionsRes.status === "fulfilled" ? (sessionsRes.value.data ?? []) : [];
        const relationships =
          relationshipsRes.status === "fulfilled"
            ? ((relationshipsRes.value.data ?? []) as Array<{ status?: string }>)
            : [];

        return {
          totalUsers: safeCount(profiles),
          totalTherapists: profiles.filter((p) => p.role === "therapist").length,
          totalClients: profiles.filter((p) => p.role === "client").length,
          totalSessions: safeCount(sessions),
          activeRelationships: relationships.filter((r) => r.status === "active").length,
        };
      } catch (error) {
        console.error("❌ Failed to load admin platform stats:", error);
        return {
          totalUsers: 0,
          totalTherapists: 0,
          totalClients: 0,
          totalSessions: 0,
          activeRelationships: 0,
        };
      }
    },
    staleTime: 60_000,
  });
};

/**
 * Most-recently-created user profiles, for the admin "Recent Users" list.
 * Returns an empty array on any failure so the table can render its empty state.
 */
export const useAdminRecentUsers = (limit = 6) => {
  return useQuery<AdminRecentUser[]>({
    queryKey: ["admin-recent-users", limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role, status, created_at")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error || !Array.isArray(data)) return [];

        return data.map((p: Record<string, unknown>) => {
          const first = (p.first_name as string) ?? "";
          const last = (p.last_name as string) ?? "";
          const name = `${first} ${last}`.trim();
          return {
            id: String(p.id),
            name: name || String(p.email ?? "—"),
            email: (p.email as string) ?? null,
            role: (p.role as string) ?? null,
            status: (p.status as string) ?? null,
            createdAt: (p.created_at as string) ?? null,
          };
        });
      } catch (error) {
        console.error("❌ Failed to load recent users:", error);
        return [];
      }
    },
    staleTime: 60_000,
  });
};
