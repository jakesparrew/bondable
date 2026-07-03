/**
 * SafetyQueue — Trust & Safety work-queue for the owner cockpit
 * (ticket T-OC-6, plan 07 §3). REBUILD of the old AdminAllChats browser into a
 * triage surface: every case has a status, an assignee and an audit trail.
 *
 * Two tabs:
 *   - Queue (default): open safety cases, severity-sorted, with assign / resolve
 *     / escalate actions that each write to the case's audit trail. Resolve
 *     requires a resolution enum — no silent closes.
 *   - Browse: the read-only conversation transcript viewer reused from
 *     adminService.listConversations. This is the ONLY place mint is allowed in
 *     admin — Bond (AI) bubbles render mint; opening a transcript is audit-logged.
 *
 * Route: /dashboard/admin/safety (parent wires the route + nav).
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import LineWave from '@/components/illustration/LineWave';
import {
  safetyService,
  isSlaBreached,
  type SafetyCase,
  type SafetySeverity,
  type SafetyResolution,
} from '@/services/api/safetyService';
import {
  adminService,
  type AdminConversation,
  type ChatMessage,
} from '@/services/api/adminService';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function formatDate(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleString(locale || undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const SEVERITY_META: Record<
  SafetySeverity,
  { label: string; variant: 'destructive' | 'warning' | 'info' }
> = {
  critical: { label: 'Kritiek', variant: 'destructive' },
  elevated: { label: 'Verhoogd', variant: 'warning' },
  info: { label: 'Info', variant: 'info' },
};

const SOURCE_LABEL: Record<SafetyCase['source'], string> = {
  bond_crisis: 'Bond-crisis',
  checkin: 'Check-in',
  assessment: 'Assessment',
};

const RESOLUTION_LABELS: { value: SafetyResolution; label: string }[] = [
  { value: 'no_action', label: 'Geen actie nodig' },
  { value: 'user_contacted', label: 'Cliënt gecontacteerd' },
  { value: 'provider_notified', label: 'Begeleider verwittigd' },
  { value: 'authority_referred', label: 'Doorverwezen naar hulpdienst' },
  { value: 'content_removed', label: 'Inhoud verwijderd' },
];

const ACTION_LABEL: Record<string, string> = {
  opened: 'Geopend',
  assigned: 'Toegewezen',
  resolved: 'Opgelost',
  escalated: 'Geëscaleerd',
  transcript_viewed: 'Transcript bekeken',
  note: 'Notitie',
};

/* -------------------------------------------------------------------------- */
/* Transcript (read-only) — mint is allowed ONLY here, for Bond/AI bubbles     */
/* -------------------------------------------------------------------------- */

const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
  const { t } = useTranslation();

  if (msg.sender === 'system') {
    return (
      <div className="my-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-ctl bg-muted px-3 py-1 text-center text-label font-medium text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          {msg.text}
        </span>
      </div>
    );
  }

  const isClient = msg.sender === 'client';
  const isBond = msg.sender === 'bond';

  // Bond/AI bubbles are the ONLY mint usage in this admin surface.
  const bubbleClass = isClient
    ? 'bg-secondary text-secondary-foreground'
    : isBond
    ? 'bg-mint-soft text-mint-foreground'
    : 'border border-border bg-card text-foreground';

  const senderLabel = isClient
    ? t('admin_chat_sender_client', 'Cliënt')
    : isBond
    ? t('admin_chat_sender_bond', 'Bond (AI)')
    : t('admin_chat_sender_therapist', 'Hulpverlener');

  return (
    <div className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
      <span className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">
        {senderLabel}
      </span>
      <div
        className={`max-w-[80%] rounded-card px-3.5 py-2 text-body-sm leading-relaxed ${bubbleClass}`}
      >
        {msg.text}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Case row                                                                    */
/* -------------------------------------------------------------------------- */

const CaseRow = ({
  c,
  active,
  onSelect,
}: {
  c: SafetyCase;
  active: boolean;
  onSelect: () => void;
}) => {
  const { i18n } = useTranslation();
  const sev = SEVERITY_META[c.severity];
  const breached = isSlaBreached(c);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col gap-1.5 rounded-card border p-3 text-left transition-colors ${
        active
          ? 'border-primary bg-accent'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-body-sm font-semibold text-foreground">
          {c.clientName}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatDate(c.openedAt, i18n.language)}
        </span>
      </div>
      <p className="line-clamp-2 text-label text-muted-foreground">{c.summary}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={sev.variant}>{sev.label}</Badge>
        <Badge variant="outline">{SOURCE_LABEL[c.source]}</Badge>
        {c.status === 'escalated' && <Badge variant="destructive">Geëscaleerd</Badge>}
        {c.status === 'assigned' && <Badge variant="info">Toegewezen</Badge>}
        {c.status === 'resolved' && <Badge variant="success">Opgelost</Badge>}
        {breached && c.status !== 'resolved' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
            <Clock className="h-3 w-3" aria-hidden="true" />
            SLA overschreden
          </span>
        )}
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Case detail                                                                 */
/* -------------------------------------------------------------------------- */

const CaseDetail = ({
  c,
  onMutated,
}: {
  c: SafetyCase;
  onMutated: () => void;
}) => {
  const { t, i18n } = useTranslation();
  const [conv, setConv] = useState<AdminConversation | null>(null);
  const [resolution, setResolution] = useState<SafetyResolution | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const sev = SEVERITY_META[c.severity];
  const isResolved = c.status === 'resolved';

  // Load + audit-log the transcript for crisis cases.
  useEffect(() => {
    let alive = true;
    if (!c.conversationId) {
      setConv(null);
      return;
    }
    void safetyService.logTranscriptView(c.id);
    adminService
      .getConversation(c.conversationId)
      .then((row) => alive && setConv(row))
      .catch(() => alive && setConv(null));
    return () => {
      alive = false;
    };
  }, [c.id, c.conversationId]);

  const doAssign = async () => {
    setBusy(true);
    await safetyService.assign(c.id);
    setBusy(false);
    onMutated();
  };

  const doResolve = async () => {
    if (!resolution) return;
    setBusy(true);
    await safetyService.resolve(c.id, resolution, note.trim() || undefined);
    setBusy(false);
    setNote('');
    onMutated();
  };

  const doEscalate = async () => {
    if (!note.trim()) return;
    setBusy(true);
    await safetyService.escalate(c.id, note.trim());
    setBusy(false);
    setNote('');
    onMutated();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body-sm font-bold text-foreground">{c.clientName}</h3>
          <Badge variant={sev.variant}>{sev.label}</Badge>
          <Badge variant="outline">{SOURCE_LABEL[c.source]}</Badge>
          {isResolved && <Badge variant="success">Opgelost</Badge>}
          {c.status === 'escalated' && <Badge variant="destructive">Geëscaleerd</Badge>}
        </div>
        <p className="mt-1.5 text-body-sm text-foreground">{c.summary}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-label text-muted-foreground">
          {c.providerName && (
            <span>
              {t('safety_provider', 'Begeleider')}:{' '}
              <span className="font-medium text-foreground">{c.providerName}</span>
            </span>
          )}
          <span>
            {t('safety_opened', 'Geopend')}: {formatDate(c.openedAt, i18n.language)}
          </span>
          {c.assignee && (
            <span>
              {t('safety_assignee', 'Toegewezen aan')}:{' '}
              <span className="font-medium text-foreground">{c.assignee}</span>
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-5 py-4">
          {/* Transcript excerpt (crisis cases) — the ONLY mint surface */}
          {conv && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-label font-semibold uppercase tracking-wide text-muted-foreground">
                <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                {t('safety_transcript', 'Transcript rond de melding (alleen-lezen)')}
              </h4>
              <div className="space-y-3 rounded-card border border-border bg-background p-3">
                {conv.messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {t(
                  'safety_transcript_audited',
                  'Dit transcript openen wordt vastgelegd in het auditspoor (Art. 9).',
                )}
              </p>
            </section>
          )}

          {/* Audit trail */}
          <section>
            <h4 className="mb-2 text-label font-semibold uppercase tracking-wide text-muted-foreground">
              {t('safety_timeline', 'Auditspoor')}
            </h4>
            <ol className="space-y-2">
              {c.events.map((ev) => (
                <li key={ev.id} className="flex gap-2.5 text-body-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-foreground">
                      <span className="font-medium">{ACTION_LABEL[ev.action] ?? ev.action}</span>{' '}
                      <span className="text-muted-foreground">· {ev.actor}</span>
                    </p>
                    {ev.note && <p className="text-muted-foreground">{ev.note}</p>}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(ev.at, i18n.language)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ScrollArea>

      {/* Action panel */}
      {!isResolved && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(
              'safety_note_placeholder',
              'Notitie — verplicht bij escaleren, optioneel bij oplossen',
            )}
            className="min-h-[64px] resize-none text-body-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={resolution} onValueChange={(v) => setResolution(v as SafetyResolution)}>
              <SelectTrigger className="sm:w-56">
                <SelectValue
                  placeholder={t('safety_resolution_placeholder', 'Kies een uitkomst')}
                />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_LABELS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-1 flex-wrap gap-2">
              {!c.assignee && (
                <Button type="button" variant="outline" size="sm" onClick={doAssign} disabled={busy}>
                  {t('safety_assign', 'Aan mij toewijzen')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={doResolve}
                disabled={busy || !resolution}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('safety_resolve', 'Oplossen')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={doEscalate}
                disabled={busy || !note.trim()}
                className="gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('safety_escalate', 'Escaleren')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Browse tab — read-only conversation transcript viewer                       */
/* -------------------------------------------------------------------------- */

const BrowseTab = () => {
  const { t, i18n } = useTranslation();
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminService
      .listConversations()
      .then((rows) => {
        if (!alive) return;
        setConversations(rows);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="rounded-card border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-body-sm font-semibold text-foreground">
            {t('safety_browse_title', 'Alle gesprekken (alleen-lezen)')}
          </div>
          <ScrollArea className="h-[62vh] p-2">
            {loading ? (
              <p className="p-4 text-body-sm text-muted-foreground">
                {t('common_loading', 'Laden…')}
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex w-full items-start gap-2.5 rounded-card border p-3 text-left transition-colors ${
                      conv.id === selectedId
                        ? 'border-primary bg-accent'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-accent/40'
                    }`}
                  >
                    {conv.type === 'bond' ? (
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-body-sm font-semibold text-foreground">
                          {conv.clientName}
                        </span>
                        {conv.status === 'flagged' && (
                          <Badge variant="destructive" className="shrink-0">
                            {t('admin_chat_flagged', 'Gemarkeerd')}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-label text-muted-foreground">
                        {conv.counterpartName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <div className="hidden lg:col-span-7 lg:block xl:col-span-8">
        <div className="min-h-[62vh] rounded-card border border-border bg-card">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body-sm font-bold text-foreground">
                    {selected.clientName}
                  </h3>
                  <span className="text-label text-muted-foreground">
                    ↔ {selected.counterpartName}
                  </span>
                  <Badge variant={selected.type === 'bond' ? 'ai' : 'outline'}>
                    {selected.type === 'bond'
                      ? t('admin_chat_type_bond', 'Bond (AI)')
                      : t('admin_chat_type_direct', 'Direct')}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 py-4">
                  {selected.messages.map((m) => (
                    <MessageBubble key={m.id} msg={m} />
                  ))}
                </div>
              </ScrollArea>
              <div className="border-t border-border px-4 py-2.5 text-center text-[11px] text-muted-foreground">
                {t('admin_chat_readonly', 'Alleen-lezen toezicht — laatste bericht')}{' '}
                {formatDate(selected.lastMessageAt, i18n.language)}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[62vh] items-center justify-center p-8 text-center">
              <p className="max-w-xs text-body-sm text-muted-foreground">
                {t(
                  'safety_browse_hint',
                  'Kies links een gesprek om het volledige, alleen-lezen transcript te bekijken.',
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

const SafetyQueue = () => {
  const { t } = useTranslation();
  const [cases, setCases] = useState<SafetyCase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    void safetyService.list().then((rows) => {
      setCases(rows);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const openCases = useMemo(() => cases.filter((c) => c.status !== 'resolved'), [cases]);
  const breachCount = useMemo(
    () => openCases.filter((c) => isSlaBreached(c)).length,
    [openCases],
  );

  const selected = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? null,
    [cases, selectedId],
  );

  // Keep a sensible default selection in the queue.
  useEffect(() => {
    if (!selectedId && openCases.length > 0) setSelectedId(openCases[0].id);
  }, [openCases, selectedId]);

  return (
    <DashboardLayout userType="admin">
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-display-md text-foreground">
            {t('safety_title', 'Veiligheid')}
          </h1>
          <p className="text-body-sm text-muted-foreground">
            {t(
              'safety_subtitle',
              'Triage van crisismeldingen, onbeantwoorde check-ins en risicosignalen — met auditspoor per case.',
            )}
          </p>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue" className="gap-1.5">
              {t('safety_tab_queue', 'Wachtrij')}
              {openCases.length > 0 && (
                <Badge variant="outline" className="ml-1">
                  {openCases.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="browse">{t('safety_tab_browse', 'Bladeren')}</TabsTrigger>
          </TabsList>

          {/* Queue */}
          <TabsContent value="queue" className="mt-4">
            {loading ? (
              <p className="text-body-sm text-muted-foreground">
                {t('common_loading', 'Laden…')}
              </p>
            ) : openCases.length === 0 ? (
              <EmptyState
                bordered
                motif={<LineWave />}
                title={t('safety_empty_title', 'Geen openstaande veiligheidscases')}
                description={t(
                  'safety_empty_desc',
                  'Alle crisismeldingen en check-ins zijn opgevolgd. Zo hoort het.',
                )}
              />
            ) : (
              <div className="space-y-3">
                {breachCount > 0 && (
                  <div className="flex items-center gap-2 rounded-card border border-destructive/40 bg-destructive-soft px-3 py-2 text-body-sm text-destructive">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('safety_breach', '{{n}} case(s) buiten de SLA-termijn', {
                      n: breachCount,
                    })}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-5 xl:col-span-4">
                    <ScrollArea className="h-[64vh] pr-1">
                      <div className="space-y-2">
                        {openCases.map((c) => (
                          <CaseRow
                            key={c.id}
                            c={c}
                            active={c.id === selectedId}
                            onSelect={() => setSelectedId(c.id)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="lg:col-span-7 xl:col-span-8">
                    <div className="min-h-[64vh] rounded-card border border-border bg-card">
                      {selected ? (
                        <CaseDetail c={selected} onMutated={refresh} />
                      ) : (
                        <div className="flex h-full min-h-[64vh] items-center justify-center p-8 text-center">
                          <p className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                            {t('safety_select', 'Kies een case links')}
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Browse */}
          <TabsContent value="browse" className="mt-4">
            <BrowseTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SafetyQueue;
