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
