/**
 * deviceBudget.ts — a per-device turn allowance the browser cannot forge.
 *
 * State lives in an HMAC-signed, httpOnly cookie. The signature is the whole
 * point: a plain cookie (or localStorage) is a number the visitor edits, which
 * makes it a suggestion rather than a budget.
 *
 * WHAT THIS DOES AND DOES NOT BUY YOU — be honest about it:
 *  - It cannot be *edited*: tampering fails the signature and the budget resets
 *    to zero used, not to unlimited.
 *  - It CAN be *discarded*: clearing cookies earns a fresh allowance, same as
 *    any anonymous limit. That is fine. This layer exists to shape ordinary
 *    visitors, and it degrades gracefully — someone clearing cookies to keep
 *    talking also loses their conversation, which is exactly the moment the
 *    "save this" prompt earns its keep.
 *  - Determined abuse is stopped by the IP throttle and, ultimately, by the
 *    global spend ceiling. Those are the guarantees; this is the polite fence.
 *
 * The cookie carries a turn count and a random device id — no personal data,
 * nothing about the conversation.
 */

const COOKIE_NAME = 'bnd_coach';

/** Rolling window the allowance is measured over. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

export interface DeviceBudget {
  /** Random, opaque. Used to key throttles without touching an IP. */
  deviceId: string;
  /** Turns spent inside the current window. */
  used: number;
  /** Start of the current window, epoch ms. */
  windowStart: number;
}

function secret(): string {
  // A fixed development fallback keeps local work frictionless. It is NOT a
  // safe production default, which is why `isDeviceBudgetSecure()` reports on
  // it and the admin console surfaces that.
  return process.env.COACH_COOKIE_SECRET || 'bondable-dev-cookie-secret';
}

/** True when a real secret is configured — surfaced in the admin console. */
export function isDeviceBudgetSecure(): boolean {
  return Boolean(process.env.COACH_COOKIE_SECRET);
}

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(mac));
}

/** Constant-time compare, so a signature cannot be brute-forced byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}

function freshBudget(): DeviceBudget {
  return { deviceId: randomId(), used: 0, windowStart: Date.now() };
}

/**
 * Read the budget from the request.
 *
 * Any problem — absent, malformed, bad signature, expired window — yields a
 * FRESH budget with `used: 0`. Note what that means: tampering does not grant
 * extra turns, it merely fails to carry the old count forward, and the IP
 * throttle still applies to the same visitor.
 */
export async function readBudget(request: Request): Promise<DeviceBudget> {
  const header = request.headers.get('cookie');
  if (!header) return freshBudget();

  const raw = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return freshBudget();

  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return freshBudget();

  const expected = await sign(payload);
  if (!safeEqual(signature, expected)) return freshBudget();

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (
      typeof parsed?.deviceId !== 'string' ||
      typeof parsed?.used !== 'number' ||
      typeof parsed?.windowStart !== 'number'
    ) {
      return freshBudget();
    }
    // Window rolled over: keep the device id (so throttles stay consistent for
    // this browser) but reset the allowance.
    if (Date.now() - parsed.windowStart > WINDOW_MS) {
      return { deviceId: parsed.deviceId, used: 0, windowStart: Date.now() };
    }
    return { deviceId: parsed.deviceId, used: parsed.used, windowStart: parsed.windowStart };
  } catch {
    return freshBudget();
  }
}

/**
 * Serialise the budget into a `Set-Cookie` value.
 *
 * `Secure` is derived from the request rather than hardcoded: browsers treat
 * `http://localhost` as a secure context, but relying on that quirk means the
 * budget silently stops persisting the moment anyone runs the dev server on a
 * LAN address or through a plain-http tunnel. Deriving it is one line and
 * removes the whole class of "works on my machine" cookie bugs.
 */
export async function budgetCookie(budget: DeviceBudget, request: Request): Promise<string> {
  const payload = b64url(new TextEncoder().encode(JSON.stringify(budget)));
  const value = `${payload}.${await sign(payload)}`;
  const maxAge = Math.ceil(WINDOW_MS / 1000);

  const isHttps =
    new URL(request.url).protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https';

  // httpOnly: script on the page must not be able to read or rewrite it.
  // SameSite=Lax: the chat is same-site, and Lax avoids the third-party
  // cookie blocking that would silently reset everyone's budget.
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    isHttps ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
}
