/**
 * renderEmail — a brand-safe, EMAIL-SAFE presentational preview of a lifecycle
 * email (T-OA-9). Given a messageMap entry + language, it renders realistic
 * email chrome: the from-line, subject, a teal header wordmark, the body summary
 * expanded into 1-2 short paragraphs, a CTA button placeholder, and a footer
 * (with a one-click unsubscribe line for non-transactional categories).
 *
 * EMAIL-SAFE means: inline styles only (email clients strip <style>/Tailwind),
 * a Georgia serif fallback for the wordmark/heading (email clients cannot load
 * the Fraunces webfont — the live app uses Fraunces, mail must not), a single
 * table-like centered column, and NO mint (mint is AI-only and never appears in
 * mail). Colors are the literal token values from src/index.css so the preview
 * matches the design system without depending on the app's CSS variables (which
 * would not survive an email send anyway).
 *
 * Pure presentational: no data fetching, no i18n runtime — the caller passes the
 * language and the copy comes straight from the typed registry.
 */

import * as React from 'react';
import {
  type EmailMessage,
  isUnsubscribable,
} from './messageMap';

type Lang = 'nl' | 'en';

/**
 * Literal token values (light theme) from src/index.css. Inlined because email
 * clients do not resolve CSS custom properties or Tailwind classes.
 */
const C = {
  canvas: '#eef4f3', // approx bg-background
  card: '#ffffff', // bg-card
  ink: '#0f403c', // deep-teal foreground / primary
  primary: '#0f403c',
  primaryText: '#ffffff',
  muted: '#5a7674', // muted-foreground
  border: '#dbe8e6', // border
  headerBg: '#0f403c', // teal header band
  footerText: '#8aa3a0',
} as const;

const FONT_BODY =
  "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// Email-safe display: Georgia, NOT the Fraunces webfont (mail clients lack it).
const FONT_DISPLAY = "Georgia, 'Times New Roman', Times, serif";

/** Split a 2-3 sentence summary into up to two short paragraphs on sentence boundaries. */
function toParagraphs(summary: string): string[] {
  const sentences = summary
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 2) return [sentences.join(' ')];
  const mid = Math.ceil(sentences.length / 2);
  return [sentences.slice(0, mid).join(' '), sentences.slice(mid).join(' ')];
}

export interface EmailPreviewProps {
  entry: EmailMessage;
  lang: Lang;
}

/**
 * EmailPreview — renders the given registry entry as an email-safe HTML preview.
 * Concrete Flemish example data lives in the copy itself (messageMap).
 */
export function EmailPreview({ entry, lang }: EmailPreviewProps): React.ReactElement {
  const copy = entry[lang];
  const paragraphs = toParagraphs(copy.summary);
  const showUnsub = isUnsubscribable(entry.category);

  const fromLabel = lang === 'nl' ? 'Van' : 'From';
  const subjectLabel = lang === 'nl' ? 'Onderwerp' : 'Subject';
  const supportLine =
    lang === 'nl'
      ? 'Vragen? Antwoord gerust op deze mail — we lezen mee.'
      : 'Questions? Just reply to this email — we read along.';
  const unsubLine =
    lang === 'nl'
      ? 'Je krijgt deze mail omdat je Bondable gebruikt. Uitschrijven voor dit soort berichten kan met één klik.'
      : 'You receive this email because you use Bondable. Unsubscribe from this kind of message with one click.';
  const unsubCta = lang === 'nl' ? 'Uitschrijven' : 'Unsubscribe';
  const legal =
    lang === 'nl'
      ? 'Bondable · Vlaanderen, België'
      : 'Bondable · Flanders, Belgium';

  return (
    <div
      style={{
        backgroundColor: C.canvas,
        padding: '24px 12px',
        fontFamily: FONT_BODY,
        color: C.ink,
      }}
    >
      {/* Envelope meta — mimics the mail client header rows. */}
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto 12px',
          fontSize: 13,
          color: C.muted,
          lineHeight: 1.6,
        }}
      >
        <div>
          <span style={{ display: 'inline-block', width: 76, color: C.muted }}>
            {fromLabel}
          </span>
          <span style={{ color: C.ink, fontWeight: 600 }}>Bondable</span>{' '}
          <span>&lt;no-reply@bondable.be&gt;</span>
        </div>
        <div>
          <span style={{ display: 'inline-block', width: 76, color: C.muted }}>
            {subjectLabel}
          </span>
          <span style={{ color: C.ink }}>{copy.subject}</span>
        </div>
      </div>

      {/* The email body, a single centered card column. */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{
          maxWidth: 600,
          width: '100%',
          margin: '0 auto',
          borderCollapse: 'collapse',
          backgroundColor: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <tbody>
          {/* Teal header band with the wordmark (Georgia display fallback). */}
          <tr>
            <td
              style={{
                backgroundColor: C.headerBg,
                padding: '20px 32px',
              }}
            >
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 600,
                  color: C.primaryText,
                  letterSpacing: '-0.01em',
                }}
              >
                Bondable
              </span>
            </td>
          </tr>

          {/* Body */}
          <tr>
            <td style={{ padding: '32px' }}>
              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 24,
                  lineHeight: 1.25,
                  fontWeight: 600,
                  color: C.ink,
                  margin: '0 0 16px',
                  letterSpacing: '-0.01em',
                }}
              >
                {copy.subject}
              </h1>

              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: C.ink,
                    margin: '0 0 16px',
                  }}
                >
                  {p}
                </p>
              ))}

              {/* CTA button placeholder (bulletproof-ish table button). */}
              <table
                role="presentation"
                cellPadding={0}
                cellSpacing={0}
                style={{ margin: '8px 0 4px', borderCollapse: 'collapse' }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        backgroundColor: C.primary,
                        borderRadius: 8,
                        padding: '12px 22px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.primaryText,
                          textDecoration: 'none',
                        }}
                      >
                        {copy.cta}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: C.muted,
                  margin: '20px 0 0',
                }}
              >
                {supportLine}
              </p>
            </td>
          </tr>

          {/* Footer */}
          <tr>
            <td
              style={{
                borderTop: `1px solid ${C.border}`,
                padding: '20px 32px',
              }}
            >
              {showUnsub ? (
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: C.footerText,
                    margin: '0 0 8px',
                  }}
                >
                  {unsubLine}{' '}
                  <span
                    style={{
                      color: C.muted,
                      textDecoration: 'underline',
                    }}
                  >
                    {unsubCta}
                  </span>
                </p>
              ) : null}
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: C.footerText,
                  margin: 0,
                }}
              >
                {legal}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default EmailPreview;
