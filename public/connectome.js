// Stacked / looped fly connectome.
// A compiled subgraph of the Janelia male CNS heading circuit
// (male-cns:v1.0 via neuPrint). Each mind runs the same wiring, K times
// per tick. The readout writes into that mind's V. Species differ by
// which cells they listen through and how many loops they take.

const PORT = {
  lion:     { sensors: ["PEN_a(PEN1)"],           readouts: ["EPG"],              k: 3 },
  parakeet: { sensors: ["PEG"],                   readouts: ["EPG"],              k: 4 },
  wolf:     { sensors: ["EPG"],                   readouts: ["EPG"],              k: 3 },
  elephant: { sensors: ["Delta7"],                readouts: ["Delta7"],           k: 2 },
  whale:    { sensors: ["EPG", "EL"],             readouts: ["EL"],               k: 2 },
  frog:     { sensors: ["PEN_b(PEN2)"],           readouts: ["EPG"],              k: 3, pulse: true },
  owl:      { sensors: ["Delta7"],                readouts: ["PEG"],              k: 2 },
  dolphin:  { sensors: ["PEN_a(PEN1)", "PEN_b(PEN2)"], readouts: ["EPG"],         k: 5 },
  cricket:  { sensors: ["EPG", "PEG", "EL"],      readouts: ["EPG"],              k: 3 },
  sparrow:  { sensors: ["PEG"],                   readouts: ["PEN_a(PEN1)"],      k: 3 },
};
const FALLBACK = { sensors: ["EPG"], readouts: ["EPG"], k: 3 };

let graph = null;
let byType = null;
const typeIndex = new Map();

export function ready() { return !!graph; }
export function nodeCount() { return graph ? graph.nodes.length : 0; }
export function edgeCount() { return graph ? graph.edges.length : 0; }
export function meta() {
  if (!graph) return null;
  return {
    source: graph.source,
    dataset: graph.dataset,
    motif: graph.motif,
    n: graph.nodes.length,
    e: graph.edges.length,
  };
}

export async function load() {
  if (graph) return graph;
  const res = await fetch("/data/fly-cx.json", { cache: "no-store" });
  if (!res.ok) return null;
  graph = await res.json();
  byType = new Map();
  for (const n of graph.nodes) {
    if (!byType.has(n.type)) byType.set(n.type, []);
    byType.get(n.type).push(n.i);
    typeIndex.set(n.i, n.type);
  }
  return graph;
}

function portFor(key) {
  return (key && PORT[key]) || FALLBACK;
}

function indicesFor(types) {
  const out = [];
  for (const t of types) {
    const ids = byType.get(t);
    if (ids) for (const i of ids) out.push(i);
  }
  return out;
}

export function bind(mind) {
  if (!graph || !mind) return;
  if (mind.circuit && mind.circuit.length === graph.nodes.length) return;
  const n = graph.nodes.length;
  mind.circuit = new Float32Array(n);
  const epg = (byType.get("EPG") || []).slice();
  const bumpAt = epg.length ? epg[((mind.orgSeed * epg.length) | 0) % epg.length] : 0;
  for (let i = 0; i < n; i++) {
    const n0 = graph.nodes[i];
    const dx = n0.x - graph.nodes[bumpAt].x;
    const dy = n0.y - graph.nodes[bumpAt].y;
    const d2 = dx * dx + dy * dy;
    mind.circuit[i] = 0.42 * Math.exp(-d2 * 3.2) + ((i * 13 + ((mind.orgSeed * 997) | 0)) % 7 - 3) * 0.01;
  }
  mind.circuitE = 0;
  mind.thought = 0;
  mind.circuitK = 3;
}

function tanh(x) {
  if (x < -4) return -1;
  if (x > 4) return 1;
  const e = Math.exp(2 * x);
  return (e - 1) / (e + 1);
}

function clamp1(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

export function stepMind(mind, drive, speciesKey, frame) {
  if (!graph || !mind) return 0;
  bind(mind);
  const v = mind.circuit;
  const port = portFor(speciesKey);
  const sensors = indicesFor(port.sensors);
  const readouts = indicesFor(port.readouts);
  const K = port.k;
  mind.circuitK = K;
  let inj = drive;
  if (port.pulse) inj += 0.16 * Math.sin((frame || 0) * 0.08);
  for (let i = 0; i < sensors.length; i++) {
    const idx = sensors[i];
    v[idx] = clamp1(v[idx] + 0.075 * inj);
  }
  const n = v.length;
  if (!stepMind._inc || stepMind._inc.length < n) stepMind._inc = new Float32Array(n);
  const inc = stepMind._inc;
  const edges = graph.edges;
  for (let k = 0; k < K; k++) {
    for (let i = 0; i < n; i++) inc[i] = 0;
    for (let e = 0; e < edges.length; e++) {
      const ed = edges[e];
      inc[ed.t] += tanh(v[ed.s]) * ed.w * ed.sign * 0.072;
    }
    let mean = 0;
    for (let i = 0; i < n; i++) {
      v[i] = v[i] * 0.80 + inc[i];
      mean += v[i];
    }
    mean /= n;
    for (let i = 0; i < n; i++) v[i] = clamp1(v[i] - mean * 0.40);
  }
  let sum = 0, mag = 0, peak = 0;
  if (readouts.length) {
    for (let i = 0; i < readouts.length; i++) {
      const x = v[readouts[i]];
      sum += x;
      const a = x < 0 ? -x : x;
      if (a > peak) peak = a;
    }
    sum /= readouts.length;
  }
  for (let i = 0; i < n; i++) mag += v[i] < 0 ? -v[i] : v[i];
  mind.circuitE = mag / n;
  // A thought is a bump: one cell much brighter than the mean.
  mind.thought = clamp1((peak - mind.circuitE) * 1.35);
  mind.V = clamp1(mind.V + 0.032 * sum);
  return sum;
}

const thinkClock = {
  inflight: false,
  lastAt: 0,
  last: { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: "idle" },
};

export function thinkStats() { return thinkClock.last; }

export function gatherThink(minds, frame) {
  const batch = [];
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    batch.push({
      drive: m._drive || 0,
      species: m._species || "",
      seed: m.orgSeed || 0.37,
    });
  }
  return { field: "live", frame, minds: batch };
}

export function applyThink(minds, payload) {
  if (!payload || !payload.ok || !payload.minds) return;
  const outs = payload.minds;
  const n = Math.min(minds.length, outs.length);
  for (let i = 0; i < n; i++) {
    const m = minds[i];
    const o = outs[i];
    const r = o.readout || 0;
    m.V = clamp1(m.V + 0.045 * r);
    m.deepE = o.e || 0;
    m.deepThought = o.thought || 0;
    m.thought = Math.max(m.thought || 0, o.thought || 0);
    if (o.k) m.circuitK = o.k;
  }
  thinkClock.last = {
    ok: true,
    gpu: !!payload.gpu,
    n: payload.n || 0,
    e: payload.e || 0,
    ms: payload.ms || 0,
    device: payload.device || "L4",
    dataset: payload.dataset || "",
  };
}

export async function requestThink(minds, frame) {
  if (!minds || !minds.length) return null;
  const now = performance.now();
  if (thinkClock.inflight) return null;
  if (now - thinkClock.lastAt < 180) return null;
  thinkClock.inflight = true;
  thinkClock.lastAt = now;
  try {
    const res = await fetch("/think", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(gatherThink(minds, frame)),
    });
    const data = await res.json();
    if (data && data.ok) applyThink(minds, data);
    else thinkClock.last = { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: (data && data.reason) || "down" };
    return data;
  } catch {
    thinkClock.last = { ok: false, gpu: false, n: 0, e: 0, ms: 0, reason: "down" };
    return null;
  } finally {
    thinkClock.inflight = false;
  }
}

export function stats(minds) {
  if (!graph) return { ready: false, n: 0, e: 0, meanE: 0, thoughts: 0, k: 0 };
  let e = 0, t = 0, k = 0, m = 0;
  for (const mind of minds) {
    if (!mind.circuit) continue;
    m++;
    e += mind.circuitE || 0;
    k += mind.circuitK || 0;
    if ((mind.thought || 0) > 0.48) t++;
  }
  const remote = thinkClock.last;
  return {
    ready: true,
    n: graph.nodes.length,
    e: graph.edges.length,
    minds: m,
    meanE: m ? e / m : 0,
    thoughts: t,
    k: m ? k / m : 0,
    dataset: graph.dataset,
    gpu: !!remote.gpu,
    deepN: remote.n || 0,
    deepE: remote.e || 0,
    deepMs: remote.ms || 0,
    think: remote.ok ? (remote.device || "L4") : (remote.reason || "local"),
  };
}

export function draw(ctx, minds, opts) {
  if (!graph || !minds.length) return;
  const cream = opts.cream || "242, 238, 230";
  const frame = opts.frame || 0;
  const skip = !!opts.skipHeavy;
  const gaze = opts.gaze;
  const nodes = graph.nodes;
  const edges = graph.edges;

  const scored = [];
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (!m.circuit) continue;
    const think = (m.thought || 0) > 0.48;
    const near = gaze && ((m.x - gaze.x) ** 2 + (m.y - gaze.y) ** 2) < 170 * 170;
    if (!(m.animalId >= 0 || think || near)) continue;
    scored.push({ m, s: (m.thought || 0) + (m.circuitE || 0) + (think ? 1 : 0) });
  }
  scored.sort((a, b) => b.s - a.s);
  const cap = skip ? 6 : 14;
  ctx.save();
  for (let i = 0; i < scored.length && i < cap; i++) {
    drawOne(ctx, scored[i].m, nodes, edges, cream, frame, skip);
  }
  ctx.restore();
}

function drawOne(ctx, m, nodes, edges, cream, frame, skip) {
  const v = m.circuit;
  const thought = (m.thought || 0) > 0.48;
  const R = thought ? 24 : 19;
  const glow = Math.min(1, 0.35 + (m.circuitE || 0) * 1.4 + (m.thought || 0) * 0.7);

  ctx.strokeStyle = `rgba(${cream}, ${0.16 + 0.18 * glow})`;
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.arc(m.x, m.y, R, 0, Math.PI * 2);
  ctx.stroke();

  if (!skip) {
    ctx.lineWidth = 0.85;
    for (let e = 0; e < edges.length; e++) {
      const ed = edges[e];
      const a = Math.abs(v[ed.s] * v[ed.t]);
      if (a < 0.08) continue;
      const ns = nodes[ed.s], nt = nodes[ed.t];
      ctx.strokeStyle = `rgba(${cream}, ${Math.min(0.62, 0.12 + a * 0.85) * glow})`;
      ctx.beginPath();
      ctx.moveTo(m.x + ns.x * R, m.y + ns.y * R);
      ctx.lineTo(m.x + nt.x * R, m.y + nt.y * R);
      ctx.stroke();
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const a = Math.abs(v[i]);
    if (a < 0.06) continue;
    const n = nodes[i];
    const r = 1.05 + 1.7 * a;
    const tint = n.inh ? "134, 186, 168" : cream;
    ctx.fillStyle = `rgba(${tint}, ${0.28 + 0.70 * a})`;
    ctx.beginPath();
    ctx.arc(m.x + n.x * R, m.y + n.y * R, r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (thought) {
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.35);
    ctx.strokeStyle = `rgba(${cream}, ${0.38 + 0.36 * pulse})`;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(m.x, m.y, R + 4 + pulse * 2.4, 0, Math.PI * 2);
    ctx.stroke();
  }
}
