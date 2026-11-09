import { describe, expect, it } from "vitest";
import { APP_ORIGINS, clientKey, createDailyBudget, createLimiter, isAllowedOrigin, parseOrigins } from "./guard";

describe("createLimiter", () => {
  it("allows up to max requests in a window, then says how long to wait", () => {
    const limit = createLimiter({ windowMs: 60_000, max: 3 });
    const t = 1_000_000;
    expect(limit.hit("a", t).ok).toBe(true);
    expect(limit.hit("a", t + 1).ok).toBe(true);
    expect(limit.hit("a", t + 2).ok).toBe(true);
    expect(limit.hit("a", t + 10_000)).toEqual({ ok: false, retryAfterSec: 50 });
  });

  it("starts a fresh window once the old one ends", () => {
    const limit = createLimiter({ windowMs: 60_000, max: 1 });
    expect(limit.hit("a", 0).ok).toBe(true);
    expect(limit.hit("a", 59_999).ok).toBe(false);
    expect(limit.hit("a", 60_000).ok).toBe(true);
  });

  it("counts each key separately", () => {
    const limit = createLimiter({ windowMs: 60_000, max: 1 });
    expect(limit.hit("a", 0).ok).toBe(true);
    expect(limit.hit("b", 0).ok).toBe(true);
    expect(limit.hit("a", 1).ok).toBe(false);
  });

  it("can look without counting", () => {
    const limit = createLimiter({ windowMs: 60_000, max: 1 });
    expect(limit.hit("a", 0, false).ok).toBe(true);
    expect(limit.hit("a", 1, false).ok).toBe(true);
    expect(limit.hit("a", 2).ok).toBe(true);
    expect(limit.hit("a", 3, false).ok).toBe(false);
  });

  it("forgets finished windows when swept", () => {
    const limit = createLimiter({ windowMs: 1000, max: 5 });
    limit.hit("a", 0);
    limit.hit("b", 500);
    limit.sweep(1200);
    expect(limit.size).toBe(1);
  });
});

describe("createDailyBudget", () => {
  it("stops at the daily ceiling and resets on the next UTC day", () => {
    const budget = createDailyBudget(2);
    const day1 = Date.UTC(2026, 10, 9, 10);
    expect(budget.take(day1)).toBe(true);
    expect(budget.take(day1)).toBe(true);
    expect(budget.take(day1 + 1000)).toBe(false);
    expect(budget.take(Date.UTC(2026, 10, 10, 0, 0, 1))).toBe(true);
    expect(budget.used).toBe(1);
  });
});

describe("clientKey", () => {
  it("keeps IPv4 addresses as they are", () => {
    expect(clientKey("203.0.113.7")).toBe("203.0.113.7");
    expect(clientKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("groups IPv6 addresses by /64, however they are written", () => {
    const a = clientKey("2001:db8:abcd:12::1");
    expect(a).toBe("2001:0db8:abcd:0012::/64");
    expect(clientKey("2001:db8:abcd:12:ffff:ffff:ffff:fffe")).toBe(a);
    expect(clientKey("2001:0DB8:ABCD:0012:0:0:0:9%eth0")).toBe(a);
    expect(clientKey("2001:db8:abcd:13::1")).not.toBe(a);
  });

  it("has a key for a missing address", () => {
    expect(clientKey(undefined)).toBe("unknown");
  });
});

describe("origins", () => {
  const allowed = [...APP_ORIGINS, ...parseOrigins(" https://cvwala.pk/, https://www.cvwala.pk ")];

  it("reads a comma-separated list", () => {
    expect(parseOrigins("https://a.com/, https://b.com")).toEqual(["https://a.com", "https://b.com"]);
    expect(parseOrigins(undefined)).toEqual([]);
  });

  it("allows the mobile apps, listed sites and the same host", () => {
    expect(isAllowedOrigin("capacitor://localhost", "api.cvwala.pk", allowed)).toBe(true);
    expect(isAllowedOrigin("https://localhost", "api.cvwala.pk", allowed)).toBe(true);
    expect(isAllowedOrigin("https://www.cvwala.pk", "api.cvwala.pk", allowed)).toBe(true);
    expect(isAllowedOrigin("https://cvwala.onrender.com", "cvwala.onrender.com", allowed)).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", "localhost:5173", allowed)).toBe(true);
  });

  it("refuses other websites and lookalikes", () => {
    expect(isAllowedOrigin("https://evil.example", "cvwala.pk", allowed)).toBe(false);
    expect(isAllowedOrigin("https://cvwala.pk.evil.example", "cvwala.pk", allowed)).toBe(false);
    expect(isAllowedOrigin("http://localhost:5173", "cvwala.pk", allowed)).toBe(false);
    expect(isAllowedOrigin("null", "cvwala.pk", allowed)).toBe(false);
  });

  it("lets requests without an Origin through (the rate limits still apply)", () => {
    expect(isAllowedOrigin(undefined, "cvwala.pk", allowed)).toBe(true);
  });
});
