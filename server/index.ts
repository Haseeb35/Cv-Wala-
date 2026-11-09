import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aiEnabled, improveBullets, writeLetter } from "./ai";
import { APP_ORIGINS, clientKey, createDailyBudget, createLimiter, isAllowedOrigin, parseOrigins } from "./guard";

const app = express();

/** A positive number from the environment, or the default. */
const setting = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// On a host behind a proxy (Render, Railway, Fly, Nginx…) every request seems
// to come from the proxy, so all visitors would share one limit. TRUST_PROXY=1
// (one proxy in front) makes Express read the real address from X-Forwarded-For.
// Only set it when there really is a proxy: otherwise the header can be faked.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) app.set("trust proxy", trustProxy === "true" ? true : /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);

// Who may call the API from a browser: the site this server hosts (same host),
// the iOS/Android apps, and any extra sites in ALLOWED_ORIGINS.
const allowedOrigins = [...APP_ORIGINS, ...parseOrigins(process.env.ALLOWED_ORIGINS)];
const originOk = (req: express.Request) => isAllowedOrigin(req.header("origin"), req.header("host"), allowedOrigins);

app.use(cors((req, done) => done(null, { origin: originOk(req as express.Request) })));
app.use(express.json({ limit: "64kb" }));

// CORS alone only hides the answer from other websites; the AI call would
// still run and cost money. So requests from other sites are refused outright.
app.use("/api", (req, res, next) => {
  if (originOk(req)) return next();
  res.status(403).json({ error: "This server only answers the CV Wala app." });
});

// Limits on the AI buttons: per visitor (per minute and per day) and one
// ceiling for everyone together, which caps the daily bill even if someone
// spreads requests over many addresses.
const perMinute = createLimiter({ windowMs: 60_000, max: setting("AI_PER_MINUTE", 5) });
const perDay = createLimiter({ windowMs: 24 * 60 * 60_000, max: setting("AI_PER_DAY", 40) });
const dailyBudget = createDailyBudget(setting("AI_DAILY_BUDGET", 300));
setInterval(() => {
  perMinute.sweep();
  perDay.sweep();
}, 10 * 60_000).unref();

const tooMany = (res: express.Response, retryAfterSec: number, error: string) => {
  res.set("Retry-After", String(retryAfterSec));
  res.status(429).json({ error });
};

app.use("/api", (req, res, next) => {
  if (req.method !== "POST") return next();
  const key = clientKey(req.ip);
  const now = Date.now();
  const today = perDay.hit(key, now, false);
  if (!today.ok) return tooMany(res, today.retryAfterSec, "You've used the AI helper a lot today. It will be back tomorrow; everything else still works.");
  const minute = perMinute.hit(key, now);
  if (!minute.ok) return tooMany(res, minute.retryAfterSec, "Please wait a minute before asking the AI again.");
  perDay.hit(key, now);
  next();
});

/** Spend one call from today's budget, or answer that the AI is resting. */
const spend = (res: express.Response) => {
  if (!aiEnabled || dailyBudget.take()) return true; // without a key nothing is spent
  res.status(503).json({ error: "The AI helper is resting for today. Everything else in CV Wala still works." });
  return false;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiEnabled });
});

app.post("/api/improve", async (req, res, next) => {
  try {
    const bullets = Array.isArray(req.body?.bullets) ? req.body.bullets.map((b: unknown) => str(b, 300)).filter(Boolean).slice(0, 8) : [];
    if (!bullets.length) return res.status(400).json({ error: "Add at least one point." });
    if (!spend(res)) return;
    res.json(await improveBullets(bullets, str(req.body?.jobTitle, 80)));
  } catch (e) {
    next(e);
  }
});

app.post("/api/letter", async (req, res, next) => {
  try {
    const cv = req.body?.cv;
    const letter = req.body?.letter;
    if (!cv || !letter) return res.status(400).json({ error: "CV and job details are required." });
    if (!spend(res)) return;
    res.json(await writeLetter(JSON.stringify(cv).slice(0, 12000), JSON.stringify(letter).slice(0, 6000)));
  } catch (e) {
    next(e);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = (err as { status?: number })?.status;
  res.status(status === 503 ? 503 : 502).json({ error: (err as Error)?.message ?? "AI service failed" });
});

// In production the same server also hosts the web app.
if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`CV Wala API on http://localhost:${port} (AI ${aiEnabled ? "on" : "off — set ANTHROPIC_API_KEY"})`));
