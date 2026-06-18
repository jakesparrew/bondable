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
