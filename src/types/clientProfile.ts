
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface SessionRecord {
  date: string;
  type: string;
  duration: string;
  notes: string;
  status: string;
}

export interface SharedJournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
}

export interface ClientProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive" | "Pending";
  joinDate: string;
  lastSession: string;
  nextSession: string;
  image?: string;
  notes: string;
  emergencyContact: EmergencyContact;
  sessions: SessionRecord[];
  sharedJournals: SharedJournalEntry[];
}
