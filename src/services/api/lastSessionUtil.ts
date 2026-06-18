import { supabase } from "@/integrations/supabase/client";
import console from "@/lib/production-console";

/**
 * Fetches the most-recent session date for every client of a given therapist.
 *
 * Returns a Map of client_id -> most-recent session_date (ISO `YYYY-MM-DD`).
 * Resilient by design: on error it logs and returns an empty Map (never throws).
 */
export async function fetchLastSessionDates(therapistId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("client_id, session_date")
      .eq("therapist_id", therapistId)
      .order("session_date", { ascending: false });

    if (error) {
      console.error("❌ Error fetching last session dates:", error);
      return map;
    }

    if (!data) {
      return map;
    }

    for (const row of data) {
      if (!row.client_id || !row.session_date) {
        continue;
      }
      const existing = map.get(row.client_id);
      // Keep the max session_date per client (ISO date strings compare lexicographically).
      if (!existing || row.session_date > existing) {
        map.set(row.client_id, row.session_date);
      }
    }

    return map;
  } catch (error) {
    console.error("❌ Error in fetchLastSessionDates:", error);
    return map;
  }
}

/**
 * Formats the last session date for a given client.
 * Returns a localized date string if present, otherwise "N/A".
 */
export function formatLastSession(map: Map<string, string>, clientId: string): string {
  const date = map.get(clientId);
  return date ? new Date(date).toLocaleDateString() : "N/A";
}
