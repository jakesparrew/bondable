/**
 * catalogue.ts — the model catalogue, fetched live from the Gateway.
 *
 * Prices are NEVER hardcoded here. A pricing table copied into source drifts
 * silently and then the cost figures in the admin console are confidently
 * wrong, which is worse than showing nothing. The Gateway publishes per-token
 * prices on `/v1/models`; that is the only source used.
 *
 * Cached in module scope for a few minutes: the catalogue changes rarely, and
 * the admin console and every cost calculation would otherwise re-fetch ~300
 * model records constantly.
 */

const MODELS_URL = (
  process.env.COACH_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1/chat/completions'
).replace(/\/chat\/completions$/, '/models');

const CACHE_TTL_MS = 5 * 60_000;

export interface ModelInfo {
  id: string;
  name: string;
  owner: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  /** USD per single input token, as published. Multiply by 1e6 for the /1M figure. */
  inputPerToken: number | null;
  outputPerToken: number | null;
}

let cache: { models: ModelInfo[]; at: number } | null = null;

function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Fetch the catalogue. Returns `[]` on failure rather than throwing — a model
 * list is a convenience for the admin screen, and losing it must not break
 * either the console or a conversation in progress.
 */
export async function fetchCatalogue(apiKey: string): Promise<ModelInfo[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.models;

  try {
    const response = await fetch(MODELS_URL, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return cache?.models ?? [];

    const body = (await response.json()) as { data?: unknown[] };
    const models: ModelInfo[] = (body.data ?? [])
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .filter((m) => m.type === 'language')
      .map((m) => {
        const pricing = (m.pricing ?? {}) as Record<string, unknown>;
        return {
          id: String(m.id),
          name: typeof m.name === 'string' ? m.name : String(m.id),
          owner: typeof m.owned_by === 'string' ? m.owned_by : '',
          contextWindow: num(m.context_window),
          maxOutputTokens: num(m.max_tokens),
          inputPerToken: num(pricing.input),
          outputPerToken: num(pricing.output),
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    cache = { models, at: now };
    return models;
  } catch (error) {
    console.error('[coach] catalogue fetch failed', error);
    return cache?.models ?? [];
  }
}

/** Look up one model's published prices. `null` when unknown. */
export async function priceFor(
  apiKey: string,
  modelId: string,
): Promise<{ inputPerToken: number; outputPerToken: number } | null> {
  const models = await fetchCatalogue(apiKey);
  const match = models.find((m) => m.id === modelId);
  if (!match || match.inputPerToken == null || match.outputPerToken == null) return null;
  return { inputPerToken: match.inputPerToken, outputPerToken: match.outputPerToken };
}
