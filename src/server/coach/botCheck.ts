/**
 * botCheck.ts — proof that a human is on the other end.
 *
 * WHY TURNSTILE AND NOT VERCEL BOTID: BotID declares `next: '*'` as a peer
 * dependency and its client integration relies on Next.js rewrites. Bondable is
 * a Vite SPA, so BotID does not fit the stack today — being on Vercel Pro is
 * about the plan, not the framework. Turnstile is framework-agnostic, free, and
 * EU-hosted-friendly.
 *
 * The seam is deliberate: `verifyHuman` is the only thing the handler calls, so
 * swapping in BotID (or hCaptcha) later is one file, not a refactor.
 *
 * NOT CONFIGURED = NOT ENFORCED. Without `TURNSTILE_SECRET_KEY` this returns
 * `skipped`, so local development and the demo build keep working. That is the
 * right default for a layer that can lock people out of a mental-health chat,
 * and the admin console shows plainly whether it is active — a security control
 * that is silently off is worse than one that is visibly off.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type BotCheckOutcome = 'human' | 'failed' | 'skipped';

export interface BotCheckResult {
  outcome: BotCheckOutcome;
  /** Cloudflare's error codes, for the server log. Never shown to the visitor. */
  codes?: string[];
}

/** True when a bot check is configured and will actually be enforced. */
export function isBotCheckConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyHuman(
  token: string | undefined,
  remoteIp: string | undefined,
): Promise<BotCheckResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return { outcome: 'skipped' };

  // Configured but no token: that is a fail, not a skip. Anything else would
  // let a caller opt out of the check by simply omitting the field.
  if (!token) return { outcome: 'failed', codes: ['missing-input-response'] };

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    const result = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    return result.success
      ? { outcome: 'human' }
      : { outcome: 'failed', codes: result['error-codes'] };
  } catch (error) {
    // Cloudflare unreachable. Fail OPEN: this layer filters scripted traffic,
    // and the spend ceiling still bounds the damage. Blocking every visitor
    // because a third party is down is the worse outcome for a support tool.
    console.error('[coach] turnstile unreachable, allowing through', error);
    return { outcome: 'skipped' };
  }
}
