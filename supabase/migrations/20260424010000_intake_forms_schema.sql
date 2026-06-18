-- Intake Forms — schema + RLS. See docs/superpowers/specs/2026-04-24-intake-forms-design.md

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    help_text TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('number','radio','checkbox','text','date')),
    options JSONB,
    is_required BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
    title_snapshot TEXT NOT NULL,
    description_snapshot TEXT,
    questions_snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_questionnaire_id UUID NOT NULL REFERENCES public.client_questionnaires(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    answer JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (client_questionnaire_id, question_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_qtemplates_therapist_published ON public.questionnaire_templates(therapist_id, is_published);
CREATE INDEX IF NOT EXISTS idx_qquestions_template_position   ON public.questionnaire_questions(template_id, position);
CREATE INDEX IF NOT EXISTS idx_cqs_client_status              ON public.client_questionnaires(client_id, status);
CREATE INDEX IF NOT EXISTS idx_cqs_therapist_status           ON public.client_questionnaires(therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_qresponses_cq                  ON public.questionnaire_responses(client_questionnaire_id);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.questionnaire_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_questionnaires    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses  ENABLE ROW LEVEL SECURITY;

-- templates: only the owning therapist (+ admin)
CREATE POLICY qt_select_owner ON public.questionnaire_templates
    FOR SELECT USING (auth.uid() = therapist_id OR public.is_admin_user());
CREATE POLICY qt_all_owner    ON public.questionnaire_templates
    FOR ALL   USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);

-- questions: inherit permission from parent template
CREATE POLICY qq_select_owner ON public.questionnaire_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questionnaire_templates t
            WHERE t.id = questionnaire_questions.template_id
              AND (t.therapist_id = auth.uid() OR public.is_admin_user())
        )
    );
CREATE POLICY qq_all_owner ON public.questionnaire_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.questionnaire_templates t
            WHERE t.id = questionnaire_questions.template_id AND t.therapist_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.questionnaire_templates t
            WHERE t.id = questionnaire_questions.template_id AND t.therapist_id = auth.uid()
        )
    );

-- assignments: both client and therapist may SELECT; only therapist may INSERT/UPDATE/DELETE (except for the
-- status/started/completed bumps which happen via SECURITY DEFINER RPCs callable by the client).
CREATE POLICY cq_select_participant ON public.client_questionnaires
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = therapist_id);
CREATE POLICY cq_insert_therapist   ON public.client_questionnaires
    FOR INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY cq_update_therapist   ON public.client_questionnaires
    FOR UPDATE USING (auth.uid() = therapist_id);
CREATE POLICY cq_delete_therapist   ON public.client_questionnaires
    FOR DELETE USING (auth.uid() = therapist_id);

-- responses: both participants may SELECT; only the client may INSERT/UPDATE (via RPC in practice).
CREATE POLICY qr_select_participant ON public.questionnaire_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_questionnaires cq
            WHERE cq.id = questionnaire_responses.client_questionnaire_id
              AND (cq.client_id = auth.uid() OR cq.therapist_id = auth.uid())
        )
    );
CREATE POLICY qr_write_client ON public.questionnaire_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.client_questionnaires cq
            WHERE cq.id = questionnaire_responses.client_questionnaire_id AND cq.client_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.client_questionnaires cq
            WHERE cq.id = questionnaire_responses.client_questionnaire_id AND cq.client_id = auth.uid()
        )
    );
