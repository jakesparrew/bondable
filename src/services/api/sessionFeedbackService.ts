import { supabase } from '@/integrations/supabase/client';
import console from '@/lib/production-console';

/**
 * `session_feedback` is provisioned in the Drizzle schema + dev mock, but the
 * generated Supabase `Database` types haven't been regenerated to include it
 * yet (same status as the sibling `client_checkins` table). Until they are, we
 * access this one table through an untyped view of the client so this file
 * stays type-clean. Everything else keeps the fully-typed client.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
};

/**
 * Post-session "working alliance" micro-check + therapist recap.
 *
 * Two tiny, additive pieces of the session loop that the Data phase has already
 * provisioned in the schema/mock:
 *   - `session_feedback` table  → one 1–5 alliance rating (+ optional note) the
 *      CLIENT leaves after a session is complete.
 *   - `sessions.recap` column   → a short shared summary the THERAPIST writes on
 *      a completed session, visible to both sides.
 *
 * This service is intentionally thin and never throws into the UI: in dev the
 * app runs on an in-memory mock backend where mutations are echoed (not
 * persisted), so callers pair these calls with optimistic local state +
 * react-query invalidation.
 */

export interface SessionFeedback {
  id: string;
  session_id: string;
  client_id: string;
  /** 1–5 working-alliance rating ("How connected did you feel?"). */
  alliance_rating: number | null;
  note: string | null;
  created_at: string;
}

export interface SessionFeedbackInput {
  sessionId: string;
  clientId: string;
  allianceRating: number;
  note?: string;
}

export class SessionFeedbackService {
  /**
   * Save a client's post-session alliance micro-check.
   * Returns the created row (echoed by the mock in dev).
   */
  static async submitFeedback(input: SessionFeedbackInput): Promise<SessionFeedback | null> {
    const rating = Math.max(1, Math.min(5, Math.round(input.allianceRating)));

    const { data, error } = await db
      .from('session_feedback')
      .insert({
        session_id: input.sessionId,
        client_id: input.clientId,
        alliance_rating: rating,
        note: input.note?.trim() ? input.note.trim() : null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting session feedback:', error);
      throw new Error(`Failed to submit session feedback: ${error.message}`);
    }

    return (data as SessionFeedback) ?? null;
  }

  /**
   * Fetch the alliance micro-check(s) for a session. Most sessions have at most
   * one (per client), but couples/family sessions may carry several.
   */
  static async getFeedbackForSession(sessionId: string): Promise<SessionFeedback[]> {
    const { data, error } = await db
      .from('session_feedback')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching session feedback:', error);
      return [];
    }

    return (data as SessionFeedback[]) ?? [];
  }

  /**
   * Has THIS client already left a micro-check for THIS session?
   * Used to avoid re-prompting a client who already answered.
   */
  static async hasClientSubmitted(sessionId: string, clientId: string): Promise<boolean> {
    const all = await this.getFeedbackForSession(sessionId);
    return all.some((f) => f.client_id === clientId);
  }

  /**
   * Therapist writes / updates the shared recap on a completed session.
   * Persisted to `sessions.recap`. In the dev mock the update is echoed (not
   * stored), so the UI keeps the value in local state after a successful call.
   */
  static async saveRecap(sessionId: string, recap: string): Promise<void> {
    const { error } = await db
      .from('sessions')
      .update({ recap: recap.trim(), updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error saving session recap:', error);
      throw new Error(`Failed to save session recap: ${error.message}`);
    }
  }
}
