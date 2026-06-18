-- Intake Forms — RPCs. Snapshot on assign, draft+resume on fill-out, required validation on submit.

-- assign_questionnaire: snapshot template into a new client_questionnaires row.
CREATE OR REPLACE FUNCTION public.assign_questionnaire(
    p_template_id UUID,
    p_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_therapist_id UUID := auth.uid();
    v_template RECORD;
    v_questions_json JSONB;
    v_new_id UUID;
BEGIN
    -- Verify template ownership + published state
    SELECT id, therapist_id, title, description, is_published
      INTO v_template
      FROM public.questionnaire_templates
     WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'template_not_found';
    END IF;
    IF v_template.therapist_id <> v_therapist_id THEN
        RAISE EXCEPTION 'not_template_owner';
    END IF;
    IF v_template.is_published = false THEN
        RAISE EXCEPTION 'template_not_published';
    END IF;

    -- Verify therapist–client relationship (active)
    IF NOT EXISTS (
        SELECT 1 FROM public.client_therapist_relationships
        WHERE therapist_id = v_therapist_id AND client_id = p_client_id AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'no_client_relationship';
    END IF;

    -- Build snapshot
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id',            q.id::text,
            'question_text', q.question_text,
            'help_text',     q.help_text,
            'question_type', q.question_type,
            'options',       q.options,
            'is_required',   q.is_required,
            'position',      q.position,
            'config',        q.config
        ) ORDER BY q.position, q.created_at
    ), '[]'::jsonb)
      INTO v_questions_json
      FROM public.questionnaire_questions q
     WHERE q.template_id = p_template_id;

    INSERT INTO public.client_questionnaires
        (client_id, therapist_id, template_id, title_snapshot, description_snapshot, questions_snapshot)
    VALUES
        (p_client_id, v_therapist_id, p_template_id, v_template.title, v_template.description, v_questions_json)
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

-- upsert_questionnaire_response: write or update a single answer. Client only.
CREATE OR REPLACE FUNCTION public.upsert_questionnaire_response(
    p_assignment_id UUID,
    p_question_id TEXT,
    p_answer JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cq RECORD;
    v_question_exists BOOLEAN;
BEGIN
    SELECT id, client_id, status, questions_snapshot
      INTO v_cq
      FROM public.client_questionnaires
     WHERE id = p_assignment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'assignment_not_found';
    END IF;
    IF v_cq.client_id <> auth.uid() THEN
        RAISE EXCEPTION 'not_assignment_owner';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_cq.questions_snapshot) elem
        WHERE elem->>'id' = p_question_id
    ) INTO v_question_exists;
    IF NOT v_question_exists THEN
        RAISE EXCEPTION 'unknown_question_id';
    END IF;

    INSERT INTO public.questionnaire_responses (client_questionnaire_id, question_id, answer)
    VALUES (p_assignment_id, p_question_id, p_answer)
    ON CONFLICT (client_questionnaire_id, question_id) DO UPDATE
        SET answer = EXCLUDED.answer, updated_at = now();

    -- Bump status to in_progress on first write
    IF v_cq.status = 'not_started' THEN
        UPDATE public.client_questionnaires
           SET status = 'in_progress', started_at = now(), updated_at = now()
         WHERE id = p_assignment_id;
    ELSIF v_cq.status = 'completed' THEN
        UPDATE public.client_questionnaires
           SET status = 'in_progress', updated_at = now()
         WHERE id = p_assignment_id;
    END IF;
END;
$$;

-- submit_questionnaire: validate required answers, mark completed.
CREATE OR REPLACE FUNCTION public.submit_questionnaire(p_assignment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cq RECORD;
    v_missing TEXT[];
BEGIN
    SELECT id, client_id, questions_snapshot
      INTO v_cq
      FROM public.client_questionnaires
     WHERE id = p_assignment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'assignment_not_found';
    END IF;
    IF v_cq.client_id <> auth.uid() THEN
        RAISE EXCEPTION 'not_assignment_owner';
    END IF;

    SELECT COALESCE(array_agg(elem->>'id'), '{}')
      INTO v_missing
      FROM jsonb_array_elements(v_cq.questions_snapshot) elem
     WHERE (elem->>'is_required')::boolean = true
       AND NOT EXISTS (
            SELECT 1 FROM public.questionnaire_responses r
            WHERE r.client_questionnaire_id = p_assignment_id
              AND r.question_id = elem->>'id'
       );

    IF array_length(v_missing, 1) IS NOT NULL THEN
        RAISE EXCEPTION 'missing_required_answers: %', array_to_string(v_missing, ',');
    END IF;

    UPDATE public.client_questionnaires
       SET status = 'completed', completed_at = now(), updated_at = now()
     WHERE id = p_assignment_id;
END;
$$;

-- Allow authenticated users to call the RPCs; SECURITY DEFINER enforces ownership.
GRANT EXECUTE ON FUNCTION public.assign_questionnaire(UUID, UUID)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_questionnaire_response(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_questionnaire(UUID)                       TO authenticated;
