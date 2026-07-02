/**
 * DevEmails — dev/demo review surface for the full email lifecycle (T-OA-9).
 *
 * Standalone page (its own header, NO DashboardLayout) that lists every
 * messageMap entry grouped by category, with an NL/EN toggle and a live
 * EmailPreview in a right pane. Nothing here sends — the header states plainly
 * "Voorbeeld — nog niet verstuurd (mock)". Wiring to Resend is Phase 4.
 *
 * The parent wires the route: /dev/emails -> DevEmails @ @/pages/DevEmails.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmailPreview } from '@/emails/renderEmail';
import {
  EMAIL_AUDIENCE_LABELS,
  EMAIL_CATEGORY_LABELS,
  EMAIL_CATEGORY_ORDER,
  EMAIL_MESSAGES,
  type EmailAudience,
  type EmailCategory,
  type EmailMessage,
  isUnsubscribable,
  messagesByCategory,
} from '@/emails/messageMap';

type Lang = 'nl' | 'en';

/** Maps an audience to a Badge variant (never mint — mint is AI-only). */
const AUDIENCE_VARIANT: Record<
  EmailAudience,
  React.ComponentProps<typeof Badge>['variant']
> = {
  client: 'info',
  provider: 'trust',
  manager: 'pro',
  staff: 'practice',
  admin: 'outline',
};

/** Category badge — transactional is neutral, drips read as informational. */
const CATEGORY_VARIANT: Record<
  EmailCategory,
  React.ComponentProps<typeof Badge>['variant']
> = {
  transactional: 'outline',
  activation: 'success',
  digest: 'info',
  trial: 'warning',
  winback: 'outline',
};

export default function DevEmails() {
  const [lang, setLang] = React.useState<Lang>('nl');
  const [selectedId, setSelectedId] = React.useState<string>(
    EMAIL_MESSAGES[0]?.id ?? '',
  );

  const selected: EmailMessage | undefined = React.useMemo(
    () => EMAIL_MESSAGES.find((m) => m.id === selectedId),
    [selectedId],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Standalone header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-display-md text-foreground">
                E-mail lifecycle
              </h1>
              <Badge variant="warning">
                {lang === 'nl'
                  ? 'Voorbeeld — nog niet verstuurd (mock)'
                  : 'Preview — not sent yet (mock)'}
              </Badge>
            </div>
            <p className="mt-1 text-body-sm text-muted-foreground">
              {lang === 'nl'
                ? 'Alle Bondable-mails ter review. Nog niet gekoppeld aan Resend — dat volgt in fase 4.'
                : 'Every Bondable email for review. Not wired to Resend yet — that lands in phase 4.'}
            </p>
          </div>

          {/* NL / EN toggle */}
          <div className="inline-flex items-center gap-1 rounded-ctl border border-border bg-background p-1">
            {(['nl', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={cn(
                  'rounded-ctl px-3 py-1.5 text-body-sm font-medium transition-colors',
                  lang === l
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={lang === l}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(320px,380px)_1fr]">
        {/* Left: grouped list */}
        <nav className="flex flex-col gap-6" aria-label="Email list">
          {EMAIL_CATEGORY_ORDER.map((category) => {
            const items = messagesByCategory(category);
            if (items.length === 0) return null;
            return (
              <section key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {EMAIL_CATEGORY_LABELS[category][lang]}
                  </h2>
                  <span className="text-body-sm text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map((entry) => {
                    const active = entry.id === selectedId;
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(entry.id)}
                          className={cn(
                            'w-full rounded-card border p-3 text-left transition-colors',
                            active
                              ? 'border-primary bg-card'
                              : 'border-border bg-card hover:shadow-raise',
                          )}
                          aria-current={active ? 'true' : undefined}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-body-sm text-muted-foreground">
                              {entry.id}
                            </span>
                            <Badge variant={AUDIENCE_VARIANT[entry.audience]}>
                              {EMAIL_AUDIENCE_LABELS[entry.audience][lang]}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-body-sm font-medium text-foreground">
                            {entry[lang].subject}
                          </p>
                          <p className="mt-0.5 text-body-sm text-muted-foreground">
                            {entry.trigger}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>

        {/* Right: preview pane */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selected ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={CATEGORY_VARIANT[selected.category]}>
                  {EMAIL_CATEGORY_LABELS[selected.category][lang]}
                </Badge>
                <Badge variant={AUDIENCE_VARIANT[selected.audience]}>
                  {EMAIL_AUDIENCE_LABELS[selected.audience][lang]}
                </Badge>
                {isUnsubscribable(selected.category) ? (
                  <Badge variant="outline">
                    {lang === 'nl' ? 'Met uitschrijflink' : 'Has unsubscribe'}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {lang === 'nl' ? 'Zonder uitschrijflink' : 'No unsubscribe'}
                  </Badge>
                )}
                <span className="text-body-sm text-muted-foreground">
                  {selected.trigger}
                </span>
              </div>

              <div className="overflow-hidden rounded-card border border-border">
                <EmailPreview entry={selected} lang={lang} />
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-border bg-card p-8 text-center">
              <p className="text-body-sm text-muted-foreground">
                {lang === 'nl'
                  ? 'Kies een e-mail links om het voorbeeld te bekijken.'
                  : 'Pick an email on the left to see the preview.'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSelectedId(EMAIL_MESSAGES[0]?.id ?? '')}
              >
                {lang === 'nl' ? 'Eerste e-mail tonen' : 'Show first email'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
