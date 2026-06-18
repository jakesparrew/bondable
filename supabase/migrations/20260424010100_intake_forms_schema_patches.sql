-- Intake Forms — patches for Task 1 code-review findings.
-- See docs/superpowers/specs/2026-04-24-intake-forms-design.md.
-- Applies to migration 20260424010000_intake_forms_schema.sql. Two fixes:
--   1. Attach BEFORE UPDATE triggers on the four new tables so updated_at stays
--      in sync for any writer that bypasses the service/RPC layer (admin tools,
--      backfill scripts). The helper trigger function is (re)defined below in
--      case the bootstrap schema dropped it.
--   2. Add WITH CHECK to cq_update_therapist so a therapist cannot reassign
--      therapist_id to another user mid-update — defense in depth against
--      tenancy leaks.

-- ----------------------------------------------------------------------------
-- Helper: (re)create the shared updated_at trigger function. Idempotent.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Fix 2: cq_update_therapist — add WITH CHECK (defense in depth).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS cq_update_therapist ON public.client_questionnaires;
CREATE POLICY cq_update_therapist ON public.client_questionnaires
    FOR UPDATE USING (auth.uid() = therapist_id)
    WITH CHECK (auth.uid() = therapist_id);

-- ----------------------------------------------------------------------------
-- Fix 1: updated_at triggers on the four new tables.
-- Idempotent via DROP TRIGGER IF EXISTS.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_questionnaire_templates_updated_at  ON public.questionnaire_templates;
CREATE TRIGGER update_questionnaire_templates_updated_at
    BEFORE UPDATE ON public.questionnaire_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questionnaire_questions_updated_at  ON public.questionnaire_questions;
CREATE TRIGGER update_questionnaire_questions_updated_at
    BEFORE UPDATE ON public.questionnaire_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_questionnaires_updated_at    ON public.client_questionnaires;
CREATE TRIGGER update_client_questionnaires_updated_at
    BEFORE UPDATE ON public.client_questionnaires
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_questionnaire_responses_updated_at  ON public.questionnaire_responses;
CREATE TRIGGER update_questionnaire_responses_updated_at
    BEFORE UPDATE ON public.questionnaire_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
