/** Server-side mentor configuration, read from environment variables. Never sent to the browser. */

export type Effort = 'low' | 'medium' | 'high';

export interface MentorServerConfig {
  provider: 'claude' | 'demo';
  apiKey?: string;
  model: string;
  effort: Effort;
  timeoutMs: number;
  /** Output token cap per reply (thinking + answer). Answers are short; this only bounds cost. */
  maxTokens: number;
  /** Requests allowed per client per window. */
  rateLimit: number;
  rateWindowMs: number;
  /** Honour X-Forwarded-For when deriving the client IP (only behind a trusted proxy). */
  trustProxy: boolean;
}

export const DEFAULT_MODEL = 'claude-opus-5-5';

type Env = Record<string, string | undefined>;

function intFrom(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function readMentorConfig(env: Env): MentorServerConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined;
  const requested = (env.MENTOR_PROVIDER ?? 'auto').trim().toLowerCase();
  // "claude" without a key falls back to demo rather than failing every request.
  const provider: MentorServerConfig['provider'] = requested === 'demo' || !apiKey ? 'demo' : 'claude';
  const effort = (['low', 'medium', 'high'] as const).find((e) => e === env.MENTOR_EFFORT?.trim().toLowerCase()) ?? 'low';
  return {
    provider,
    apiKey,
    model: env.MENTOR_MODEL?.trim() || DEFAULT_MODEL,
    effort,
    timeoutMs: intFrom(env.MENTOR_TIMEOUT_MS, 20_000, 3_000, 60_000),
    maxTokens: intFrom(env.MENTOR_MAX_TOKENS, 2048, 512, 8192),
    rateLimit: intFrom(env.MENTOR_RATE_LIMIT, 30, 1, 1000),
    rateWindowMs: 5 * 60_000,
    trustProxy: env.TRUST_PROXY === '1' || env.VERCEL === '1',
  };
}
