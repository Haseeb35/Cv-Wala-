// Protection for the paid AI endpoints. Plain functions with no Express in
// them, so they can be tested on their own (server/guard.test.ts).

type Hit = { count: number; resetAt: number };
export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/** At most `max` requests per `windowMs` for each key (one person or network). */
export function createLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, Hit>();

  return {
    /** Counts the request when `consume` is true; with false it only looks. */
    hit(key: string, now = Date.now(), consume = true): LimitResult {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (consume) hits.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true };
      }
      if (entry.count >= max) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
      if (consume) entry.count++;
      return { ok: true };
    },

    /** Forget finished windows, so memory doesn't grow with every visitor ever seen. */
    sweep(now = Date.now()) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    },

    get size() {
      return hits.size;
    },
  };
}

/**
 * A ceiling on AI calls per UTC day across everyone. Per-person limits can be
 * dodged with many addresses; this can't, so it caps the worst-case bill.
 */
export function createDailyBudget(max: number) {
  let day = "";
  let used = 0;
  return {
    take(now = Date.now()): boolean {
      const today = new Date(now).toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        used = 0;
      }
      if (used >= max) return false;
      used++;
      return true;
    },
    get used() {
      return used;
    },
  };
}

/**
 * The key a visitor is counted under. IPv4 addresses count one by one. An IPv6
 * user usually controls a whole /64 network (billions of addresses), so IPv6
 * is counted per /64; otherwise changing address would reset the limit.
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return "unknown";
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip;
  return `${expandIPv6(ip).split(":").slice(0, 4).join(":")}::/64`;
}

function expandIPv6(ip: string): string {
  const address = ip.split("%")[0].toLowerCase(); // drop a zone like %eth0
  if (!address.includes("::")) return address.split(":").map((g) => g.padStart(4, "0")).join(":");
  const [head, tail] = address.split("::");
  const front = head ? head.split(":") : [];
  const back = tail ? tail.split(":") : [];
  const zeros = Array(Math.max(0, 8 - front.length - back.length)).fill("0");
  return [...front, ...zeros, ...back].map((g) => g.padStart(4, "0")).join(":");
}

/** Where the iOS and Android apps run from (Capacitor's built-in origins). */
export const APP_ORIGINS = ["capacitor://localhost", "https://localhost"];

/** "https://a.com, https://b.com/" → ["https://a.com", "https://b.com"] */
export function parseOrigins(list: string | undefined): string[] {
  return (list ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * Whether a browser request may use the API: the app's own site (same host),
 * the mobile apps, or an origin listed in ALLOWED_ORIGINS. Requests without an
 * Origin header aren't cross-site browser requests; the rate limits still
 * apply to them.
 */
export function isAllowedOrigin(origin: string | undefined, host: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}
