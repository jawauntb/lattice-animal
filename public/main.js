import { Delaunay } from "d3-delaunay";

// ─── Verses (rotate at soft cadence) ─────────────────────────────────────────
const VERSES = [
  "no channel but movement · no commitment but position",
  "a mind for a single cell — and single cells don't count",
  "agreement is a shape they can hold together",
  "the gauge is not given, it is negotiated",
  "each cell asks: which lattice am I in?",
  "committed by staying still on the same map",
  "the body appears where minds refuse to drift apart",
  "movement is the only language they share",
];

// ─── Config ──────────────────────────────────────────────────────────────────
const CFG = {
  seedCount: 128,
  // Gauge negotiation
  spacingInit: 68,
  spacingMin: 46,
  spacingMax: 110,
  gaugeLR: 0.018,          // how fast global gauge follows local consensus
  // Movement
  snapK: 0.075,            // pull toward nearest gauge cell
  neighborK: 0.006,        // pull to become 4-adjacent to a neighbor at gauge distance
  jitterInit: 2.2,         // annealing temperature (position noise)
  jitterFloor: 0.05,       // small idle temperature — enough for shimmer, not drift
  jitterAnneal: 0.9968,
  drag: 0.90,              // velocity damping
  maxSpeed: 3.4,
  // Commitment
  commitDist: 5.5,         // distance-to-cell to be "at" a cell
  commitFrames: 45,        // how long steady before committed
  releaseDist: 13.0,       // drift back into "bound"
  // Rendering
  vectorScale: 9,          // draw velocity × this
  vectorMin: 5,
  vectorMax: 40,
  voronoiAlpha: 0.20,
  trailFade: 0.55,         // lower = longer motion trails
  bgTintR: 5, bgTintG: 6, bgTintB: 12,
};

// ─── DOM / Canvas setup ──────────────────────────────────────────────────────
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
let dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
let W = 0, H = 0;

function resize() {
  dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  minds: [],
  gauge: {
    // origin (cx, cy), rotation theta, spacing s
    cx: 0, cy: 0, theta: 0, s: CFG.spacingInit,
  },
  jitter: CFG.jitterInit,
  paused: false,
  showVoronoi: true,
  showField: true,
  showGhost: false,
  frame: 0,
  verseIndex: 0,
  verseTimer: 0,
};

class Mind {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.gx = 0; this.gy = 0;     // integer gauge coordinate (nearest)
    this.settle = 0;              // frames near a gauge cell
    this.committed = false;
    this.animalId = -1;
    // local gauge estimate (each mind proposes; global averages)
    this.localS = CFG.spacingInit;
    this.localT = 0;
  }
}

function seed(count = CFG.seedCount) {
  state.minds.length = 0;
  const cx = W * 0.5, cy = H * 0.5;
  // Scale radius to viewport with a slight elongation matching aspect
  const R = Math.min(W, H) * 0.46;
  for (let i = 0; i < count; i++) {
    // sunflower-ish scatter with jitter — gives room to breathe
    const t = i * 2.399963;
    const r = R * Math.sqrt((i + 0.5) / count) + (Math.random() - 0.5) * 30;
    const x = cx + Math.cos(t) * r * (W / Math.min(W, H)) + (Math.random() - 0.5) * 22;
    const y = cy + Math.sin(t) * r * (H / Math.min(W, H)) + (Math.random() - 0.5) * 22;
    state.minds.push(new Mind(x, y));
  }
  state.gauge.cx = cx;
  state.gauge.cy = cy;
  state.gauge.theta = (Math.random() - 0.5) * 0.35;
  state.gauge.s = CFG.spacingInit;
  state.jitter = CFG.jitterInit;
  state.frame = 0;
}
seed();

// ─── Gauge math ──────────────────────────────────────────────────────────────
// world <-> gauge coords
function worldToGauge(x, y, g = state.gauge) {
  const dx = x - g.cx, dy = y - g.cy;
  const c = Math.cos(-g.theta), s = Math.sin(-g.theta);
  return { u: (dx * c - dy * s) / g.s, v: (dx * s + dy * c) / g.s };
}
function gaugeToWorld(u, v, g = state.gauge) {
  const c = Math.cos(g.theta), s = Math.sin(g.theta);
  const x = g.cx + (u * c - v * s) * g.s;
  const y = g.cy + (u * s + v * c) * g.s;
  return { x, y };
}
function nearestCell(x, y, g = state.gauge) {
  const { u, v } = worldToGauge(x, y, g);
  return { gx: Math.round(u), gy: Math.round(v) };
}

// ─── Simulation step ─────────────────────────────────────────────────────────
function step() {
  const minds = state.minds;
  if (minds.length < 2) return;

  // Voronoi from current positions
  const pts = new Float64Array(minds.length * 2);
  for (let i = 0; i < minds.length; i++) {
    pts[i * 2] = minds[i].x;
    pts[i * 2 + 1] = minds[i].y;
  }
  const delaunay = new Delaunay(pts);

  // neighbors per point via halfedges
  const neighborsOf = (i) => {
    const arr = [];
    for (const j of delaunay.neighbors(i)) arr.push(j);
    return arr;
  };

  // 1) Local gauge proposals — each mind reads its Voronoi neighbors.
  //    localS = median distance to neighbors ; localT = dominant orientation.
  let meanS = 0, meanC = 0, meanSn = 0, count = 0;
  const neighborsCache = new Array(minds.length);
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const N = neighborsOf(i);
    neighborsCache[i] = N;
    if (N.length === 0) continue;
    const dists = [];
    let sumSin4 = 0, sumCos4 = 0;
    for (const j of N) {
      const dx = minds[j].x - m.x;
      const dy = minds[j].y - m.y;
      const d = Math.hypot(dx, dy);
      dists.push(d);
      // 4-fold orientation (square lattice symmetry)
      const a = Math.atan2(dy, dx);
      sumSin4 += Math.sin(4 * a);
      sumCos4 += Math.cos(4 * a);
    }
    dists.sort((a, b) => a - b);
    const median = dists[Math.floor(dists.length / 2)];
    m.localS = clamp(median, CFG.spacingMin, CFG.spacingMax);
    m.localT = Math.atan2(sumSin4, sumCos4) / 4;
    meanS += m.localS;
    meanC += Math.cos(4 * m.localT);
    meanSn += Math.sin(4 * m.localT);
    count++;
  }

  if (count > 0) {
    const targetS = meanS / count;
    const targetT = Math.atan2(meanSn / count, meanC / count) / 4;
    // Angle wrap: bring current theta into the same fold-fundamental as target
    let dT = targetT - state.gauge.theta;
    while (dT > Math.PI / 4) dT -= Math.PI / 2;
    while (dT < -Math.PI / 4) dT += Math.PI / 2;
    state.gauge.theta += dT * CFG.gaugeLR;
    state.gauge.s += (targetS - state.gauge.s) * CFG.gaugeLR;

    // Origin drifts toward centroid of committed minds (or all if none)
    let ox = 0, oy = 0, n = 0;
    for (const m of minds) {
      if (m.committed) { ox += m.x; oy += m.y; n++; }
    }
    if (n === 0) {
      for (const m of minds) { ox += m.x; oy += m.y; }
      n = minds.length;
    }
    // Snap origin to nearest gauge cell so committed minds line up
    const meanX = ox / n, meanY = oy / n;
    const { u, v } = worldToGauge(meanX, meanY);
    const du = u - Math.round(u), dv = v - Math.round(v);
    const c = Math.cos(state.gauge.theta), s = Math.sin(state.gauge.theta);
    state.gauge.cx += (du * c - dv * s) * state.gauge.s * CFG.gaugeLR;
    state.gauge.cy += (du * s + dv * c) * state.gauge.s * CFG.gaugeLR;
  }

  // 2) Forces on each mind
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const cell = nearestCell(m.x, m.y);
    const target = gaugeToWorld(cell.gx, cell.gy);
    m.gx = cell.gx; m.gy = cell.gy;

    // Snap toward nearest lattice cell — anneals with temperature so early on
    // it's soft, later it's decisive.
    const snapStrength = CFG.snapK * (0.5 + 0.7 * (1 - state.jitter / CFG.jitterInit));
    let fx = (target.x - m.x) * snapStrength;
    let fy = (target.y - m.y) * snapStrength;

    // Neighbor coherence — bias motion so distance to each Voronoi neighbor
    // approaches an integer multiple of spacing (so pairs seat at 4-adjacency)
    const N = neighborsCache[i] || [];
    for (const j of N) {
      const dx = minds[j].x - m.x;
      const dy = minds[j].y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-3) continue;
      const s = state.gauge.s;
      const k = Math.max(1, Math.round(d / s));
      const desired = k * s;
      const err = d - desired;
      // Attractive if too far, repulsive if too close, relative to nearest lattice ring
      const push = err * CFG.neighborK / N.length;
      fx += (dx / d) * push;
      fy += (dy / d) * push;
    }

    // Hard-repel co-located: two minds trying to inhabit the same cell
    for (const j of N) {
      const o = minds[j];
      if (o.gx === m.gx && o.gy === m.gy) {
        const dx = m.x - o.x, dy = m.y - o.y;
        const d = Math.hypot(dx, dy) || 1e-3;
        fx += (dx / d) * 0.6;
        fy += (dy / d) * 0.6;
      }
    }

    // Noise (temperature)
    fx += (Math.random() - 0.5) * state.jitter;
    fy += (Math.random() - 0.5) * state.jitter;

    m.vx = (m.vx + fx) * CFG.drag;
    m.vy = (m.vy + fy) * CFG.drag;
    const sp = Math.hypot(m.vx, m.vy);
    if (sp > CFG.maxSpeed) {
      m.vx *= CFG.maxSpeed / sp;
      m.vy *= CFG.maxSpeed / sp;
    }
    m.x += m.vx;
    m.y += m.vy;

    // Soft wall
    const pad = 20;
    if (m.x < pad) { m.x = pad; m.vx *= -0.4; }
    if (m.y < pad) { m.y = pad; m.vy *= -0.4; }
    if (m.x > W - pad) { m.x = W - pad; m.vx *= -0.4; }
    if (m.y > H - pad) { m.y = H - pad; m.vy *= -0.4; }
  }

  // 3) Commit / release based on proximity to gauge cell
  for (const m of minds) {
    const t = gaugeToWorld(m.gx, m.gy);
    const d = Math.hypot(m.x - t.x, m.y - t.y);
    if (d < CFG.commitDist) {
      m.settle = Math.min(CFG.commitFrames, m.settle + 1);
      if (m.settle >= CFG.commitFrames) m.committed = true;
    } else if (d > CFG.releaseDist) {
      m.settle = Math.max(0, m.settle - 2);
      if (m.settle === 0) m.committed = false;
    }
  }

  // 4) Discover animals: 4-adjacent components of committed minds on the gauge
  const key = (gx, gy) => `${gx},${gy}`;
  const cellMap = new Map();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    m.animalId = -1;
    if (m.committed) cellMap.set(key(m.gx, m.gy), i);
  }
  let animalCount = 0;
  const visited = new Set();
  const animalSize = [];
  for (const [k, i] of cellMap) {
    if (visited.has(k)) continue;
    // BFS
    const q = [k];
    visited.add(k);
    const members = [];
    while (q.length) {
      const kk = q.shift();
      const idx = cellMap.get(kk);
      members.push(idx);
      const m = minds[idx];
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of dirs) {
        const nk = key(m.gx + dx, m.gy + dy);
        if (cellMap.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          q.push(nk);
        }
      }
    }
    if (members.length >= 2) {
      for (const idx of members) minds[idx].animalId = animalCount;
      animalSize.push(members.length);
      animalCount++;
    }
  }
  state.animalCount = animalCount;
  state.largestAnimal = animalSize.reduce((a, b) => Math.max(a, b), 0);

  // 5) Anneal temperature
  state.jitter = Math.max(CFG.jitterFloor, state.jitter * CFG.jitterAnneal);
  state.frame++;

  // Verse rotation
  state.verseTimer++;
  if (state.verseTimer > 60 * 14) {
    state.verseTimer = 0;
    state.verseIndex = (state.verseIndex + 1) % VERSES.length;
    updateVerse();
  }

  // Cache delaunay for renderer
  state._delaunay = delaunay;
  state._neighbors = neighborsCache;
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function render() {
  // Soft trail: fade previous frame instead of hard clear — gives a whisper of motion.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(${CFG.bgTintR}, ${CFG.bgTintG}, ${CFG.bgTintB}, ${CFG.trailFade})`;
  ctx.fillRect(0, 0, W, H);

  drawGhostLattice();
  drawVoronoi();
  drawAnimalBonds();
  drawField();
  drawMinds();
}

function drawGhostLattice() {
  if (!state.showGhost) return;
  const g = state.gauge;
  const s = g.s;
  // sweep enough u, v to cover the viewport
  const corners = [[0,0],[W,0],[W,H],[0,H]].map(([x,y]) => worldToGauge(x, y));
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  for (const c of corners) {
    umin = Math.min(umin, c.u); umax = Math.max(umax, c.u);
    vmin = Math.min(vmin, c.v); vmax = Math.max(vmax, c.v);
  }
  umin = Math.floor(umin) - 1; umax = Math.ceil(umax) + 1;
  vmin = Math.floor(vmin) - 1; vmax = Math.ceil(vmax) + 1;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let u = umin; u <= umax; u++) {
    const a = gaugeToWorld(u, vmin);
    const b = gaugeToWorld(u, vmax);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  for (let v = vmin; v <= vmax; v++) {
    const a = gaugeToWorld(umin, v);
    const b = gaugeToWorld(umax, v);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

function drawVoronoi() {
  if (!state.showVoronoi || !state._delaunay) return;
  const del = state._delaunay;
  const vor = del.voronoi([0, 0, W, H]);

  ctx.save();
  ctx.strokeStyle = `rgba(220, 232, 255, ${CFG.voronoiAlpha})`;
  ctx.lineWidth = 0.85;
  ctx.lineJoin = "round";
  ctx.beginPath();
  vor.render(ctx);
  ctx.stroke();
  ctx.restore();
}

function drawAnimalBonds() {
  const minds = state.minds;
  if (!minds.length) return;

  // Index committed minds by their gauge cell so we can find 4-adjacent pairs.
  const map = new Map();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (m.animalId < 0) continue;
    map.set(`${m.gx},${m.gy}`, i);
  }
  if (!map.size) return;

  ctx.save();

  // Soft warm auras first, painted behind the bonds and dots.
  for (const i of map.values()) {
    const m = minds[i];
    const r = state.gauge.s * 0.55;
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
    g.addColorStop(0, "rgba(255, 220, 150, 0.16)");
    g.addColorStop(0.55, "rgba(255, 200, 110, 0.05)");
    g.addColorStop(1, "rgba(255, 200, 110, 0.00)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bonds: connect 4-adjacent committed cells (drawn once per pair).
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(255, 210, 120, 0.9)";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(255, 220, 140, 0.85)";
  ctx.lineWidth = 1.6;

  const seen = new Set();
  const dirs = [[1, 0], [0, 1]]; // only forward dirs to avoid duplicates
  for (const [key, i] of map) {
    const m = minds[i];
    for (const [dx, dy] of dirs) {
      const nk = `${m.gx + dx},${m.gy + dy}`;
      const j = map.get(nk);
      if (j === undefined) continue;
      const edgeKey = key + "|" + nk;
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      const o = minds[j];
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(o.x, o.y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawField() {
  if (!state.showField) return;
  const minds = state.minds;
  ctx.save();
  ctx.strokeStyle = "rgba(140, 195, 255, 0.95)";
  ctx.fillStyle = "rgba(160, 210, 255, 0.95)";
  ctx.lineWidth = 1.35;
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(90, 160, 255, 0.55)";
  ctx.shadowBlur = 6;
  for (const m of minds) {
    const sp = Math.hypot(m.vx, m.vy);
    if (sp < 0.06) continue;
    let len = Math.max(CFG.vectorMin, Math.min(CFG.vectorMax, sp * CFG.vectorScale));
    const ux = m.vx / sp, uy = m.vy / sp;
    const ex = m.x + ux * len, ey = m.y + uy * len;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // arrowhead
    const hx = -uy, hy = ux;
    const ax = ex - ux * 5.5 + hx * 3.0, ay = ey - uy * 5.5 + hy * 3.0;
    const bx = ex - ux * 5.5 - hx * 3.0, by = ey - uy * 5.5 - hy * 3.0;
    ctx.beginPath();
    ctx.moveTo(ex, ey); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMinds() {
  const minds = state.minds;
  ctx.save();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    let core, halo, r = 3.4;
    if (m.animalId >= 0) {
      core = "#ffe38a"; halo = "rgba(255, 209, 92, 0.95)"; r = 4.6;
    } else if (m.committed) {
      core = "#fbe7a2"; halo = "rgba(246, 214, 122, 0.85)"; r = 4.0;
    } else if ((state._neighbors?.[i]?.length ?? 0) > 0) {
      core = "#d9efff"; halo = "rgba(165, 224, 255, 0.85)"; r = 3.6;
    } else {
      core = "#bcd8ff"; halo = "rgba(127, 178, 255, 0.75)";
    }
    // outer halo — soft luminous
    ctx.shadowColor = halo;
    ctx.shadowBlur = 18;
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r + 0.4, 0, Math.PI * 2);
    ctx.fill();
    // inner core — crisp white-ish
    ctx.shadowBlur = 0;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(m.x, m.y, Math.max(1.6, r * 0.55), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Telemetry ───────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);
function tick() {
  el("t-minds").textContent = state.minds.length;
  el("t-committed").textContent = state.minds.filter(m => m.committed).length;
  el("t-animals").textContent = state.animalCount ?? 0;
  el("t-largest").textContent = state.largestAnimal ?? 0;
  // entropy-ish measure: normalized dispersion in cell offsets
  let se = 0;
  for (const m of state.minds) {
    const t = gaugeToWorld(m.gx, m.gy);
    const d = Math.hypot(m.x - t.x, m.y - t.y) / state.gauge.s;
    se += d;
  }
  const e = state.minds.length ? (se / state.minds.length) : 0;
  el("t-entropy").textContent = e.toFixed(3);
}
function updateVerse() {
  const v = document.getElementById("verse");
  v.style.opacity = 0;
  setTimeout(() => {
    v.textContent = VERSES[state.verseIndex];
    v.style.opacity = 0.85;
  }, 800);
}

// ─── Loop ────────────────────────────────────────────────────────────────────
function frame() {
  if (!state.paused) step();
  render();
  if (state.frame % 6 === 0) tick();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ─── Input ───────────────────────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " ") { state.paused = !state.paused; e.preventDefault(); }
  else if (k === "r") { seed(); }
  else if (k === "v") { state.showVoronoi = !state.showVoronoi; }
  else if (k === "f") { state.showField = !state.showField; }
  else if (k === "g") { state.showGhost = !state.showGhost; }
});

canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  // drop 3 minds near the click — a seed of a possible animal
  for (let i = 0; i < 3; i++) {
    const jx = (Math.random() - 0.5) * state.gauge.s * 0.8;
    const jy = (Math.random() - 0.5) * state.gauge.s * 0.8;
    state.minds.push(new Mind(x + jx, y + jy));
  }
  state.jitter = Math.max(state.jitter, 0.9);
});

// ─── Utilities ───────────────────────────────────────────────────────────────
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
