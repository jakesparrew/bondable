# Intake Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 of the Intake Forms feature — therapist-built reusable questionnaire templates, assigned to clients as frozen snapshots, filled out with draft+resume, responses visible on the client profile.

**Architecture:** 4 new Postgres tables + RLS + 3 SECURITY-DEFINER RPCs. Provider template library and builder under Settings. Client-side intake list at a new `/dashboard/client/intake` route. Inline-card builder UI (Google Forms style) with auto-save. Assignments are immutable snapshots in JSONB — later template edits never touch already-assigned forms.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui + React Query + Supabase (Postgres, RLS, RPCs) + Capacitor (iOS/Android shell, unchanged).

**Design spec:** [docs/superpowers/specs/2026-04-24-intake-forms-design.md](../specs/2026-04-24-intake-forms-design.md) — read it first.

**Verification approach:** This project has no test framework configured. Each task verifies via (a) SQL queries against the remote DB for backend work, and (b) `preview_screenshot` / `preview_console_logs` against the Vite dev server for frontend. If the project later adopts Vitest/Playwright, backfill test files per task.

---

## File Structure

**Created files:**
- `supabase/migrations/20260424010000_intake_forms_schema.sql` — 4 tables + indexes + RLS
- `supabase/migrations/20260424010001_intake_forms_rpcs.sql` — `assign_questionnaire`, `upsert_questionnaire_response`, `submit_questionnaire`
- `src/types/intake.ts` — shared TS types for templates / questions / assignments / answers
- `src/services/api/intakeService.ts` — Supabase client wrapper for intake CRUD + RPC calls
- `src/hooks/api/useIntakeTemplates.ts` — React Query hooks for templates + questions
- `src/hooks/api/useIntakeAssignments.ts` — React Query hooks for assignments + responses
- `src/pages/IntakeTemplates.tsx` — therapist template library
- `src/pages/IntakeTemplateBuilder.tsx` — therapist builder page
- `src/pages/ClientIntake.tsx` — client's intake list + fill-out
- `src/components/intake/QuestionCard.tsx` — builder single-question card (collapsed + expanded)
- `src/components/intake/QuestionTypePicker.tsx` — popover for "+ Add question" type choice
- `src/components/intake/QuestionEditor.tsx` — per-type editor body inside the expanded card
- `src/components/intake/QuestionInput.tsx` — per-type client-side input renderer
- `src/components/intake/IntakeFormRenderer.tsx` — renders a snapshot for fill-out + read-only
- `src/components/intake/AssignTemplateDialog.tsx` — modal listing therapist's published templates
- `src/components/intake/ClientIntakeTab.tsx` — "Intake" tab content on therapist's ClientProfile
- `src/components/intake/IntakePendingBanner.tsx` — dashboard banner for pending forms
- `src/locales/en/intake.json` / `src/locales/es/intake.json` / `src/locales/fr/intake.json` — i18n copy

**Modified files:**
- `src/App.tsx` — add 3 routes
- `src/integrations/supabase/types.ts` — regenerated after migrations
- `src/pages/ClientProfile.tsx` — add "Intake" tab
- `src/pages/ClientDashboard.tsx` — mount `IntakePendingBanner` at the top
- `src/hooks/api/useOptimizedSidebar.ts` — add "Intake Forms" under therapist Settings; add "Intake" to client navMain
- `src/i18n.ts` — register the new `intake` namespace

---

## Task 1: Database schema migration

**Files:**
- Create: `supabase/migrations/20260424010000_intake_forms_schema.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260424010000_intake_forms_schema.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

Run:
```bash
yes | npx --yes supabase db push -p '<DB_PASSWORD>'
```

Expected output ends with: `Applying migration 20260424010000_intake_forms_schema.sql...` then `Finished supabase db push.` (no errors).

- [ ] **Step 3: Verify schema via REST**

```bash
curl -s "https://cvoilvhdqczdhpijutyt.supabase.co/rest/v1/questionnaire_templates?select=id&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```

Expected: `[]` (empty array, proves table exists and is reachable).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260424010000_intake_forms_schema.sql
git commit -m "Intake: schema + RLS for templates, questions, assignments, responses"
```

---

## Task 2: RPC migration

**Files:**
- Create: `supabase/migrations/20260424010001_intake_forms_rpcs.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260424010001_intake_forms_rpcs.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration**

```bash
yes | npx --yes supabase db push -p '<DB_PASSWORD>'
```

Expected: `Applying migration 20260424010001_intake_forms_rpcs.sql...` then `Finished supabase db push.`

- [ ] **Step 3: Smoke-test each RPC via REST**

```bash
# Using dev-therapist (signed in via app to get a JWT, or skip and rely on app testing)
curl -s -X POST "https://cvoilvhdqczdhpijutyt.supabase.co/rest/v1/rpc/assign_questionnaire" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"p_template_id":"00000000-0000-0000-0000-000000000000","p_client_id":"00000000-0000-0000-0000-000000000000"}'
```

Expected: 400 with `{"code":"P0001","message":"template_not_found"}` (proves RPC is callable and parameter-validated). The other RPCs are tested end-to-end in later tasks.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260424010001_intake_forms_rpcs.sql
git commit -m "Intake: RPCs for assign, upsert response, submit"
```

---

## Task 3: Regenerate Supabase TypeScript types + add local types

**Files:**
- Modify: `src/integrations/supabase/types.ts` (regenerate)
- Create: `src/types/intake.ts`

- [ ] **Step 1: Regenerate Supabase types**

```bash
npx --yes supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Expected: no stdout errors. `types.ts` now contains new entries for `questionnaire_templates`, `questionnaire_questions`, `client_questionnaires`, `questionnaire_responses` and the three new functions.

Verify:
```bash
grep -c "questionnaire_templates" src/integrations/supabase/types.ts
```
Expected: ≥ 3.

- [ ] **Step 2: Create `src/types/intake.ts`**

```ts
import type { Database } from "@/integrations/supabase/types";

export type QuestionType = "number" | "radio" | "checkbox" | "text" | "date";

export type QuestionnaireStatus = "not_started" | "in_progress" | "completed";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface QuestionConfig {
  min?: number;
  max?: number;
}

export type TemplateRow    = Database["public"]["Tables"]["questionnaire_templates"]["Row"];
export type QuestionRow    = Database["public"]["Tables"]["questionnaire_questions"]["Row"];
export type AssignmentRow  = Database["public"]["Tables"]["client_questionnaires"]["Row"];
export type ResponseRow    = Database["public"]["Tables"]["questionnaire_responses"]["Row"];

export interface SnapshotQuestion {
  id: string;
  question_text: string;
  help_text: string | null;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  is_required: boolean;
  position: number;
  config: QuestionConfig | null;
}

export type Answer =
  | { value: number }
  | { value: string }
  | { optionId: string }
  | { optionIds: string[] };

export interface AssignmentWithResponses extends AssignmentRow {
  questions_snapshot: SnapshotQuestion[];
  responses: Record<string, Answer>;
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: exit 0. If errors reference other existing files, scope this task's verification to no NEW type errors introduced (compare count to baseline).

- [ ] **Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts src/types/intake.ts
git commit -m "Intake: regenerate Supabase types + add domain type helpers"
```

---

## Task 4: Service layer + React Query hooks

**Files:**
- Create: `src/services/api/intakeService.ts`
- Create: `src/hooks/api/useIntakeTemplates.ts`
- Create: `src/hooks/api/useIntakeAssignments.ts`

- [ ] **Step 1: Create `src/services/api/intakeService.ts`**

```ts
import { supabase } from "@/integrations/supabase/client";
import type {
  TemplateRow,
  QuestionRow,
  AssignmentRow,
  ResponseRow,
  SnapshotQuestion,
  Answer,
  QuestionType,
  QuestionOption,
  QuestionConfig,
} from "@/types/intake";

export const intakeService = {
  // ---- Templates ---------------------------------------------------------
  async listTemplates(therapistId: string): Promise<TemplateRow[]> {
    const { data, error } = await supabase
      .from("questionnaire_templates")
      .select("*")
      .eq("therapist_id", therapistId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getTemplate(id: string): Promise<TemplateRow | null> {
    const { data, error } = await supabase
      .from("questionnaire_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createTemplate(input: {
    therapist_id: string;
    title: string;
    description?: string | null;
    category?: string | null;
  }): Promise<TemplateRow> {
    const { data, error } = await supabase
      .from("questionnaire_templates")
      .insert({ ...input, is_published: false })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTemplate(id: string, patch: Partial<Pick<TemplateRow, "title" | "description" | "category" | "is_published">>): Promise<TemplateRow> {
    const { data, error } = await supabase
      .from("questionnaire_templates")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from("questionnaire_templates").delete().eq("id", id);
    if (error) throw error;
  },

  // ---- Questions ---------------------------------------------------------
  async listQuestions(templateId: string): Promise<QuestionRow[]> {
    const { data, error } = await supabase
      .from("questionnaire_questions")
      .select("*")
      .eq("template_id", templateId)
      .order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async createQuestion(input: {
    template_id: string;
    question_text: string;
    question_type: QuestionType;
    position: number;
    is_required?: boolean;
    help_text?: string | null;
    options?: QuestionOption[] | null;
    config?: QuestionConfig | null;
  }): Promise<QuestionRow> {
    const { data, error } = await supabase
      .from("questionnaire_questions")
      .insert({ is_required: false, ...input })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateQuestion(id: string, patch: Partial<QuestionRow>): Promise<QuestionRow> {
    const { data, error } = await supabase
      .from("questionnaire_questions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteQuestion(id: string): Promise<void> {
    const { error } = await supabase.from("questionnaire_questions").delete().eq("id", id);
    if (error) throw error;
  },

  async reorderQuestions(updates: { id: string; position: number }[]): Promise<void> {
    // Sequential updates; small N, no need for transaction wrapper.
    for (const u of updates) {
      const { error } = await supabase
        .from("questionnaire_questions")
        .update({ position: u.position, updated_at: new Date().toISOString() })
        .eq("id", u.id);
      if (error) throw error;
    }
  },

  // ---- Assignments -------------------------------------------------------
  async assignTemplate(templateId: string, clientId: string): Promise<string> {
    const { data, error } = await supabase.rpc("assign_questionnaire", {
      p_template_id: templateId,
      p_client_id: clientId,
    });
    if (error) throw error;
    return data as unknown as string;
  },

  async listAssignmentsForClient(clientId: string): Promise<AssignmentRow[]> {
    const { data, error } = await supabase
      .from("client_questionnaires")
      .select("*")
      .eq("client_id", clientId)
      .order("assigned_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listAssignmentsForSelf(): Promise<AssignmentRow[]> {
    // RLS limits to own rows where auth.uid() = client_id
    const { data, error } = await supabase
      .from("client_questionnaires")
      .select("*")
      .order("assigned_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getAssignment(id: string): Promise<AssignmentRow | null> {
    const { data, error } = await supabase
      .from("client_questionnaires")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteAssignment(id: string): Promise<void> {
    const { error } = await supabase.from("client_questionnaires").delete().eq("id", id);
    if (error) throw error;
  },

  // ---- Responses ---------------------------------------------------------
  async listResponses(assignmentId: string): Promise<ResponseRow[]> {
    const { data, error } = await supabase
      .from("questionnaire_responses")
      .select("*")
      .eq("client_questionnaire_id", assignmentId);
    if (error) throw error;
    return data ?? [];
  },

  async upsertResponse(assignmentId: string, questionId: string, answer: Answer): Promise<void> {
    const { error } = await supabase.rpc("upsert_questionnaire_response", {
      p_assignment_id: assignmentId,
      p_question_id: questionId,
      p_answer: answer as any,
    });
    if (error) throw error;
  },

  async submit(assignmentId: string): Promise<void> {
    const { error } = await supabase.rpc("submit_questionnaire", { p_assignment_id: assignmentId });
    if (error) throw error;
  },
};
```

- [ ] **Step 2: Create `src/hooks/api/useIntakeTemplates.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intakeService } from "@/services/api/intakeService";
import type { TemplateRow } from "@/types/intake";

const keys = {
  list:   (therapistId: string)      => ["intake", "templates", therapistId] as const,
  one:    (id: string)               => ["intake", "template", id] as const,
  questions: (templateId: string)    => ["intake", "template", templateId, "questions"] as const,
};

export function useIntakeTemplates(therapistId: string) {
  return useQuery({
    queryKey: keys.list(therapistId),
    queryFn: () => intakeService.listTemplates(therapistId),
    enabled: !!therapistId,
  });
}

export function useIntakeTemplate(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: () => intakeService.getTemplate(id),
    enabled: !!id,
  });
}

export function useIntakeQuestions(templateId: string) {
  return useQuery({
    queryKey: keys.questions(templateId),
    queryFn: () => intakeService.listQuestions(templateId),
    enabled: !!templateId,
  });
}

export function useCreateTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; description?: string; category?: string }) =>
      intakeService.createTemplate({ therapist_id: therapistId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(therapistId) }),
  });
}

export function useUpdateTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<TemplateRow, "title" | "description" | "category" | "is_published">> }) =>
      intakeService.updateTemplate(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: keys.one(row.id) });
      qc.invalidateQueries({ queryKey: keys.list(therapistId) });
    },
  });
}

export function useDeleteTemplate(therapistId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => intakeService.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list(therapistId) }),
  });
}

export function useQuestionMutations(templateId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.questions(templateId) });

  const create = useMutation({ mutationFn: intakeService.createQuestion, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof intakeService.updateQuestion>[1] }) =>
      intakeService.updateQuestion(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: intakeService.deleteQuestion, onSuccess: invalidate });
  const reorder = useMutation({
    mutationFn: intakeService.reorderQuestions,
    onSuccess: invalidate,
  });

  return { create, update, remove, reorder };
}
```

- [ ] **Step 3: Create `src/hooks/api/useIntakeAssignments.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intakeService } from "@/services/api/intakeService";
import type { Answer } from "@/types/intake";

const keys = {
  forClient:     (clientId: string)   => ["intake", "assignments", "client", clientId] as const,
  forSelf:       ()                   => ["intake", "assignments", "self"] as const,
  one:           (id: string)         => ["intake", "assignment", id] as const,
  responses:     (id: string)         => ["intake", "assignment", id, "responses"] as const,
};

export function useAssignmentsForClient(clientId: string) {
  return useQuery({
    queryKey: keys.forClient(clientId),
    queryFn: () => intakeService.listAssignmentsForClient(clientId),
    enabled: !!clientId,
  });
}

export function useAssignmentsForSelf() {
  return useQuery({
    queryKey: keys.forSelf(),
    queryFn: () => intakeService.listAssignmentsForSelf(),
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: () => intakeService.getAssignment(id),
    enabled: !!id,
  });
}

export function useAssignmentResponses(id: string) {
  return useQuery({
    queryKey: keys.responses(id),
    queryFn: () => intakeService.listResponses(id),
    enabled: !!id,
  });
}

export function useAssignTemplate(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => intakeService.assignTemplate(templateId, clientId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.forClient(clientId) }),
  });
}

export function useUpsertResponse(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: Answer }) =>
      intakeService.upsertResponse(assignmentId, questionId, answer),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.responses(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.one(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.forSelf() });
    },
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => intakeService.submit(assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.one(assignmentId) });
      qc.invalidateQueries({ queryKey: keys.forSelf() });
    },
  });
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: exit 0 (no new errors).

- [ ] **Step 5: Commit**

```bash
git add src/services/api/intakeService.ts src/hooks/api/useIntakeTemplates.ts src/hooks/api/useIntakeAssignments.ts
git commit -m "Intake: service layer + React Query hooks"
```

---

## Task 5: i18n namespace + translations

**Files:**
- Create: `src/locales/en/intake.json`, `src/locales/es/intake.json`, `src/locales/fr/intake.json`
- Modify: `src/i18n.ts`

- [ ] **Step 1: Find the existing i18n wiring**

```bash
grep -n "resources\|addResourceBundle\|locales" src/i18n.ts
```

- [ ] **Step 2: Create `src/locales/en/intake.json`**

```json
{
  "title": "Intake Forms",
  "new_template": "New template",
  "template_title": "Template title",
  "template_description": "Description (optional)",
  "template_category": "Category (e.g. Adult, Couples)",
  "published": "Published",
  "draft": "Draft",
  "publish": "Publish",
  "unpublish": "Unpublish",
  "delete_template": "Delete template",
  "delete_template_confirm": "Delete this template? Past assigned forms will NOT be affected.",
  "add_question": "Add question",
  "question_text": "Question",
  "help_text": "Help text (optional)",
  "required": "Required",
  "optional": "Optional",
  "type_number": "Number",
  "type_radio": "Single choice",
  "type_checkbox": "Multiple choice",
  "type_text": "Text",
  "type_date": "Date",
  "min": "Min",
  "max": "Max",
  "option_label": "Option",
  "add_option": "Add option",
  "remove_option": "Remove",
  "saved": "Saved",
  "saving": "Saving...",
  "save_failed": "Save failed — retrying",
  "assign_form": "Assign form",
  "assign_to_client": "Assign a form to this client",
  "assigned_at": "Assigned {{date}}",
  "completed_at": "Completed {{date}}",
  "status_not_started": "Not started",
  "status_in_progress": "In progress",
  "status_completed": "Completed",
  "view_answers": "View answers",
  "pending_banner": "You have {{count}} intake form(s) to fill in.",
  "open": "Open",
  "save_and_close": "Save & close",
  "submit": "Submit",
  "submit_missing_required": "Please answer the required questions highlighted above.",
  "no_templates": "No templates yet. Click \"New template\" to build your first intake form.",
  "no_assignments_client_provider": "No forms assigned yet.",
  "no_assignments_client_self": "You have no intake forms to fill in right now.",
  "intake_tab": "Intake"
}
```

- [ ] **Step 3: Create `src/locales/es/intake.json` and `src/locales/fr/intake.json`**

For v1 use English copy as a placeholder — duplicate `en/intake.json` verbatim to both files. Translation to native ES / FR copy is a separate concern (see `src/locales/` for existing translation patterns).

- [ ] **Step 4: Register the namespace in `src/i18n.ts`**

Open `src/i18n.ts` and find the `resources` object (one per locale). For each locale (`en`, `es`, `fr`), add the new namespace entry alongside existing ones:

```ts
import enIntake from "./locales/en/intake.json";
import esIntake from "./locales/es/intake.json";
import frIntake from "./locales/fr/intake.json";

// ... existing resources, add under each locale:
// en: { translation: enCommon, intake: enIntake, ... }
```

If the project uses a single flat `translation` bundle instead of namespaces, merge `intake.json` keys into `translation` under a single-key prefix: `resources.en.translation.intake = enIntake`, and reference strings as `t('intake.title')`. Inspect `src/i18n.ts` first to match the existing pattern.

- [ ] **Step 5: Verify i18n doesn't break at boot**

```bash
# Dev server is already running on port 8080 via preview_start.
# Reload the preview:
```

Call `preview_eval(serverId, "location.reload()")`, then `preview_console_logs(serverId, { level: "error" })`. Expected: no new i18next errors.

- [ ] **Step 6: Commit**

```bash
git add src/locales/en/intake.json src/locales/es/intake.json src/locales/fr/intake.json src/i18n.ts
git commit -m "Intake: i18n namespace + English copy"
```

---

## Task 6: Template library page (list / create / delete)

**Files:**
- Create: `src/pages/IntakeTemplates.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/api/useOptimizedSidebar.ts`

- [ ] **Step 1: Create `src/pages/IntakeTemplates.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplates, useCreateTemplate, useDeleteTemplate } from "@/hooks/api/useIntakeTemplates";
import { format } from "date-fns";

export default function IntakeTemplatesPage() {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useIntakeTemplates(therapistId);
  const createMut = useCreateTemplate(therapistId);
  const deleteMut = useDeleteTemplate(therapistId);

  const [newOpen, setNewOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const onCreate = async () => {
    if (!title.trim()) return;
    const row = await createMut.mutateAsync({ title: title.trim(), description: description.trim() || undefined, category: category.trim() || undefined });
    setNewOpen(false);
    setTitle(""); setDescription(""); setCategory("");
    navigate(`/dashboard/therapist/intake-forms/${row.id}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-white font-semibold">{t("intake:title")}</h1>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-black hover:bg-gray-100">{t("intake:new_template")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("intake:new_template")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder={t("intake:template_title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                <Input placeholder={t("intake:template_category")} value={category} onChange={(e) => setCategory(e.target.value)} />
                <Textarea placeholder={t("intake:template_description")} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={onCreate} disabled={!title.trim() || createMut.isPending}>
                  {createMut.isPending ? t("intake:saving") : t("intake:new_template")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-gray-400">{t("intake:saving")}</p>
        ) : templates.length === 0 ? (
          <Card className="bg-[#111] border-[#1f1f23]">
            <CardContent className="p-8 text-center text-gray-400">{t("intake:no_templates")}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="bg-[#111] border-[#1f1f23] hover:border-[#2a2a2a] cursor-pointer"
                    onClick={() => navigate(`/dashboard/therapist/intake-forms/${tpl.id}`)}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-base">{tpl.title}</CardTitle>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <Badge variant={tpl.is_published ? "default" : "outline"}>
                        {tpl.is_published ? t("intake:published") : t("intake:draft")}
                      </Badge>
                      {tpl.category && <span>· {tpl.category}</span>}
                      <span>· {format(new Date(tpl.updated_at), "PP")}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t("intake:delete_template_confirm"))) deleteMut.mutate(tpl.id);
                  }}>{t("intake:delete_template")}</Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Add route in `src/App.tsx`**

Find the existing therapist routes block (around line 155–195). Add:

```tsx
<Route
  path="/dashboard/therapist/intake-forms"
  element={
    <RouteProtection requiredUserType="therapist">
      <IntakeTemplates />
    </RouteProtection>
  }
/>
```

Add the lazy import at the top of `src/App.tsx` with the other `React.lazy` imports:

```ts
const IntakeTemplates = React.lazy(() => import("@/pages/IntakeTemplates"));
```

- [ ] **Step 3: Add sidebar entry for therapist Settings**

Open `src/hooks/api/useOptimizedSidebar.ts`. Find the therapist `navMain` block (around line 336–406), specifically the `settings` item with `items: [...]`. Add a new sub-item:

```ts
{
  title: t("intake:title"),
  url: `/dashboard/${userType}/intake-forms`,
},
```

Insert it after `application_settings` inside the `items` array of the existing `settings` entry.

- [ ] **Step 4: Manual verify**

Click **Care Provider** quick-login button on the Login page. Navigate to `/dashboard/therapist/intake-forms` directly in browser or via the Settings submenu.

```ts
// Via preview_eval:
(async () => { location.href = "/dashboard/therapist/intake-forms"; return 'navigated'; })()
```

Then `preview_screenshot`. Expected: empty-state card with "No templates yet." and a "New template" button.

Click "New template", fill in a title ("Adult intake"), submit. Expected: navigation to `/dashboard/therapist/intake-forms/<uuid>` (builder — not implemented yet, so NotFound renders; that's OK for this task). `preview_console_logs` shows no errors.

Go back to `/dashboard/therapist/intake-forms`. Expected: the new template is in the list with "Draft" badge.

- [ ] **Step 5: Commit**

```bash
git add src/pages/IntakeTemplates.tsx src/App.tsx src/hooks/api/useOptimizedSidebar.ts
git commit -m "Intake: therapist template library page + route + sidebar entry"
```

---

## Task 7: Template builder — page shell + title/description/category auto-save + publish toggle

**Files:**
- Create: `src/pages/IntakeTemplateBuilder.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/IntakeTemplateBuilder.tsx`**

Place questions section as a TODO comment for Task 8 — builder metadata only at this step.

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplate, useUpdateTemplate } from "@/hooks/api/useIntakeTemplates";

const AUTOSAVE_MS = 500;

export default function IntakeTemplateBuilderPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const { data: tpl, isLoading } = useIntakeTemplate(id);
  const updateMut = useUpdateTemplate(therapistId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load server state into local state
  useEffect(() => {
    if (!tpl) return;
    setTitle(tpl.title);
    setDescription(tpl.description ?? "");
    setCategory(tpl.category ?? "");
    setIsPublished(tpl.is_published);
  }, [tpl?.id]);

  // Debounced auto-save for title/description/category/publish
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const patch = useMemo(() => ({ title, description: description || null, category: category || null, is_published: isPublished }), [title, description, category, isPublished]);

  useEffect(() => {
    if (!tpl) return;
    // Skip initial sync (when local state just loaded from server)
    const unchanged =
      patch.title === tpl.title &&
      (patch.description ?? null) === (tpl.description ?? null) &&
      (patch.category ?? null)    === (tpl.category ?? null) &&
      patch.is_published          === tpl.is_published;
    if (unchanged) return;

    dirtyRef.current = true;
    setSaveState("saving");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await updateMut.mutateAsync({ id, patch });
        dirtyRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timerRef.current);
  }, [patch, tpl?.id, tpl?.title, tpl?.description, tpl?.category, tpl?.is_published]);

  if (isLoading) return <DashboardLayout><p className="p-6 text-gray-400">{t("intake:saving")}</p></DashboardLayout>;
  if (!tpl)     return <DashboardLayout><p className="p-6 text-gray-400">Not found</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/therapist/intake-forms")}>←</Button>
          <span className="text-xs text-gray-400">
            {saveState === "saving" && t("intake:saving")}
            {saveState === "saved"  && `✓ ${t("intake:saved")}`}
            {saveState === "error"  && t("intake:save_failed")}
          </span>
        </div>

        <Card className="bg-[#111] border-[#1f1f23]">
          <CardContent className="p-5 space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("intake:template_title")} />
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("intake:template_category")} />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("intake:template_description")} />
            <div className="flex items-center gap-2">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <span className="text-sm text-gray-300">{isPublished ? t("intake:published") : t("intake:draft")}</span>
            </div>
          </CardContent>
        </Card>

        {/* TODO(Task 8): Question cards + Add question */}
        <div className="text-xs text-gray-500">Questions section in next task.</div>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Add route in `src/App.tsx`**

```tsx
const IntakeTemplateBuilder = React.lazy(() => import("@/pages/IntakeTemplateBuilder"));

// Inside <Routes>:
<Route
  path="/dashboard/therapist/intake-forms/:id"
  element={
    <RouteProtection requiredUserType="therapist">
      <IntakeTemplateBuilder />
    </RouteProtection>
  }
/>
```

- [ ] **Step 3: Manual verify**

Reload the preview. Navigate to `/dashboard/therapist/intake-forms`, click the template created in Task 6. Expected: builder page renders with title, category, description, publish toggle. Edit the title — expected: "Saving..." indicator flashes, then "✓ Saved". Navigate back and see the new title in the list.

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/IntakeTemplateBuilder.tsx src/App.tsx
git commit -m "Intake: template builder shell with auto-save for title/description/category/publish"
```

---

## Task 8: Template builder — question cards + add / delete / reorder

**Files:**
- Create: `src/components/intake/QuestionCard.tsx`
- Create: `src/components/intake/QuestionTypePicker.tsx`
- Modify: `src/pages/IntakeTemplateBuilder.tsx`

- [ ] **Step 1: Create `src/components/intake/QuestionTypePicker.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { QuestionType } from "@/types/intake";

const TYPES: QuestionType[] = ["number", "radio", "checkbox", "text", "date"];

export function QuestionTypePicker({ onPick }: { onPick: (t: QuestionType) => void }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed">+ {t("intake:add_question")}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="flex flex-col">
          {TYPES.map((type) => (
            <Button key={type} variant="ghost" className="justify-start" onClick={() => onPick(type)}>
              {t(`intake:type_${type}`)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Create `src/components/intake/QuestionCard.tsx`** (collapsed + expanded summary only; editor body lives in `QuestionEditor.tsx` in Task 9)

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuestionRow } from "@/types/intake";
import { QuestionEditor } from "@/components/intake/QuestionEditor";

export function QuestionCard({
  q,
  onChange,
  onDelete,
  onMove,
  isFirst,
  isLast,
}: {
  q: QuestionRow;
  onChange: (patch: Partial<QuestionRow>) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Card className="bg-[#141418] border-[#1f1f23]">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-xs">{q.position + 1}.</span>
          <div className="flex-1 text-sm text-gray-200 cursor-pointer truncate" onClick={() => setOpen(!open)}>
            {q.question_text || <span className="text-gray-500">({t("intake:question_text")})</span>}
          </div>
          <Badge variant="outline">{t(`intake:type_${q.question_type}`)}</Badge>
          {q.is_required && <Badge>{t("intake:required")}</Badge>}
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" disabled={isFirst} onClick={() => onMove("up")}>↑</Button>
            <Button size="icon" variant="ghost" disabled={isLast} onClick={() => onMove("down")}>↓</Button>
            <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>{open ? "▾" : "▸"}</Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>✕</Button>
          </div>
        </div>
        {open && (
          <div className="mt-3 border-t border-[#1f1f23] pt-3">
            <QuestionEditor q={q} onChange={onChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

Note: This references `QuestionEditor` which is created in Task 9. That's intentional — Tasks 8 and 9 are intertwined but Task 8 focuses on the card shell and Task 9 on the per-type editor bodies. Running `tsc` at the end of Task 8 will fail with a missing module error until Task 9 is done; that's expected and called out in Step 6.

- [ ] **Step 3: Extend `IntakeTemplateBuilder.tsx` with a questions block**

Remove the `{/* TODO(Task 8) */}` stub. Add imports and a new section rendering the question list. Place the full replacement below, but **keep the existing title/description/category auto-save block** unchanged above it:

```tsx
// Add imports at the top:
import { useIntakeQuestions, useQuestionMutations } from "@/hooks/api/useIntakeTemplates";
import { QuestionCard } from "@/components/intake/QuestionCard";
import { QuestionTypePicker } from "@/components/intake/QuestionTypePicker";
import type { QuestionType } from "@/types/intake";

// Inside the component, after the existing useUpdateTemplate setup:
const { data: questions = [] } = useIntakeQuestions(id);
const qmut = useQuestionMutations(id);

const addQuestion = async (type: QuestionType) => {
  await qmut.create.mutateAsync({
    template_id: id,
    question_text: "",
    question_type: type,
    position: questions.length,
    is_required: false,
    options: type === "radio" || type === "checkbox" ? [{ id: crypto.randomUUID(), label: "Option 1" }] : null,
    config: type === "number" ? { min: 0, max: 100 } : null,
  });
};

const updateQuestion = (qid: string, patch: any) => qmut.update.mutateAsync({ id: qid, patch });
const deleteQuestion = (qid: string) => qmut.remove.mutateAsync(qid);

const moveQuestion = async (qid: string, dir: "up" | "down") => {
  const idx = questions.findIndex(q => q.id === qid);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= questions.length) return;
  const a = questions[idx], b = questions[swap];
  await qmut.reorder.mutateAsync([
    { id: a.id, position: b.position },
    { id: b.id, position: a.position },
  ]);
};
```

And replace the TODO section with:

```tsx
<div className="space-y-2">
  {questions.map((q, i) => (
    <QuestionCard
      key={q.id}
      q={q}
      onChange={(patch) => updateQuestion(q.id, patch)}
      onDelete={() => deleteQuestion(q.id)}
      onMove={(dir) => moveQuestion(q.id, dir)}
      isFirst={i === 0}
      isLast={i === questions.length - 1}
    />
  ))}
  <div className="pt-2">
    <QuestionTypePicker onPick={addQuestion} />
  </div>
</div>
```

- [ ] **Step 4: Create placeholder `QuestionEditor.tsx` so the project compiles before Task 9**

Create `src/components/intake/QuestionEditor.tsx` with a stub to satisfy the import:

```tsx
import type { QuestionRow } from "@/types/intake";
import { Input } from "@/components/ui/input";

export function QuestionEditor({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  return (
    <div>
      <Input value={q.question_text} onChange={(e) => onChange({ question_text: e.target.value })} placeholder="Question text" />
      <div className="text-xs text-gray-500 mt-2">(Per-type options/config added in Task 9.)</div>
    </div>
  );
}
```

- [ ] **Step 5: Manual verify**

Reload the preview, open the builder page. Expected: "+ Add question" button at bottom. Click it → popover lists 5 types → pick "Text". Expected: a new card appears with empty question text, type badge "Text", up/down/collapse/delete buttons. Expand → edit text → collapse → text shows in the collapsed view. Add a second question, click the ↑ / ↓ buttons — expected: order updates. Delete a question — expected: disappears.

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/intake/QuestionCard.tsx src/components/intake/QuestionTypePicker.tsx src/components/intake/QuestionEditor.tsx src/pages/IntakeTemplateBuilder.tsx
git commit -m "Intake: question cards, type picker, add/delete/reorder"
```

---

## Task 9: Per-type question editors (Number, Radio, Checkbox, Text, Date)

**Files:**
- Modify: `src/components/intake/QuestionEditor.tsx`

- [ ] **Step 1: Replace `QuestionEditor.tsx` with the full per-type editor**

```tsx
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { QuestionRow, QuestionOption, QuestionConfig, QuestionType } from "@/types/intake";

export function QuestionEditor({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();

  const setText     = (v: string) => onChange({ question_text: v });
  const setHelp     = (v: string) => onChange({ help_text: v || null });
  const setRequired = (b: boolean) => onChange({ is_required: b });

  return (
    <div className="space-y-3">
      <Input value={q.question_text}            onChange={(e) => setText(e.target.value)}    placeholder={t("intake:question_text")} />
      <Textarea value={q.help_text ?? ""}       onChange={(e) => setHelp(e.target.value)}    placeholder={t("intake:help_text")} />
      <div className="flex items-center gap-2">
        <Switch checked={q.is_required} onCheckedChange={setRequired} />
        <span className="text-xs text-gray-300">{t("intake:required")}</span>
      </div>

      {q.question_type === "number"   && <NumberConfig q={q} onChange={onChange} />}
      {q.question_type === "radio"    && <OptionsConfig q={q} onChange={onChange} />}
      {q.question_type === "checkbox" && <OptionsConfig q={q} onChange={onChange} />}
      {/* text and date need no extra config in v1 */}
    </div>
  );
}

function NumberConfig({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();
  const cfg = (q.config as QuestionConfig | null) ?? {};
  const set = (patch: Partial<QuestionConfig>) => onChange({ config: { ...cfg, ...patch } as any });

  return (
    <div className="flex gap-2">
      <Input type="number" value={cfg.min ?? ""} onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={t("intake:min")} />
      <Input type="number" value={cfg.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={t("intake:max")} />
    </div>
  );
}

function OptionsConfig({ q, onChange }: { q: QuestionRow; onChange: (patch: Partial<QuestionRow>) => void }) {
  const { t } = useTranslation();
  const options = (q.options as QuestionOption[] | null) ?? [];

  const setLabel = (i: number, label: string) => {
    const next = options.slice();
    next[i] = { ...next[i], label };
    onChange({ options: next as any });
  };
  const add = () => onChange({ options: [...options, { id: crypto.randomUUID(), label: t("intake:option_label") + ` ${options.length + 1}` }] as any });
  const remove = (i: number) => onChange({ options: options.filter((_, idx) => idx !== i) as any });

  return (
    <div className="space-y-2">
      {options.map((o, i) => (
        <div key={o.id} className="flex gap-2">
          <Input value={o.label} onChange={(e) => setLabel(i, e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => remove(i)}>{t("intake:remove_option")}</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>+ {t("intake:add_option")}</Button>
    </div>
  );
}
```

- [ ] **Step 2: Debounce `onChange` calls at the builder level to prevent one-keystroke-per-request spam**

In `IntakeTemplateBuilder.tsx`, replace the raw `updateQuestion` with a debounced version (250 ms). Use a per-question pending-patch map:

```tsx
import { useRef } from "react";
// Inside the component:
const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
const pendingRef = useRef<Record<string, any>>({});

const updateQuestion = (qid: string, patch: Partial<QuestionRow>) => {
  pendingRef.current[qid] = { ...(pendingRef.current[qid] ?? {}), ...patch };
  clearTimeout(debounceRef.current[qid]);
  debounceRef.current[qid] = setTimeout(async () => {
    const merged = pendingRef.current[qid];
    delete pendingRef.current[qid];
    await qmut.update.mutateAsync({ id: qid, patch: merged });
  }, 250);
};
```

Add `import type { QuestionRow } from "@/types/intake";` at the top if not already present.

- [ ] **Step 3: Manual verify**

Reload preview. In the builder, add one question of each type. Verify:
- **Number:** min/max inputs accept integers.
- **Radio / Checkbox:** "+ Add option" appends rows; "Remove" deletes; labels save.
- **Text / Date:** no extra config visible; required toggle works.

Collapse and re-expand each question — expected: values persisted.

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/intake/QuestionEditor.tsx src/pages/IntakeTemplateBuilder.tsx
git commit -m "Intake: per-type question editors + debounced auto-save"
```

---

## Task 10: Assign dialog + "Intake" tab on therapist's ClientProfile

**Files:**
- Create: `src/components/intake/AssignTemplateDialog.tsx`
- Create: `src/components/intake/ClientIntakeTab.tsx`
- Create: `src/components/intake/IntakeFormRenderer.tsx`
- Modify: `src/pages/ClientProfile.tsx`

- [ ] **Step 1: Create `src/components/intake/AssignTemplateDialog.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthManager } from "@/hooks/api/useAuthManager";
import { useIntakeTemplates } from "@/hooks/api/useIntakeTemplates";
import { useAssignTemplate } from "@/hooks/api/useIntakeAssignments";

export function AssignTemplateDialog({ clientId, open, onOpenChange }: { clientId: string; open: boolean; onOpenChange: (b: boolean) => void }) {
  const { t } = useTranslation();
  const { user } = useAuthManager();
  const therapistId = user?.id ?? "";
  const { data: templates = [] } = useIntakeTemplates(therapistId);
  const published = templates.filter((tpl) => tpl.is_published);
  const assignMut = useAssignTemplate(clientId);
  const [selected, setSelected] = useState<string | null>(null);

  const onAssign = async () => {
    if (!selected) return;
    await assignMut.mutateAsync(selected);
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("intake:assign_to_client")}</DialogTitle></DialogHeader>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {published.length === 0 ? (
            <p className="text-sm text-gray-400">{t("intake:no_templates")}</p>
          ) : published.map((tpl) => (
            <button key={tpl.id}
              className={`w-full text-left p-3 rounded border ${selected === tpl.id ? "border-white" : "border-[#1f1f23]"} hover:border-[#2a2a2a]`}
              onClick={() => setSelected(tpl.id)}>
              <div className="text-sm text-white">{tpl.title}</div>
              {tpl.category && <div className="text-xs text-gray-400">{tpl.category}</div>}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!selected || assignMut.isPending} onClick={onAssign}>
            {assignMut.isPending ? t("intake:saving") : t("intake:assign_form")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `src/components/intake/IntakeFormRenderer.tsx`** (read-only rendering used by the therapist-side "View answers")

```tsx
import { useTranslation } from "react-i18next";
import type { SnapshotQuestion, Answer, QuestionOption } from "@/types/intake";

export function IntakeFormRenderer({
  snapshot, responses,
}: { snapshot: SnapshotQuestion[]; responses: Record<string, Answer> }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {snapshot.map((q) => {
        const ans = responses[q.id];
        return (
          <div key={q.id} className="border border-[#1f1f23] rounded p-3">
            <div className="text-sm text-white mb-1">{q.question_text}{q.is_required && " *"}</div>
            {q.help_text && <div className="text-xs text-gray-500 mb-2">{q.help_text}</div>}
            <div className="text-sm text-gray-300">
              {!ans ? <span className="text-gray-600">—</span>
                : q.question_type === "number"   ? (ans as any).value
                : q.question_type === "text"     ? (ans as any).value
                : q.question_type === "date"     ? (ans as any).value
                : q.question_type === "radio"    ? q.options?.find((o) => o.id === (ans as any).optionId)?.label ?? "—"
                : q.question_type === "checkbox" ? (((ans as any).optionIds ?? []) as string[]).map((id) => q.options?.find((o: QuestionOption) => o.id === id)?.label).filter(Boolean).join(", ") || "—"
                : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/intake/ClientIntakeTab.tsx`** (therapist's view)

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { AssignTemplateDialog } from "@/components/intake/AssignTemplateDialog";
import { IntakeFormRenderer } from "@/components/intake/IntakeFormRenderer";
import {
  useAssignmentsForClient,
  useAssignment,
  useAssignmentResponses,
} from "@/hooks/api/useIntakeAssignments";
import type { Answer, SnapshotQuestion } from "@/types/intake";

export function ClientIntakeTab({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const { data: assignments = [] } = useAssignmentsForClient(clientId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setAssignOpen(true)}>{t("intake:assign_form")}</Button>
      </div>

      {assignments.length === 0 ? (
        <Card className="bg-[#111] border-[#1f1f23]"><CardContent className="p-6 text-center text-gray-400">{t("intake:no_assignments_client_provider")}</CardContent></Card>
      ) : assignments.map((a) => (
        <Card key={a.id} className="bg-[#111] border-[#1f1f23]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-white">{a.title_snapshot}</div>
              <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                <Badge>{t(`intake:status_${a.status}`)}</Badge>
                <span>{t("intake:assigned_at", { date: format(new Date(a.assigned_at), "PP") })}</span>
                {a.completed_at && <span>· {t("intake:completed_at", { date: format(new Date(a.completed_at), "PP") })}</span>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewingId(a.id)}>{t("intake:view_answers")}</Button>
          </CardContent>
        </Card>
      ))}

      <AssignTemplateDialog clientId={clientId} open={assignOpen} onOpenChange={setAssignOpen} />
      {viewingId && <AnswersModal assignmentId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

function AnswersModal({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: a } = useAssignment(assignmentId);
  const { data: responseRows = [] } = useAssignmentResponses(assignmentId);

  const responses: Record<string, Answer> = {};
  for (const r of responseRows) responses[r.question_id] = r.answer as Answer;

  const snapshot = (a?.questions_snapshot as unknown as SnapshotQuestion[]) ?? [];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("intake:view_answers")}</DialogTitle></DialogHeader>
        {a ? <IntakeFormRenderer snapshot={snapshot} responses={responses} /> : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Add "Intake" tab to `src/pages/ClientProfile.tsx`**

Find the existing `<Tabs>` block (around line 669 per earlier grep). Add a new `TabsTrigger` and `TabsContent`:

```tsx
// Inside <TabsList>:
<TabsTrigger value="intake" className="text-neutral-400 data-[state=active]:text-neutral-950 data-[state=active]:bg-neutral-50 hover:bg-neutral-800 hover:text-neutral-300">
  {t("intake:intake_tab")}
</TabsTrigger>

// After the existing TabsContent blocks:
<TabsContent value="intake">
  <ClientIntakeTab clientId={clientIdFromRoute /* existing variable in this file */} />
</TabsContent>
```

Add the import at the top:
```ts
import { ClientIntakeTab } from "@/components/intake/ClientIntakeTab";
```

When editing, first grep the file for the actual route-param variable name: `grep -n "clientId\|:clientId\|useParams" src/pages/ClientProfile.tsx` — use whatever holds the client UUID.

- [ ] **Step 5: Manual verify**

Sign in as Care Provider. Go to Clients → pick any client (or Dev Client). Expected: "Intake" tab visible alongside Sessions/Journals/Tasks. Click it → "Assign form" button + empty state. Click "Assign form" → dialog lists published templates. Pick one → dialog closes → new row appears with status "Not started".

Click "View answers" → modal opens, shows each question with "—" (no answers yet). Close modal.

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/intake/AssignTemplateDialog.tsx src/components/intake/IntakeFormRenderer.tsx src/components/intake/ClientIntakeTab.tsx src/pages/ClientProfile.tsx
git commit -m "Intake: provider Intake tab, assign dialog, answers viewer"
```

---

## Task 11: Client `/intake` route + assignments list + fill-out view

**Files:**
- Create: `src/components/intake/QuestionInput.tsx`
- Create: `src/pages/ClientIntake.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/api/useOptimizedSidebar.ts`

- [ ] **Step 1: Create `src/components/intake/QuestionInput.tsx`** (per-type input rendering for client fill-out)

```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SnapshotQuestion, Answer } from "@/types/intake";

export function QuestionInput({
  q, value, onChange, invalid,
}: { q: SnapshotQuestion; value: Answer | undefined; onChange: (a: Answer) => void; invalid?: boolean }) {
  const ringClass = invalid ? "ring-1 ring-red-500" : "";

  if (q.question_type === "text") {
    const v = (value as any)?.value ?? "";
    return <Textarea value={v} onChange={(e) => onChange({ value: e.target.value })} className={ringClass} />;
  }
  if (q.question_type === "number") {
    const v = (value as any)?.value ?? "";
    const min = q.config?.min, max = q.config?.max;
    return <Input type="number" min={min} max={max} value={v} onChange={(e) => onChange({ value: Number(e.target.value) })} className={ringClass} />;
  }
  if (q.question_type === "date") {
    const v = (value as any)?.value ?? "";
    return <Input type="date" value={v} onChange={(e) => onChange({ value: e.target.value })} className={ringClass} />;
  }
  if (q.question_type === "radio") {
    const v = (value as any)?.optionId ?? "";
    return (
      <RadioGroup value={v} onValueChange={(val) => onChange({ optionId: val })}>
        {(q.options ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <RadioGroupItem value={o.id} id={`${q.id}-${o.id}`} />
            <label htmlFor={`${q.id}-${o.id}`} className="text-sm text-gray-200">{o.label}</label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (q.question_type === "checkbox") {
    const ids: string[] = (value as any)?.optionIds ?? [];
    const toggle = (oid: string) => {
      const next = ids.includes(oid) ? ids.filter((x) => x !== oid) : [...ids, oid];
      onChange({ optionIds: next });
    };
    return (
      <div className="space-y-1">
        {(q.options ?? []).map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Checkbox checked={ids.includes(o.id)} onCheckedChange={() => toggle(o.id)} id={`${q.id}-${o.id}`} />
            <label htmlFor={`${q.id}-${o.id}`} className="text-sm text-gray-200">{o.label}</label>
          </div>
        ))}
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 2: Create `src/pages/ClientIntake.tsx`** (list + fill-out in one page, toggled by `?id=` query param)

```tsx
import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { QuestionInput } from "@/components/intake/QuestionInput";
import {
  useAssignmentsForSelf,
  useAssignment,
  useAssignmentResponses,
  useUpsertResponse,
  useSubmitAssignment,
} from "@/hooks/api/useIntakeAssignments";
import type { Answer, SnapshotQuestion } from "@/types/intake";

export default function ClientIntakePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id");
  return id ? <FillOut id={id} /> : <IntakeList onOpen={(aid) => setSearchParams({ id: aid })} />;
}

function IntakeList({ onOpen }: { onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  const { data: assignments = [] } = useAssignmentsForSelf();
  return (
    <DashboardLayout>
      <div className="p-6 space-y-3 max-w-3xl mx-auto">
        <h1 className="text-2xl text-white font-semibold">{t("intake:title")}</h1>
        {assignments.length === 0 ? (
          <Card className="bg-[#111] border-[#1f1f23]"><CardContent className="p-6 text-center text-gray-400">{t("intake:no_assignments_client_self")}</CardContent></Card>
        ) : assignments.map((a) => (
          <Card key={a.id} className="bg-[#111] border-[#1f1f23]">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{a.title_snapshot}</div>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                  <Badge>{t(`intake:status_${a.status}`)}</Badge>
                  <span>{t("intake:assigned_at", { date: format(new Date(a.assigned_at), "PP") })}</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => onOpen(a.id)}>{t("intake:open")}</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

function FillOut({ id }: { id: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: a } = useAssignment(id);
  const { data: responseRows = [] } = useAssignmentResponses(id);
  const upsert = useUpsertResponse(id);
  const submit = useSubmitAssignment(id);

  const snapshot: SnapshotQuestion[] = useMemo(() => (a?.questions_snapshot as any) ?? [], [a?.questions_snapshot]);
  const [draft, setDraft] = useState<Record<string, Answer>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init: Record<string, Answer> = {};
    for (const r of responseRows) init[r.question_id] = r.answer as Answer;
    setDraft(init);
  }, [responseRows.length, id]);

  const setAnswer = (qid: string, ans: Answer) => {
    setDraft((prev) => ({ ...prev, [qid]: ans }));
    upsert.mutate({ questionId: qid, answer: ans });
  };

  const onSubmit = async () => {
    try {
      await submit.mutateAsync();
      navigate("/dashboard/client/intake");
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      const marker = "missing_required_answers:";
      if (msg.includes(marker)) {
        const ids = msg.split(marker)[1].trim().split(",").filter(Boolean);
        setMissing(new Set(ids));
      }
    }
  };

  if (!a) return <DashboardLayout><p className="p-6 text-gray-400">{t("intake:saving")}</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/dashboard/client/intake")}>←</Button>
          <Badge>{t(`intake:status_${a.status}`)}</Badge>
        </div>
        <h1 className="text-xl text-white font-semibold">{a.title_snapshot}</h1>
        {a.description_snapshot && <p className="text-sm text-gray-400">{a.description_snapshot}</p>}

        {missing.size > 0 && (
          <div className="rounded border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
            {t("intake:submit_missing_required")}
          </div>
        )}

        <div className="space-y-4">
          {snapshot.map((q) => (
            <Card key={q.id} className={`bg-[#111] border ${missing.has(q.id) ? "border-red-700" : "border-[#1f1f23]"}`}>
              <CardContent className="p-4 space-y-2">
                <div className="text-sm text-white">{q.question_text}{q.is_required && " *"}</div>
                {q.help_text && <div className="text-xs text-gray-500">{q.help_text}</div>}
                <QuestionInput q={q} value={draft[q.id]} onChange={(ans) => setAnswer(q.id, ans)} invalid={missing.has(q.id)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => navigate("/dashboard/client/intake")}>{t("intake:save_and_close")}</Button>
          <Button onClick={onSubmit} disabled={submit.isPending}>{submit.isPending ? t("intake:saving") : t("intake:submit")}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 3: Add client route in `src/App.tsx`**

```tsx
const ClientIntake = React.lazy(() => import("@/pages/ClientIntake"));

// Inside <Routes>:
<Route
  path="/dashboard/client/intake"
  element={
    <RouteProtection requiredUserType="client">
      <ClientIntake />
    </RouteProtection>
  }
/>
```

- [ ] **Step 4: Add client sidebar entry in `src/hooks/api/useOptimizedSidebar.ts`**

In the client `navMain` block (around line 410–472), add a new top-level entry between `journal` and `sessions`:

```ts
{
  title: t("intake:title"),
  url: `/dashboard/${userType}/intake`,
  icon: ClipboardList, // import from "lucide-react" at the top of the file
  isActive: isRouteActive(`/dashboard/${userType}/intake`),
  items: [],
},
```

Add `ClipboardList` to the existing `lucide-react` import at the top.

- [ ] **Step 5: Manual verify — round trip**

Sign in as **Client** via quick-login. Navigate to `/dashboard/client/intake`. Expected: the assignment created in Task 10 appears with "Not started" status. Click "Open". Expected: the questionnaire renders with inputs matching each type.

Fill a text answer → navigate away → return. Expected: answer persisted, status "In progress".

Leave a required question blank. Click "Submit". Expected: red banner + red border on the missing question. Fill it in, submit again. Expected: navigation back to list, status "Completed".

Reopen the completed assignment, change an answer. Expected: status drops back to "In progress". Submit again → "Completed".

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/intake/QuestionInput.tsx src/pages/ClientIntake.tsx src/App.tsx src/hooks/api/useOptimizedSidebar.ts
git commit -m "Intake: client fill-out page, route, sidebar entry, submit validation"
```

---

## Task 12: Client dashboard banner + therapist-side assignments smoke

**Files:**
- Create: `src/components/intake/IntakePendingBanner.tsx`
- Modify: `src/pages/ClientDashboard.tsx`

- [ ] **Step 1: Create `src/components/intake/IntakePendingBanner.tsx`**

```tsx
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAssignmentsForSelf } from "@/hooks/api/useIntakeAssignments";

export function IntakePendingBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: assignments = [] } = useAssignmentsForSelf();
  const pending = assignments.filter((a) => a.status !== "completed");
  if (pending.length === 0) return null;
  return (
    <div className="rounded-md border border-yellow-700/40 bg-yellow-900/10 p-3 mb-4 flex items-center justify-between">
      <div className="text-sm text-yellow-300">📋 {t("intake:pending_banner", { count: pending.length })}</div>
      <button className="text-sm text-yellow-200 underline" onClick={() => navigate("/dashboard/client/intake")}>
        {t("intake:open")} →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Mount the banner in `src/pages/ClientDashboard.tsx`**

Find the top-level wrapper inside the page (first child of the main content area — grep `return (` in the file). Add the banner just below the page header and above existing cards/content:

```tsx
import { IntakePendingBanner } from "@/components/intake/IntakePendingBanner";

// Inside the render, before existing main content:
<IntakePendingBanner />
```

- [ ] **Step 3: Manual verify**

Assign a new form to Dev Client from the Care Provider account. Then sign in as Dev Client and navigate to `/dashboard/client`. Expected: yellow banner at the top showing "You have 1 intake form(s) to fill in." Click "Open →" → routes to `/dashboard/client/intake`.

Complete the form. Return to the dashboard. Expected: banner is gone.

`preview_console_logs(serverId, { level: "error" })` → expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/intake/IntakePendingBanner.tsx src/pages/ClientDashboard.tsx
git commit -m "Intake: pending-forms banner on client dashboard"
```

---

## Task 13: End-to-end verification + push

**Files:** none (verification only).

- [ ] **Step 1: Walk the full happy path**

1. Sign in as **Care Provider**.
2. Go to Settings → Intake Forms. Create template "Adult intake".
3. Add one question of each type: number (1–10 anxiety), radio (mood: 3 options), checkbox (sleep issues: 3 options), text (free-form concerns, required), date (date of last exam).
4. Toggle Publish.
5. Open Dev Client profile → Intake tab → Assign form → pick "Adult intake". Verify row appears.
6. Sign out, sign in as **Client** via quick-login.
7. Verify banner on dashboard. Click Open.
8. Fill partial answers, navigate away, return. Verify persistence.
9. Try to submit without the required text field — verify red highlight + banner.
10. Fill required, submit. Verify "Completed" status.
11. Sign out, sign in as Care Provider → go to that client's Intake tab → View answers on the completed form. Verify each answer displays.
12. Go back to Settings → Intake Forms → edit the template (rename a question).
13. Confirm the already-completed client form still shows the ORIGINAL question wording.

- [ ] **Step 2: Run type check + build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both succeed with no new errors.

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

Expected: Vercel triggers an auto-deploy; monitor via Vercel dashboard.

- [ ] **Step 4: Commit any final cleanup**

If Step 1 revealed any issue, patch inline, then commit and push again. Only mark Task 13 complete once the full walkthrough passes.

---

## Follow-ups (out of scope for this plan)

- Playwright E2E test covering the full happy path from Task 13.
- RLS negative tests (SQL): provider B cannot read provider A's templates; client B cannot read client A's assignments.
- Drag-and-drop reordering in the builder (current implementation uses ↑/↓ buttons — simpler, equivalent outcome).
- Native Spanish and French translations (currently duplicated English).
- Scoring rules, branching logic, PDF export, locking after submit (see spec §3 "Out of scope").
