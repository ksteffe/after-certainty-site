type RateLimitEntry = {
  timestamps: number[];
};

type DedupEntry = {
  expiresAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();
const dedupStore = new Map<string, DedupEntry>();

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function rateLimitMax(): number {
  return readPositiveIntEnv("SEMANTIC_REPORT_RATE_LIMIT_MAX", 5);
}

export function rateLimitWindowMs(): number {
  return readPositiveIntEnv("SEMANTIC_REPORT_RATE_LIMIT_WINDOW_MS", 3_600_000);
}

export function dedupWindowMs(): number {
  return readPositiveIntEnv("SEMANTIC_REPORT_DEDUP_WINDOW_MS", 300_000);
}

function pruneRateLimit(entry: RateLimitEntry, now: number, windowMs: number): number[] {
  return entry.timestamps.filter((ts) => now - ts < windowMs);
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowMs = rateLimitWindowMs();
  const max = rateLimitMax();
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };
  const active = pruneRateLimit(entry, now, windowMs);

  if (active.length >= max) {
    const oldest = active[0] ?? now;
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
  }

  active.push(now);
  rateLimitStore.set(key, { timestamps: active });
  return { allowed: true };
}

export function checkDuplicate(fingerprint: string): boolean {
  const now = Date.now();
  const windowMs = dedupWindowMs();
  const existing = dedupStore.get(fingerprint);
  if (existing && existing.expiresAt > now) {
    return true;
  }
  dedupStore.set(fingerprint, { expiresAt: now + windowMs });
  return false;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function hashFingerprint(parts: string[]): string {
  let hash = 0;
  const value = parts.join("|");
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

/** Test helper — clears in-memory stores. */
export function resetRateLimitStoresForTests(): void {
  rateLimitStore.clear();
  dedupStore.clear();
}
