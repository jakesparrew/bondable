/**
 * turnstileClient.ts — browser half of the bot check.
 *
 * Renders Cloudflare Turnstile in invisible mode and hands back a fresh token
 * per message. Invisible rather than a visible puzzle: this is a mental-health
 * chat, and making someone prove their humanity before they can say they are
 * struggling is a cost we should not charge them.
 *
 * NO SITE KEY = NO-OP. Everything here returns `undefined` when
 * `VITE_TURNSTILE_SITE_KEY` is unset, so local development and the demo build
 * are unaffected. The server mirrors that rule: it only enforces when its own
 * secret is configured (see `src/server/coach/botCheck.ts`).
 *
 * The script is loaded lazily on first use — it is a third-party request, and
 * it has no business firing on a page where nobody is going to chat.
 */

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      size?: 'invisible' | 'normal' | 'flexible';
      callback?: (token: string) => void;
      'error-callback'?: () => void;
    },
  ) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** How long to wait for a token before giving up and sending none. */
const TOKEN_TIMEOUT_MS = 10_000;

function siteKey(): string | undefined {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

/** True when a bot check is configured for the browser. */
export function isTurnstileEnabled(): boolean {
  return Boolean(siteKey());
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile script failed'));
    document.head.appendChild(script);
  }).catch((error) => {
    // Allow a later attempt rather than caching the failure forever — a
    // transient network blip should not disable the check for the session.
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

let widgetId: string | null = null;
let container: HTMLElement | null = null;

/**
 * Resolver for the call currently waiting on a token.
 *
 * Turnstile binds its callback once, at `render`. Closing over the first
 * call's `resolve` would mean every later call settles a promise that is
 * already done while its own caller waits for the timeout — so the callback
 * indirects through this instead.
 */
let pending: ((token?: string) => void) | null = null;

function settle(token?: string): void {
  const resolve = pending;
  pending = null;
  resolve?.(token);
}

/**
 * Get a fresh Turnstile token.
 *
 * Returns `undefined` when Turnstile is not configured, the script cannot
 * load, or no token arrives in time. That is intentional: the SERVER decides
 * whether a missing token is fatal. Blocking the send here would mean a
 * Cloudflare outage silently takes the chat down from the client side, where
 * nobody would think to look.
 */
export async function getTurnstileToken(): Promise<string | undefined> {
  const key = siteKey();
  if (!key) return undefined;

  try {
    await loadScript();
    const api = window.turnstile;
    if (!api) return undefined;

    if (!container) {
      container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
    }

    // One outstanding request at a time. A second concurrent call would race
    // for the same widget and the same callback; the caller can simply retry.
    if (pending) return undefined;

    return await new Promise<string | undefined>((resolve) => {
      const timer = window.setTimeout(() => settle(undefined), TOKEN_TIMEOUT_MS);
      pending = (token) => {
        window.clearTimeout(timer);
        resolve(token);
      };

      if (widgetId === null) {
        widgetId = api.render(container!, {
          sitekey: key,
          size: 'invisible',
          callback: (token) => settle(token),
          'error-callback': () => settle(undefined),
        });
      } else {
        // Tokens are single-use: reset before asking for another, or the
        // widget hands back the spent one and the server rejects it.
        api.reset(widgetId);
      }

      api.execute(widgetId);
    });
  } catch {
    return undefined;
  }
}
