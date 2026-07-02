/**
 * noteService.ts — mock (localStorage) clinical-notes engine (tickets T-PX-3/4).
 *
 * This is the SESSION NOTES spine: the `session_notes` first-class object from
 * docs/plan/04 §2, deliberately DISTINCT from the old free-text `sessions.notes`
 * column (which is now "Praktisch / Logistics") and from `sessions.recap` (the
 * client-shared "Samenvatting"). A clinical note here is provider-only.
 *
 * What it owns:
 *   - `note_templates`  — SOAP / DAP / coach-sessielog (seeded system templates,
 *     ownerId null) + per-provider custom templates. Each ends with two optional
 *     shared fields: Huiswerk (creates linked tasks on sign) and Risico (feeds
 *     the risk engine; never client-visible).
 *   - `session_notes`   — per-field contentJson, draft→signed lifecycle. `signed`
 *     is immutable: updates are REJECTED; the only forward path is an amendment.
 *   - `note_amendments` — append-only addenda after signing (GDPR Art. 9 trail).
 *   - a per-note READ LOG — every read by a non-author is recorded (supervision /
 *     admin access trail, mirrors the auditLogs intent of §2).
 *   - a per-provider DEFAULT template id.
 *
 * HARD RULE (plan risk 1): nothing here is ever fed to analytics. Clinical text,
 * the Risico field, and read-log contents never leave this module. Callers that
 * want to instrument a note event emit a STRUCTURAL analytics event themselves
 * (e.g. session_created-adjacent) with counts only — never content.
 *
 * Mock: state lives in localStorage so the demo runs with no backend. The API
 * shape is stable across the Neon cutover (plan 08) — swap the store, keep the
 * signatures. Times are ISO strings; ids are string slugs/uuids.
 */

import { TaskService } from '@/services/api/TaskService';

// ── Types ────────────────────────────────────────────────────────────────────

export type NoteTemplateKind = 'soap' | 'dap' | 'coach_log' | 'custom';
export type NoteFieldType = 'text' | 'scale' | 'chips';
export type NoteStatus = 'draft' | 'signed';

export interface NoteTemplateField {
  /** Stable key within the template (e.g. "subjectief"). */
  key: string;
  labelNl: string;
  labelEn: string;
  type: NoteFieldType;
  required?: boolean;
  /** For chips fields: the selectable options (NL labels). */
  options?: string[];
  /** Optional helper/prompt line shown under the field (NL). */
  promptNl?: string;
  promptEn?: string;
}

export interface NoteTemplate {
  id: string;
  /** null → a system template shared by everyone. */
  ownerId: string | null;
  kind: NoteTemplateKind;
  name: string;
  /** Non-clinical wording for coaches (drives Bond-style framing). */
  tone: 'clinical' | 'coaching';
  fields: NoteTemplateField[];
  isDefault: boolean;
  createdAt: string;
}

/** One appended addendum on a signed note. */
export interface NoteAmendment {
  id: string;
  noteId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

/** A single read of a signed note by someone other than its author. */
export interface NoteReadEntry {
  id: string;
  noteId: string;
  readerId: string;
  readerName: string;
  /** Why the reader had access — supervision / admin oversight. */
  context: 'supervision' | 'admin' | 'other';
  readAt: string;
}

export interface SessionNote {
  id: string;
  sessionId: string;
  providerId: string;
  clientId: string;
  templateId: string;
  /** Per-field values keyed by NoteTemplateField.key. */
  contentJson: Record<string, string>;
  /** Separate, prompted, NEVER client-visible. Feeds the risk engine. */
  riskNote: string;
  /** Huiswerk lines captured on this note (each becomes a task on sign). */
  homework: string[];
  status: NoteStatus;
  signedAt: string | null;
  signedBy: string | null;
  createdAt: string;
  updatedAt: string;
  amendments: NoteAmendment[];
  readLog: NoteReadEntry[];
}

export interface CreateNoteInput {
  sessionId: string;
  providerId: string;
  clientId: string;
  templateId?: string;
  contentJson?: Record<string, string>;
  riskNote?: string;
  homework?: string[];
}

export interface SaveNoteInput {
  contentJson?: Record<string, string>;
  riskNote?: string;
  homework?: string[];
}

// ── Storage ──────────────────────────────────────────────────────────────────

const NOTES_KEY = 'bondable_session_notes_v1';
const TEMPLATES_KEY = 'bondable_note_templates_v1';
const DEFAULTS_KEY = 'bondable_note_default_template_v1';
const hasWindow = typeof window !== 'undefined';

const uid = (prefix: string): string => {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
};

const nowIso = (): string => new Date().toISOString();

// ── System templates (seed) ──────────────────────────────────────────────────

/** The two optional shared fields every template ends with (§2). */
const SHARED_TAIL: NoteTemplateField[] = [
  {
    key: 'huiswerk',
    labelNl: 'Huiswerk',
    labelEn: 'Homework',
    type: 'chips',
    promptNl: 'Voeg toe wat de cliënt meeneemt. Elke lijn wordt een taak.',
    promptEn: 'Add what the client takes with them. Each line becomes a task.',
  },
  {
    key: 'risico',
    labelNl: 'Risico',
    labelEn: 'Risk',
    type: 'text',
    promptNl: 'Iets gehoord dat je zorgen baart? Noteer het hier — dit blijft privé.',
    promptEn: 'Heard something that worries you? Note it here — this stays private.',
  },
];

const SYSTEM_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tmpl-soap',
    ownerId: null,
    kind: 'soap',
    name: 'SOAP',
    tone: 'clinical',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    fields: [
      { key: 'subjectief', labelNl: 'Subjectief', labelEn: 'Subjective', type: 'text', required: true, promptNl: 'Wat bracht de cliënt naar voren.', promptEn: 'What the client reported.' },
      { key: 'objectief', labelNl: 'Objectief', labelEn: 'Objective', type: 'text', promptNl: 'Wat je observeerde.', promptEn: 'What you observed.' },
      { key: 'analyse', labelNl: 'Analyse', labelEn: 'Assessment', type: 'text', promptNl: 'Je klinische inschatting.', promptEn: 'Your clinical assessment.' },
      { key: 'plan', labelNl: 'Plan', labelEn: 'Plan', type: 'text', promptNl: 'Afspraken en volgende stappen.', promptEn: 'Agreements and next steps.' },
    ],
  },
  {
    id: 'tmpl-dap',
    ownerId: null,
    kind: 'dap',
    name: 'DAP',
    tone: 'clinical',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    fields: [
      { key: 'data', labelNl: 'Data', labelEn: 'Data', type: 'text', required: true, promptNl: 'Wat er gezegd en gebeurd is.', promptEn: 'What was said and happened.' },
      { key: 'analyse', labelNl: 'Analyse', labelEn: 'Assessment', type: 'text', promptNl: 'Je inschatting.', promptEn: 'Your assessment.' },
      { key: 'plan', labelNl: 'Plan', labelEn: 'Plan', type: 'text', promptNl: 'Volgende stappen.', promptEn: 'Next steps.' },
    ],
  },
  {
    id: 'tmpl-coach-log',
    ownerId: null,
    kind: 'coach_log',
    name: 'Coach-sessielog',
    tone: 'coaching',
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    // Non-clinical wording throughout — coaches must not be nudged into
    // writing pseudo-clinical records (§2).
    fields: [
      { key: 'doel', labelNl: 'Doel vandaag', labelEn: "Today's goal", type: 'text', required: true, promptNl: 'Waar werkte de cliënt naartoe.', promptEn: 'What the client worked toward.' },
      { key: 'gebeurde', labelNl: 'Wat gebeurde', labelEn: 'What happened', type: 'text', promptNl: 'Hoe het gesprek liep.', promptEn: 'How the conversation went.' },
      { key: 'afspraken', labelNl: 'Afspraken', labelEn: 'Agreements', type: 'text', promptNl: 'Wat jullie afspraken.', promptEn: 'What you agreed.' },
      { key: 'volgende', labelNl: 'Volgende stap', labelEn: 'Next step', type: 'text', promptNl: 'De eerstvolgende stap.', promptEn: 'The next step.' },
    ],
  },
].map((tmpl) => ({ ...tmpl, fields: [...tmpl.fields, ...SHARED_TAIL] }));

// ── Template store ───────────────────────────────────────────────────────────

function readTemplates(): NoteTemplate[] {
  if (!hasWindow) return SYSTEM_TEMPLATES;
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(SYSTEM_TEMPLATES));
      return SYSTEM_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as NoteTemplate[]) : SYSTEM_TEMPLATES;
  } catch {
    return SYSTEM_TEMPLATES;
  }
}

function writeTemplates(templates: NoteTemplate[]): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    /* silent-fail (quota / private mode) */
  }
}

// ── Note store ───────────────────────────────────────────────────────────────

function readNotes(): SessionNote[] {
  if (!hasWindow) return [];
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionNote[]) : [];
  } catch {
    return [];
  }
}

function writeNotes(notes: SessionNote[]): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    /* silent-fail */
  }
}

// ── Per-provider default template ────────────────────────────────────────────

function readDefaults(): Record<string, string> {
  if (!hasWindow) return {};
  try {
    const raw = window.localStorage.getItem(DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDefaults(map: Record<string, string>): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(DEFAULTS_KEY, JSON.stringify(map));
  } catch {
    /* silent-fail */
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const noteService = {
  // — Templates —

  /** All templates visible to a provider: system templates + their own. */
  listTemplates(providerId?: string): NoteTemplate[] {
    const all = readTemplates();
    return all.filter((t) => t.ownerId === null || t.ownerId === providerId);
  },

  getTemplate(templateId: string): NoteTemplate | null {
    return readTemplates().find((t) => t.id === templateId) ?? null;
  },

  /** The provider's chosen default template, else the system default (SOAP). */
  getDefaultTemplate(providerId: string): NoteTemplate {
    const chosen = readDefaults()[providerId];
    const templates = this.listTemplates(providerId);
    return (
      (chosen && templates.find((t) => t.id === chosen)) ||
      templates.find((t) => t.isDefault) ||
      templates[0]
    );
  },

  /** Set the provider's default template. */
  setDefaultTemplate(providerId: string, templateId: string): void {
    const map = readDefaults();
    map[providerId] = templateId;
    writeDefaults(map);
  },

  /** Create a custom template owned by the provider (Pro). */
  createTemplate(input: {
    providerId: string;
    name: string;
    fields: NoteTemplateField[];
    tone?: 'clinical' | 'coaching';
  }): NoteTemplate {
    const tmpl: NoteTemplate = {
      id: uid('tmpl'),
      ownerId: input.providerId,
      kind: 'custom',
      name: input.name.trim() || 'Eigen sjabloon',
      tone: input.tone ?? 'clinical',
      isDefault: false,
      // Custom templates still carry the shared Huiswerk/Risico tail.
      fields: [...input.fields, ...SHARED_TAIL],
      createdAt: nowIso(),
    };
    writeTemplates([...readTemplates(), tmpl]);
    return tmpl;
  },

  // — Notes: read —

  /** The clinical note for a session (at most one per provider/session). */
  getNoteForSession(sessionId: string): SessionNote | null {
    return readNotes().find((n) => n.sessionId === sessionId) ?? null;
  },

  getNote(noteId: string): SessionNote | null {
    return readNotes().find((n) => n.id === noteId) ?? null;
  },

  /** All notes for a client, newest first (Notes tab on ClientProfile). */
  listNotesForClient(clientId: string): SessionNote[] {
    return readNotes()
      .filter((n) => n.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** All notes authored by a provider (unfinished-note nudge, caseload search). */
  listNotesForProvider(providerId: string): SessionNote[] {
    return readNotes()
      .filter((n) => n.providerId === providerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Draft notes for a provider — feed the ActionInbox "still a draft" nudge. */
  listDraftsForProvider(providerId: string): SessionNote[] {
    return this.listNotesForProvider(providerId).filter((n) => n.status === 'draft');
  },

  // — Notes: write —

  /**
   * Create a draft note for a session, or return the existing one (idempotent
   * on sessionId so re-opening quick-capture never duplicates).
   */
  createDraft(input: CreateNoteInput): SessionNote {
    const existing = this.getNoteForSession(input.sessionId);
    if (existing) return existing;

    const templateId = input.templateId || this.getDefaultTemplate(input.providerId).id;
    const note: SessionNote = {
      id: uid('note'),
      sessionId: input.sessionId,
      providerId: input.providerId,
      clientId: input.clientId,
      templateId,
      contentJson: input.contentJson ?? {},
      riskNote: input.riskNote ?? '',
      homework: input.homework ?? [],
      status: 'draft',
      signedAt: null,
      signedBy: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      amendments: [],
      readLog: [],
    };
    writeNotes([...readNotes(), note]);
    return note;
  },

  /**
   * Update a DRAFT note. Signed notes are immutable — this REJECTS them; use
   * `amend()` instead. Returns the updated note.
   */
  saveDraft(noteId: string, patch: SaveNoteInput): SessionNote {
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) throw new Error('Note not found');
    const note = notes[idx];
    if (note.status === 'signed') {
      throw new Error('Signed notes are immutable — add an amendment instead.');
    }
    const next: SessionNote = {
      ...note,
      contentJson: patch.contentJson ?? note.contentJson,
      riskNote: patch.riskNote ?? note.riskNote,
      homework: patch.homework ?? note.homework,
      updatedAt: nowIso(),
    };
    notes[idx] = next;
    writeNotes(notes);
    return next;
  },

  /**
   * Sign a note: locks it (immutable) and — for each Huiswerk line — creates a
   * linked task assigned to the client. Signing a signed note is a no-op.
   *
   * Returns { note, tasksCreated } so the UI can toast "3 taken aangemaakt".
   */
  async sign(
    noteId: string,
    signerId: string,
    signerName?: string,
  ): Promise<{ note: SessionNote; tasksCreated: number }> {
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) throw new Error('Note not found');
    const note = notes[idx];
    if (note.status === 'signed') return { note, tasksCreated: 0 };

    const signed: SessionNote = {
      ...note,
      status: 'signed',
      signedAt: nowIso(),
      signedBy: signerName || signerId,
      updatedAt: nowIso(),
    };
    notes[idx] = signed;
    writeNotes(notes);

    // Homework → tasks. Best-effort: a failed task never blocks the sign.
    let tasksCreated = 0;
    for (const line of note.homework.map((h) => h.trim()).filter(Boolean)) {
      try {
        await TaskService.createTask({
          title: line,
          client_id: note.clientId,
          therapist_id: note.providerId,
        });
        tasksCreated += 1;
      } catch {
        /* silent-fail — homework capture must never block signing */
      }
    }
    return { note: signed, tasksCreated };
  },

  /**
   * Append an amendment to a SIGNED note (append-only, GDPR trail). Drafts are
   * editable directly, so amending a draft is rejected.
   */
  amend(noteId: string, authorId: string, authorName: string, body: string): SessionNote {
    const text = body.trim();
    if (!text) throw new Error('Amendment body is empty');
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) throw new Error('Note not found');
    const note = notes[idx];
    if (note.status !== 'signed') {
      throw new Error('Amendments apply to signed notes only — edit the draft directly.');
    }
    const amendment: NoteAmendment = {
      id: uid('amd'),
      noteId,
      authorId,
      authorName,
      body: text,
      createdAt: nowIso(),
    };
    const next: SessionNote = {
      ...note,
      amendments: [...note.amendments, amendment],
      updatedAt: nowIso(),
    };
    notes[idx] = next;
    writeNotes(notes);
    return next;
  },

  /**
   * Record a read of a signed note by a NON-author (supervision / admin). Reads
   * by the author are not logged. Idempotency is not enforced — the log is a
   * true access trail, one entry per read. Returns the entry (or null when the
   * reader is the author, or the note is a draft).
   */
  logRead(
    noteId: string,
    reader: { id: string; name: string; context?: NoteReadEntry['context'] },
  ): NoteReadEntry | null {
    const notes = readNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return null;
    const note = notes[idx];
    // Only signed notes carry an Art. 9 read trail; author reads are not logged.
    if (note.status !== 'signed' || note.providerId === reader.id) return null;

    const entry: NoteReadEntry = {
      id: uid('read'),
      noteId,
      readerId: reader.id,
      readerName: reader.name,
      context: reader.context ?? 'other',
      readAt: nowIso(),
    };
    notes[idx] = { ...note, readLog: [...note.readLog, entry], updatedAt: nowIso() };
    writeNotes(notes);
    return entry;
  },
};

export type { NoteTemplate as NoteTemplateType };
