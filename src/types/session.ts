
export interface Session {
  id: string;
  session_date: string;
  session_time: string;
  duration_minutes: number;
  session_type: string;
  therapy_type?: string;
  session_format?: string;
  location?: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled" | "No Show" | "Denied";
  notes?: string;
  therapist_id: string;
  client_id: string;
  current_requester_id?: string; // Track who made the current request
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    full_name: string;
    email: string;
  };
  therapist?: {
    id: string;
    full_name: string;
    email: string;
  };
}
