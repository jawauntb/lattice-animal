import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QUESTIONS } from './public/jev.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(compression());
app.use(express.json({ limit: '1mb' }));
const isProd = process.env.NODE_ENV === 'production';

async function proxyThink(req, res) {
  const url = process.env.THINK_URL;
  if (!url) {
    res.status(503).json({ ok: false, reason: "no-gpu" });
    return;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(req.body || {}),
        token: process.env.THINK_TOKEN || "",
      }),
      signal: AbortSignal.timeout(28000),
    });
    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch {
    res.status(504).json({ ok: false, reason: "gpu-timeout" });
  }
}

async function thinkStatus(_req, res) {
  const url = process.env.THINK_STATUS_URL || process.env.THINK_URL;
  if (!url) {
    res.status(503).json({ ok: false, reason: "no-gpu" });
    return;
  }
  try {
    const statusUrl = process.env.THINK_STATUS_URL || url;
    const r = await fetch(statusUrl, { signal: AbortSignal.timeout(20000) });
    const data = await r.json();
    res.status(200).json(data);
  } catch {
    res.status(504).json({ ok: false, reason: "gpu-timeout" });
  }
}

app.post("/think", proxyThink);
app.get("/think/status", thinkStatus);

// Jev is TypeSafe's System One model, published on OpenRouter as
// `typesafe/jev-latest` — typed decisions, not text to parse. We still ask
// it to answer QUESTIONS in the same {answers: {...}} envelope the field
// already understands, over OpenRouter's standard chat-completions API.
const JEV_MODEL = "typesafe/jev-latest";
const JEV_SYSTEM_PROMPT = [
  "You are Jev, a System One gut-check over lattice-animal field state.",
  "You do not write prose. Reply with exactly one JSON object and nothing else:",
  '{"answers":{',
  '  "eat": {"noul": <0..1>},',
  '  "compete": {"noul": <0..1>},',
  '  "act": {"choice": "wander"|"spawn"|"fission"|"hold", "confidence": <0..1>},',
  '  "morph": {"choice": "P-pentomino"|"L-tetromino"|"T-tetromino"|"S-tetromino"|"none", "confidence": <0..1>},',
  '  "one_body": {"score": <0..2>}',
  "}}",
  "Answer every key in `questions` using its own instructions and criteria.",
].join("\n");

async function proxyDecide(req, res) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.status(503).json({ ok: false, reason: "no-jev" });
    return;
  }
  const state = req.body && req.body.state;
  if (!state || typeof state !== "object") {
    res.status(400).json({ ok: false, reason: "bad-state" });
    return;
  }
  const t0 = Date.now();
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://latticeanimal-production.up.railway.app",
        "X-Title": "Lattice Animal",
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: JEV_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify({ state, questions: QUESTIONS }) },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content;
    let answers = null;
    if (typeof raw === "string") {
      try { answers = JSON.parse(raw)?.answers || null; } catch { answers = null; }
    } else if (raw && typeof raw === "object") {
      answers = raw.answers || raw;
    }
    if (!r.ok || !answers) {
      res.status(r.ok ? 502 : r.status).json({ ok: false, reason: "jev-down" });
      return;
    }
    res.status(200).json({
      ok: true,
      model: data.model || JEV_MODEL,
      answers,
      ms: Date.now() - t0,
    });
  } catch {
    res.status(504).json({ ok: false, reason: "jev-timeout" });
  }
}

app.post("/decide", proxyDecide);
app.get("/decide/status", (_req, res) => {
  res.status(200).json({ ok: !!process.env.OPENROUTER_API_KEY, model: JEV_MODEL });
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '1h' : 0,
  etag: true,
  setHeaders: (res, filePath) => {
    if (!isProd || filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store");
    }
  },
}));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.listen(port, () => {
  console.log(`lattice-animal listening on http://localhost:${port}`);
});
