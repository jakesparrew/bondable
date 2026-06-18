// COMPLETELY NEW SESSION TYPE SYSTEM - MUCH BETTER!

export type SessionStatus = 
  | 'client_requested'         // Client made initial request
  | 'therapist_confirmed'      // Therapist confirmed the session  
  | 'therapist_requested_update' // Therapist wants to change something
  | 'client_requested_update'    // Client wants to change something
  | 'client_confirmed_update'    // Client approved therapist's update
  | 'denied'                   // Either party denied
  | 'completed';               // Session is done

export interface NewSession {
  id: string;
  client_id: string;
  therapist_id: string;
  
  // Session details
  session_date: string;
  session_time: string;
  duration_minutes: number;
  session_type: string;
  session_format?: string;
  therapy_type?: string;
  location?: string;
  notes?: string;
  
  // State machine
  status: SessionStatus;
  waiting_for_response_from?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated relationships
  client?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  therapist?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateSessionRequest {
  client_id: string;
  therapist_id: string;
  session_date: string;
  session_time: string;
  duration_minutes?: number;
  session_type: string;
  session_format?: string;
  therapy_type?: string;
  location?: string;
  notes?: string;
}

export interface UpdateSessionRequest {
  session_date?: string;
  session_time?: string;
  duration_minutes?: number;
  session_type?: string;
  session_format?: string;
  therapy_type?: string;
  location?: string;
  notes?: string;
  status?: SessionStatus;
  waiting_for_response_from?: string;
}

// CRYSTAL CLEAR PERMISSION RULES
export interface SessionPermissions {
  canViewDetails: boolean;
  canEdit: boolean;
  canConfirm: boolean;
  canDeny: boolean;
  canCancel: boolean;
  canRequestUpdate: boolean;
}

// PERMISSION CALCULATOR - MUCH CLEANER LOGIC
export function calculateSessionPermissions(
  session: NewSession,
  currentUserId: string
): SessionPermissions {
  const isClient = session.client_id === currentUserId;
  const isTherapist = session.therapist_id === currentUserId;
  const isWaitingForMe = session.waiting_for_response_from === currentUserId;
  
  // Default: everyone can view details
  const base: SessionPermissions = {
    canViewDetails: true,
    canEdit: false,
    canConfirm: false,
    canDeny: false,
    canCancel: false,
    canRequestUpdate: false
  };
  
  switch (session.status) {
    case 'client_requested':
      // Check who is waiting for a response to determine permissions
      if (isWaitingForMe) {
        return { ...base, canConfirm: true, canDeny: true };
      } else {
        // The person who initiated can edit/cancel
        return { ...base, canEdit: true, canCancel: true };
      }
      break;
      
    case 'therapist_confirmed':
    case 'client_confirmed_update':
      // Confirmed sessions: both therapist and client can edit and request updates
      if (isTherapist || isClient) {
        return { ...base, canEdit: true, canRequestUpdate: true };
      }
      return base;
      
    case 'therapist_requested_update':
      if (isClient) {
        return { ...base, canConfirm: true, canDeny: true };
      }
      if (isTherapist) {
        return { ...base, canCancel: true };
      }
      break;
      
    case 'client_requested_update':
      if (isTherapist) {
        return { ...base, canConfirm: true, canDeny: true };
      }
      if (isClient) {
        return { ...base, canCancel: true };
      }
      break;
      
    // Remove the duplicate client_confirmed_update case since we handle it above
      
    case 'denied':
    case 'completed':
      // Only view details for finished sessions
      return base;
      
    default:
      return base;
  }
  
  return base;
}