/**
 * FeatureVignettes — miniature, non-interactive replicas of REAL app UI for the
 * public homepage, now ANIMATED: the Bond conversation plays out (typing →
 * bubbles), the check-in selects itself, the admin chain ticks off step by
 * step. "See and feel the app" — the homepage demonstrates instead of claiming.
 *
 * Motion discipline: sequences start when scrolled into view; timings use calm
 * gaps (600–1200ms); `prefers-reduced-motion` skips straight to the completed
 * state (no loops, no movement). Containers reserve height so nothing jumps.
 *
 * Rules: decorative (aria-hidden), pointer-events-none, border-first, 360px-safe.
 * Mint ONLY inside the Bond vignette (AI surface). Concrete Flemish demo
 * people: Lotte Vermeulen (cliënt), An Verhaeghe (psycholoog, Gent).
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  Check,
  FileText,
  Receipt,
  Stamp,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ────────────────────────────────────────────────────────────────────────────
 * Motion helpers
 * ──────────────────────────────────────────────────────────────────────────── */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * True once the element has scrolled into view (fires once).
 *
 * FAIL-SAFE: an IntersectionObserver that never fires would leave these
 * vignettes permanently blank — the worst possible failure for a homepage that
 * is supposed to SHOW the product. So we also (a) check the rect on mount for
 * anything already on screen, and (b) hard-start after a short grace period no
 * matter what. Animation is an enhancement; the content is not optional.
 */
function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    let obs: IntersectionObserver | null = null;

    // (a) already visible at mount (above the fold)?
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) setInView(true);
    }

    if (el && typeof IntersectionObserver !== 'undefined') {
      obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs?.disconnect();
          }
        },
        { threshold },
      );
      obs.observe(el);
    } else {
      setInView(true);
    }

    // (b) unconditional safety net.
    const failsafe = window.setTimeout(() => setInView(true), 1200);

    return () => {
      obs?.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [threshold]);

  return { ref, inView };
}

/**
 * Step sequencer: advances through `gaps` (ms between steps) once `active`.
 * With `loop`, holds the final state for `holdMs` and replays. `skip` jumps to
 * the completed state (reduced motion).
 */
function useSequence(
  active: boolean,
  gaps: number[],
  opts: { loop?: boolean; holdMs?: number; skip?: boolean } = {},
): number {
  const [step, setStep] = useState(0);
  const { loop = false, holdMs = 4500, skip = false } = opts;

  useEffect(() => {
    if (skip) {
      setStep(gaps.length);
      return;
    }
    if (!active) return;

    let cancelled = false;
    let timers: number[] = [];

    const run = () => {
      timers.forEach(window.clearTimeout);
      timers = [];
      setStep(0);
      let acc = 0;
      gaps.forEach((gap, i) => {
        acc += gap;
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) setStep(i + 1);
          }, acc),
        );
      });
      if (loop) {
        acc += holdMs;
        timers.push(
          window.setTimeout(() => {
            if (!cancelled) run();
          }, acc),
        );
      }
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skip, loop]);

  return step;
}

/** Bond typing indicator — staggered soft pulse, never bouncing. */
const TypingDots = () => (
  <span className="inline-flex w-fit items-center gap-1 rounded-card rounded-tl-ctl bg-mint-soft px-3 py-2.5">
    {[0, 180, 360].map((delay) => (
      <span
        key={delay}
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint-foreground/50"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

/** Shared frame: a quiet device-ish card the vignettes sit in. */
const Frame = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none select-none rounded-card border border-border bg-card p-4 ${className}`}
  >
    {children}
  </div>
);

/* ────────────────────────────────────────────────────────────────────────────
 * CLIENT SIDE
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Bond chat — the flagship, played as a live conversation.
 * Steps: 1 typing · 2 bond#1 · 3 client reply · 4 typing · 5 bond#2 · 6 chips.
 */
export const BondVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const step = useSequence(inView, [500, 1100, 1300, 600, 1300, 800], {
    loop: true,
    holdMs: 6000,
    skip: reduced,
  });

  return (
    <div ref={ref}>
      <Frame className="rounded-hero">
        {/* Chat header */}
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-mint text-label font-semibold text-mint-foreground">
            B
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-breath rounded-full bg-mint" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Bond</p>
            <p className="truncate text-label text-muted-foreground">
              {t('vig_bond_sub', 'AI · onder supervisie van An Verhaeghe')}
            </p>
          </div>
        </div>

        {/* Exchange — height reserved so the page never jumps while it plays */}
        <div className="mt-3 flex min-h-[196px] flex-col justify-start gap-2 sm:min-h-[176px]">
          {step === 1 && <TypingDots />}
          {step >= 2 && (
            <div className="max-w-[85%] animate-enter rounded-card rounded-tl-ctl bg-mint-soft px-3 py-2 text-body-sm text-foreground">
              {t('vig_bond_1', 'Dag Lotte. Gisteren zat je op 2 op 5 — hoe voelt het vandaag?')}
            </div>
          )}
          {step >= 3 && (
            <div className="ml-auto max-w-[75%] animate-enter rounded-card rounded-tr-ctl bg-secondary px-3 py-2 text-body-sm text-foreground">
              {t('vig_bond_2', 'Iets beter. Vanmiddag heb ik mijn gesprek met An.')}
            </div>
          )}
          {step === 4 && <TypingDots />}
          {step >= 5 && (
            <div className="max-w-[85%] animate-enter rounded-card rounded-tl-ctl bg-mint-soft px-3 py-2 text-body-sm text-foreground">
              {t('vig_bond_3', 'Fijn om te horen. Wil je samen voorbereiden wat je zeker wil zeggen?')}
            </div>
          )}
        </div>

        {/* Suggestion chips */}
        <div className="mt-3 flex min-h-[30px] flex-wrap gap-1.5">
          {step >= 6 &&
            [
              t('vig_bond_chip1', 'Ja, help me kiezen'),
              t('vig_bond_chip2', 'Eerst even ventileren'),
            ].map((c) => (
              <span
                key={c}
                className="animate-enter rounded-ctl border border-border bg-background px-2.5 py-1 text-label text-muted-foreground"
              >
                {c}
              </span>
            ))}
        </div>
      </Frame>
    </div>
  );
};

/**
 * Daily check-in — selects itself: mood 4 gets tapped, tags appear, the
 * 7-day ribbon grows. No streaks, no guilt.
 */
export const CheckinVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const step = useSequence(inView, [800, 800, 800], { skip: reduced });

  const moods = [1, 2, 3, 4, 5];
  const week = [3, 2, 2, 3, 4, 3, 4]; // gentle upward drift

  return (
    <div ref={ref}>
      <Frame>
        <p className="text-sm font-semibold text-foreground">
          {t('vig_checkin_title', 'Dagelijkse check-in')}
        </p>
        <p className="mt-0.5 text-label text-muted-foreground">
          {t('vig_checkin_sub', 'Onder de minuut, helemaal van jou')}
        </p>

        {/* Mood scale — 4 becomes selected at step 1 */}
        <div className="mt-3 flex items-center gap-2">
          {moods.map((m) => {
            const selected = m === 4 && step >= 1;
            return (
              <span
                key={m}
                className={
                  selected
                    ? 'flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all duration-200'
                    : 'flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm text-muted-foreground transition-all duration-200'
                }
              >
                {m}
              </span>
            );
          })}
        </div>

        {/* Tags — appear at step 2 */}
        <div className="mt-3 flex min-h-[26px] flex-wrap gap-1.5">
          {step >= 2 && (
            <>
              <span className="animate-enter">
                <Badge variant="secondary">{t('vig_checkin_tag1', 'beter geslapen')}</Badge>
              </span>
              <span className="animate-enter" style={{ animationDelay: '150ms' }}>
                <Badge variant="outline">{t('vig_checkin_tag2', 'minder piekeren')}</Badge>
              </span>
            </>
          )}
        </div>

        {/* 7-day ribbon — bars grow at step 3 */}
        <div className="mt-4 flex items-end gap-1.5 border-t border-border pt-3">
          {week.map((v, i) => (
            <span
              key={i}
              className="w-2 rounded-full bg-primary/30 transition-all duration-500"
              style={{
                height: step >= 3 ? `${6 + v * 4}px` : '5px',
                opacity: step >= 3 ? 0.35 + v * 0.13 : 0.25,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          ))}
          <span className="ml-2 text-label text-muted-foreground">
            {t('vig_checkin_week', 'jouw week, zonder streaks')}
          </span>
        </div>
      </Frame>
    </div>
  );
};

/** Finder result card — quiet entrance; content is the message here. */
export const FinderVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const shown = reduced || inView;

  return (
    <div ref={ref} className={shown ? 'animate-enter' : 'opacity-0'}>
      <Frame>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            AV
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">An Verhaeghe</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-label text-muted-foreground">
                {t('vig_finder_type', 'Psycholoog')}
              </span>
              <Badge variant="trust" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t('finder_badge_regulated', 'Erkend hulpverlener')}
              </Badge>
            </div>
            <p className="mt-1.5 text-label text-muted-foreground">
              Gent · {t('vig_finder_langs', 'NL, EN')}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-label font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('finder_card_accepting', 'Neemt nieuwe cliënten aan')}
          </span>
          <span className="rounded-ctl bg-primary px-3 py-1.5 text-label font-semibold text-primary-foreground">
            {t('vig_finder_cta', 'Contact')}
          </span>
        </div>
      </Frame>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * PROVIDER SIDE
 * ──────────────────────────────────────────────────────────────────────────── */

/** Today prep card — prep lines reveal one by one. */
export const ProviderTodayVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const step = useSequence(inView, [500, 600, 600], { skip: reduced });

  return (
    <div ref={ref}>
      <Frame>
        <div className="flex items-center justify-between">
          <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
            {t('vig_today_label', 'Vandaag')}
          </p>
          <span className="inline-flex items-center gap-1 text-label text-muted-foreground">
            <Clock className="h-3 w-3" />
            14:00
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-foreground">Lotte Vermeulen</p>
        <div className="mt-2 min-h-[76px] space-y-1.5 text-body-sm text-muted-foreground">
          {step >= 1 && (
            <p className="animate-enter">
              {t('vig_today_note', 'Vorige notitie: ademhalingsoefening werkte goed')}
            </p>
          )}
          {step >= 2 && (
            <p className="flex animate-enter items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" />
              {t('vig_today_homework', 'Huiswerk 2 van 3 afgerond')}
            </p>
          )}
          {step >= 3 && (
            <p className="flex animate-enter items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-success" />
              {t('vig_today_prep', 'Wil bespreken: terugval afgelopen weekend')}
            </p>
          )}
        </div>
      </Frame>
    </div>
  );
};

/** The 90-second chain — ticks itself off: notitie → factuur → attest. */
export const AdminChainVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const step = useSequence(inView, [700, 1000, 1000], {
    loop: true,
    holdMs: 5500,
    skip: reduced,
  });

  const steps = [
    { icon: FileText, label: t('vig_chain_1', 'Notitie ondertekend') },
    { icon: Receipt, label: t('vig_chain_2', 'Factuur 2026-0007') },
    { icon: Stamp, label: t('vig_chain_3', 'Attest terugbetaling') },
  ];

  return (
    <div ref={ref}>
      <Frame>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {t('vig_chain_title', 'Na je sessie')}
          </p>
          <Badge variant="success">{t('vig_chain_time', '90 seconden')}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {steps.map((s, i) => {
            const done = step >= i + 1;
            return (
              <div key={s.label} className="flex items-center gap-2.5">
                <span
                  className={
                    done
                      ? 'flex h-7 w-7 items-center justify-center rounded-ctl bg-secondary text-primary transition-colors duration-200'
                      : 'flex h-7 w-7 items-center justify-center rounded-ctl bg-background text-muted-foreground/50 transition-colors duration-200'
                  }
                >
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <span
                  className={
                    done
                      ? 'text-body-sm text-foreground transition-colors duration-200'
                      : 'text-body-sm text-muted-foreground/60 transition-colors duration-200'
                  }
                >
                  {s.label}
                </span>
                <span className="ml-auto flex h-4 w-4 items-center justify-center">
                  {done && <Check className="h-3.5 w-3.5 animate-enter text-success" />}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 border-t border-border pt-2.5 text-label text-muted-foreground">
          {t('vig_chain_sub', 'Je administratie klaar voor je je jas aanhebt')}
        </p>
      </Frame>
    </div>
  );
};

/** Leads inbox row — a prepared client arrives (badges pop in). */
export const LeadsVignette = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const step = useSequence(inView, [600, 700], { skip: reduced });

  return (
    <div ref={ref}>
      <Frame>
        <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
          {t('vig_leads_label', 'Nieuwe aanvraag')}
        </p>
        <div className="mt-2 flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label font-semibold text-primary">
            TD
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Thomas D.</p>
            <p className="text-label text-muted-foreground">
              {t('vig_leads_topic', 'Angst en piekeren · Gent · avonduren')}
            </p>
            <div className="mt-1.5 flex min-h-[24px] flex-wrap gap-1.5">
              {step >= 1 && (
                <span className="animate-enter">
                  <Badge variant="info">{t('vig_leads_intake', 'Intake al ingevuld')}</Badge>
                </span>
              )}
              {step >= 2 && (
                <span className="animate-enter">
                  <Badge variant="outline">{t('vig_leads_baseline', 'Nulmeting klaar')}</Badge>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <span className="rounded-ctl bg-primary px-3 py-1.5 text-label font-semibold text-primary-foreground">
            {t('vig_leads_accept', 'Aanvaard')}
          </span>
          <span className="rounded-ctl border border-border px-3 py-1.5 text-label text-muted-foreground">
            {t('vig_leads_waitlist', 'Wachtlijst')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-label text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            {t('vig_leads_sla', 'binnen 48 u')}
          </span>
        </div>
      </Frame>
    </div>
  );
};
