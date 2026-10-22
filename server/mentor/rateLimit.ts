/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Limits are per server instance. On serverless platforms each instance has
 * its own memory, so production deployments should back this with a shared
 * store (for example Redis) if strict limits are required.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit. Returns 0 when allowed, otherwise seconds until the next request is allowed. */
  check(key: string): number {
    const t = this.now();
    const windowStart = t - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((ts) => ts > windowStart);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.max(1, Math.ceil((recent[0] + this.windowMs - t) / 1000));
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(windowStart);
    return 0;
  }

  private prune(windowStart: number) {
    for (const [key, list] of this.hits) {
      if (list.every((ts) => ts <= windowStart)) this.hits.delete(key);
    }
  }
}
