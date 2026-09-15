import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '1h' : 0,
  etag: true,
  setHeaders: (res) => {
    if (!isProd) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.listen(port, () => {
  console.log(`lattice-animal listening on http://localhost:${port}`);
});
