/**
 * Seo — per-route document head, dependency-free.
 *
 * WHY THIS EXISTS: this is a Vite SPA whose vercel.json rewrites every path to
 * one index.html. Without per-route head management, every route inherits the
 * homepage's title, description AND canonical — telling Google that /find,
 * /pricing and every provider profile are duplicates of "/" and should be
 * dropped from the index. That is strictly worse than shipping no canonical at
 * all, and it silently disables the finder as an acquisition channel.
 *
 * WHY NOT react-helmet-async: v3 detects the React version at runtime and in
 * this app (React 18) it emitted nothing at all — no <head> tags, no data-rh
 * markers, no error. A head manager that can fail silently is worse than none,
 * because SEO breakage is invisible until traffic never arrives. This hook
 * writes to document.head directly: ~60 lines, zero deps, trivially verifiable
 * in the console.
 *
 * NOTE: this is client-side, so crawlers that do not execute JS still see the
 * index.html defaults. Prerendering (vite-plugin-ssg / Vercel prerender) is the
 * follow-up that makes these tags visible to every crawler.
 *
 * Usage: <Seo title="…" description="…" path="/find" /> on any PUBLIC page.
 */

import { useEffect } from 'react';

const SITE = 'https://bondable.be';
const DEFAULT_OG = `${SITE}/og-image.png`;
/** Marks tags we own so re-renders replace rather than duplicate them. */
const OWNED = 'data-seo';

export interface SeoProps {
  /** Page title WITHOUT the brand suffix — appended automatically. */
  title: string;
  description: string;
  /** Route path, e.g. "/find". Drives canonical + og:url. */
  path: string;
  /** Absolute image URL. Defaults to the brand card. */
  image?: string;
  /** For tokenised/thin pages that must never be indexed. */
  noIndex?: boolean;
  /** Optional JSON-LD graph for rich results. */
  jsonLd?: Record<string, unknown>;
}

/** Create-or-update a <meta> keyed by name/property. */
function upsertMeta(keyAttr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(keyAttr, key);
    el.setAttribute(OWNED, '');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(OWNED, '');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const Seo = ({ title, description, path, image, jsonLd, noIndex }: SeoProps) => {
  const fullTitle = title.includes('Bondable') ? title : `${title} — Bondable`;
  const url = `${SITE}${path}`;
  const img = image ?? DEFAULT_OG;
  const jsonLdStr = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Bondable');
    upsertMeta('property', 'og:locale', 'nl_BE');
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:image', img);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', img);

    // robots: only present when we explicitly want the page out of the index.
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noIndex) {
      upsertMeta('name', 'robots', 'noindex,nofollow');
    } else if (robots) {
      robots.remove();
    }

    // Route-scoped JSON-LD: replace any previous one so profiles don't stack.
    const prev = document.head.querySelector(`script[type="application/ld+json"][${OWNED}]`);
    if (prev) prev.remove();
    if (jsonLdStr) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute(OWNED, '');
      s.textContent = jsonLdStr;
      document.head.appendChild(s);
    }
  }, [fullTitle, description, url, img, jsonLdStr, noIndex]);

  return null;
};

export default Seo;
