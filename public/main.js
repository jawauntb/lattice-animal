import { Delaunay } from "d3-delaunay";

// ─── Palette (drawn from objetd'art tissue: cool + warm, muted, luminous) ────
const TINT = [
  "231, 172, 82",   // amber
  "134, 186, 168",  // teal
  "150, 178, 226",  // soft blue
  "226, 140, 108",  // coral
];
const CREAM = "242, 238, 230";
const NIGHT = { r: 6, g: 8, b: 16 };

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
  seedCount: 96,
  // Gauge negotiation
  spacingInit: 70,
  spacingMin: 46,
  spacingMax: 110,
  gaugeLR: 0.018,
  // Movement
  snapK: 0.14,
  neighborK: 0.004,
  jitterInit: 1.4,
  jitterFloor: 0.025,
  jitterAnneal: 0.982,     // ~1.5s to hit floor at 60fps; robust to slower framerates
  drag: 0.90,
  maxSpeed: 3.6,
  // Commitment
  commitDist: 12.0,
  commitFrames: 24,
  releaseDist: 22.0,
  // Rendering
  vectorScale: 7,
  vectorMin: 4,
  vectorMax: 34,
  voronoiAlpha: 0.12,     // faint cell boundaries so the fill reads
  membraneAlpha: 0.22,
  membraneAlphaCommitted: 0.38,
  trailFade: 0.98,        // near-full clear; motion trails come from arrows themselves
  // Cosmos
  dustCount: 160,
  twinkleCount: 44,
  breathHz: 0.05,         // slow global breath
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
  makeDust();
}
window.addEventListener("resize", resize);

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  minds: [],
  dust: [],
  twinkles: [],
  gauge: { cx: 0, cy: 0, theta: 0, s: CFG.spacingInit },
  jitter: CFG.jitterInit,
  paused: false,
  showVoronoi: true,
  showField: true,
  showGhost: false,
  frame: 0,
  verseIndex: 0,
  verseTimer: 0,
  mouse: { x: -1e6, y: -1e6, inside: false },
  animalCount: 0,
  largestAnimal: 0,
};

// hash → integer in [0, n)
function hash(a, b) {
  let h = (a * 374761393) ^ (b * 668265263);
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

class Mind {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.gx = 0; this.gy = 0;
    this.settle = 0;
    this.committed = false;
    this.animalId = -1;
    this.localS = CFG.spacingInit;
    this.localT = 0;
    // per-mind identity: tint, phase, organelle seed, cilia count
    this.tintIdx = hash((x * 1000) | 0, (y * 1000) | 0) % TINT.length;
    this.phase = Math.random() * Math.PI * 2;
    this.orgSeed = Math.random();
    this.cilia = 6 + (hash((x * 13) | 0, (y * 17) | 0) % 5);
    // birth-flash timer (frames of glow after committing)
    this.commitFlash = 0;
    this.bornAt = 0;
  }
}

function seed(count = CFG.seedCount) {
  state.minds.length = 0;
  const cx = W * 0.5, cy = H * 0.5;
  const R = Math.min(W, H) * 0.44;
  for (let i = 0; i < count; i++) {
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

// ─── Cosmos: dust + twinkles ─────────────────────────────────────────────────
function makeDust() {
  state.dust.length = 0;
  for (let i = 0; i < CFG.dustCount; i++) {
    state.dust.push({
      x: Math.random() * W,
      y: Math.random() * H,
      z: 0.3 + Math.random() * 0.9,      // depth: bigger, brighter, slower
      vx: (Math.random() - 0.5) * 0.05,
      vy: (Math.random() - 0.5) * 0.05,
      hue: TINT[(Math.random() * TINT.length) | 0],
      a: 0.06 + Math.random() * 0.10,
    });
  }
  state.twinkles.length = 0;
  for (let i = 0; i < CFG.twinkleCount; i++) {
    state.twinkles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.6,
      size: 0.5 + Math.random() * 1.4,
      hue: Math.random() < 0.7 ? CREAM : TINT[(Math.random() * TINT.length) | 0],
    });
  }
}

// ─── Gauge math ──────────────────────────────────────────────────────────────
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
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// ─── Simulation step ─────────────────────────────────────────────────────────
function step() {
  const minds = state.minds;
  if (minds.length < 2) return;

  const pts = new Float64Array(minds.length * 2);
  for (let i = 0; i < minds.length; i++) {
    pts[i * 2] = minds[i].x;
    pts[i * 2 + 1] = minds[i].y;
  }
  const delaunay = new Delaunay(pts);

  const neighborsOf = (i) => {
    const arr = [];
    for (const j of delaunay.neighbors(i)) arr.push(j);
    return arr;
  };

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
    // Rotation adapts freely, but spacing stays anchored to the initial size —
    // free adaptation collapses (contracting minds → smaller spacing → more contraction).
    const targetT = Math.atan2(meanSn / count, meanC / count) / 4;
    let dT = targetT - state.gauge.theta;
    while (dT > Math.PI / 4) dT -= Math.PI / 2;
    while (dT < -Math.PI / 4) dT += Math.PI / 2;
    state.gauge.theta += dT * CFG.gaugeLR;
    // Very slow spacing tracking, clamped to a tight window.
    const targetS = meanS / count;
    const dS = targetS - state.gauge.s;
    state.gauge.s = clamp(state.gauge.s + dS * (CFG.gaugeLR * 0.15),
                         CFG.spacingInit * 0.85, CFG.spacingInit * 1.15);

    let ox = 0, oy = 0, n = 0;
    for (const m of minds) {
      if (m.committed) { ox += m.x; oy += m.y; n++; }
    }
    if (n === 0) {
      for (const m of minds) { ox += m.x; oy += m.y; }
      n = minds.length;
    }
    const meanX = ox / n, meanY = oy / n;
    const { u, v } = worldToGauge(meanX, meanY);
    const du = u - Math.round(u), dv = v - Math.round(v);
    const c = Math.cos(state.gauge.theta), s = Math.sin(state.gauge.theta);
    state.gauge.cx += (du * c - dv * s) * state.gauge.s * CFG.gaugeLR;
    state.gauge.cy += (du * s + dv * c) * state.gauge.s * CFG.gaugeLR;
  }

  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    // Hysteretic cell assignment: only re-home to a new cell if the current
    // cell is meaningfully worse. Prevents boundary flip-flop across cells.
    let target = gaugeToWorld(m.gx, m.gy);
    let dCurrent = Math.hypot(target.x - m.x, target.y - m.y);
    const needReassign = !m._assigned || dCurrent > state.gauge.s * 0.62;
    if (needReassign && !m.committed) {
      const cell = nearestCell(m.x, m.y);
      if (cell.gx !== m.gx || cell.gy !== m.gy) {
        m.gx = cell.gx; m.gy = cell.gy;
        target = gaugeToWorld(m.gx, m.gy);
        dCurrent = Math.hypot(target.x - m.x, target.y - m.y);
      }
      m._assigned = true;
    }

    const snapStrength = CFG.snapK * (0.5 + 0.7 * (1 - state.jitter / CFG.jitterInit));
    let fx = (target.x - m.x) * snapStrength;
    let fy = (target.y - m.y) * snapStrength;

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
      const push = err * CFG.neighborK / N.length;
      fx += (dx / d) * push;
      fy += (dy / d) * push;
    }

    for (const j of N) {
      const o = minds[j];
      if (o.gx === m.gx && o.gy === m.gy) {
        const dx = m.x - o.x, dy = m.y - o.y;
        const d = Math.hypot(dx, dy) || 1e-3;
        fx += (dx / d) * 0.6;
        fy += (dy / d) * 0.6;
      }
    }

    fx += (Math.random() - 0.5) * state.jitter;
    fy += (Math.random() - 0.5) * state.jitter;

    // PD control: velocity damping cures the overshoot that keeps minds
    // bouncing outside the commit window near their targets.
    const distToTarget = Math.hypot(target.x - m.x, target.y - m.y);
    const closeness = clamp(1 - distToTarget / (state.gauge.s * 0.4), 0, 1);
    const velDamp = 0.10 + 0.30 * closeness;  // 0.10 far away, 0.40 at target
    fx -= m.vx * velDamp;
    fy -= m.vy * velDamp;
    const drag = CFG.drag - 0.12 * closeness;

    m.vx = (m.vx + fx) * drag;
    m.vy = (m.vy + fy) * drag;
    const sp = Math.hypot(m.vx, m.vy);
    if (sp > CFG.maxSpeed) {
      m.vx *= CFG.maxSpeed / sp;
      m.vy *= CFG.maxSpeed / sp;
    }
    m.x += m.vx;
    m.y += m.vy;

    const pad = 20;
    if (m.x < pad) { m.x = pad; m.vx *= -0.4; }
    if (m.y < pad) { m.y = pad; m.vy *= -0.4; }
    if (m.x > W - pad) { m.x = W - pad; m.vx *= -0.4; }
    if (m.y > H - pad) { m.y = H - pad; m.vy *= -0.4; }

    m.phase += 0.03 + 0.02 * m.orgSeed;
  }

  for (const m of minds) {
    const t = gaugeToWorld(m.gx, m.gy);
    const d = Math.hypot(m.x - t.x, m.y - t.y);
    if (d < CFG.commitDist) {
      m.settle = Math.min(CFG.commitFrames, m.settle + 1);
      if (m.settle >= CFG.commitFrames && !m.committed) {
        m.committed = true;
        m.commitFlash = 45;  // brief born-flash
      }
    } else if (d > CFG.releaseDist) {
      m.settle = Math.max(0, m.settle - 2);
      if (m.settle === 0) m.committed = false;
    }
    if (m.commitFlash > 0) m.commitFlash--;
  }

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

  state.jitter = Math.max(CFG.jitterFloor, state.jitter * CFG.jitterAnneal);
  state.frame++;

  // Drift dust
  for (const d of state.dust) {
    d.x += d.vx * d.z;
    d.y += d.vy * d.z;
    if (d.x < 0) d.x += W; else if (d.x > W) d.x -= W;
    if (d.y < 0) d.y += H; else if (d.y > H) d.y -= H;
  }

  state.verseTimer++;
  if (state.verseTimer > 60 * 14) {
    state.verseTimer = 0;
    state.verseIndex = (state.verseIndex + 1) % VERSES.length;
    updateVerse();
  }

  state._delaunay = delaunay;
  state._voronoi = delaunay.voronoi([0, 0, W, H]);
  state._neighbors = neighborsCache;
}

// ─── Rendering ───────────────────────────────────────────────────────────────
function breath() {
  const t = state.frame / 60;
  return 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * CFG.breathHz);
}

function render() {
  // Very soft trail — mostly re-paints, but leaves a ghost of motion.
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(${NIGHT.r}, ${NIGHT.g}, ${NIGHT.b}, ${CFG.trailFade})`;
  ctx.fillRect(0, 0, W, H);

  drawAmbient();
  drawDust();
  drawTwinkles();
  drawGhostLattice();
  drawMembranes();     // Voronoi cells filled with each mind's tint (soft)
  drawVoronoiEdges();  // very faint boundary lines above the fills
  drawAnimalOutline(); // the polyomino body
  drawBonds();         // filaments between minds
  drawField();         // vector cilia
  drawMinds();         // nucleus + organelles
}

function drawAmbient() {
  // A wide, breathing radial glow — never brown, always cool with a warm heart.
  const b = breath();
  const cx = W * 0.5, cy = H * 0.52;
  const r = Math.max(W, H) * 0.65;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(60, 100, 180, ${0.06 + 0.03 * b})`);
  g.addColorStop(0.4, `rgba(30, 40, 90, ${0.03 + 0.02 * b})`);
  g.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawDust() {
  ctx.save();
  for (const d of state.dust) {
    ctx.fillStyle = `rgba(${d.hue}, ${d.a * d.z})`;
    const r = 0.6 + d.z * 0.9;
    ctx.beginPath();
    ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTwinkles() {
  const t = state.frame / 60;
  ctx.save();
  for (const s of state.twinkles) {
    const a = 0.35 + 0.35 * Math.sin(t * s.speed + s.phase);
    if (a < 0.05) continue;
    ctx.fillStyle = `rgba(${s.hue}, ${a})`;
    ctx.shadowColor = `rgba(${s.hue}, ${a})`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    // 4-point star cross
    ctx.strokeStyle = `rgba(${s.hue}, ${a * 0.6})`;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(s.x - s.size * 3, s.y); ctx.lineTo(s.x + s.size * 3, s.y);
    ctx.moveTo(s.x, s.y - s.size * 3); ctx.lineTo(s.x, s.y + s.size * 3);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawGhostLattice() {
  if (!state.showGhost) return;
  const g = state.gauge;
  const corners = [[0,0],[W,0],[W,H],[0,H]].map(([x,y]) => worldToGauge(x, y));
  let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
  for (const c of corners) {
    umin = Math.min(umin, c.u); umax = Math.max(umax, c.u);
    vmin = Math.min(vmin, c.v); vmax = Math.max(vmax, c.v);
  }
  umin = Math.floor(umin) - 1; umax = Math.ceil(umax) + 1;
  vmin = Math.floor(vmin) - 1; vmax = Math.ceil(vmax) + 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
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

function drawMembranes() {
  const vor = state._voronoi;
  if (!vor) return;
  const minds = state.minds;
  const mx = state.mouse.x, my = state.mouse.y;
  const b = 0.85 + 0.15 * breath();
  ctx.save();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const poly = vor.cellPolygon(i);
    if (!poly) continue;
    let alpha = m.committed ? CFG.membraneAlphaCommitted : CFG.membraneAlpha;
    alpha *= b;
    // lens: warm cells near the pointer slightly brighter
    if (state.mouse.inside) {
      const d = Math.hypot(m.x - mx, m.y - my);
      const boost = Math.max(0, 1 - d / 220);
      alpha *= 1 + boost * 0.5;
    }
    ctx.beginPath();
    for (let k = 0; k < poly.length; k++) {
      const [x, y] = poly[k];
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${TINT[m.tintIdx]}, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();
}

function drawVoronoiEdges() {
  if (!state.showVoronoi || !state._voronoi) return;
  const vor = state._voronoi;
  ctx.save();
  ctx.strokeStyle = `rgba(${CREAM}, ${CFG.voronoiAlpha})`;
  ctx.lineWidth = 0.7;
  ctx.lineJoin = "round";
  ctx.beginPath();
  vor.render(ctx);
  ctx.stroke();
  ctx.restore();
}

function drawAnimalOutline() {
  const minds = state.minds;
  if (!minds.length || !state._delaunay) return;
  // Build map: gauge cell → mind index (only committed)
  const cellMap = new Map();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (m.animalId >= 0) cellMap.set(`${m.gx},${m.gy}`, i);
  }
  if (!cellMap.size) return;
  const vor = state._voronoi;
  if (!vor) return;

  // Warm halo behind the animal body — soft cream glow with amber core
  ctx.save();
  for (const i of cellMap.values()) {
    const m = minds[i];
    const r = state.gauge.s * 0.75;
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
    g.addColorStop(0, `rgba(${CREAM}, 0.14)`);
    g.addColorStop(0.55, "rgba(231, 172, 82, 0.05)");
    g.addColorStop(1, "rgba(231, 172, 82, 0.00)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Perimeter of the animal body: for each animal-member Voronoi cell,
  // stroke only those polygon edges whose adjacent site is NOT in the animal.
  // We approximate "adjacent site" by matching each edge to the nearest Delaunay neighbor.
  ctx.save();
  ctx.strokeStyle = `rgba(${CREAM}, 0.65)`;
  ctx.shadowColor = `rgba(${CREAM}, 0.8)`;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const i of cellMap.values()) {
    const m = minds[i];
    const poly = vor.cellPolygon(i);
    if (!poly) continue;
    const N = state._neighbors[i] || [];
    for (let k = 0; k < poly.length - 1; k++) {
      const [x1, y1] = poly[k];
      const [x2, y2] = poly[k + 1];
      const midx = (x1 + x2) * 0.5, midy = (y1 + y2) * 0.5;
      // find nearest neighbor site to the midpoint — that's the site sharing this edge
      let bestJ = -1, bestD2 = Infinity;
      for (const j of N) {
        const dx = minds[j].x - midx, dy = minds[j].y - midy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestJ = j; }
      }
      // if the neighbor across this edge is also in the same animal, it's an interior edge
      if (bestJ >= 0 && minds[bestJ].animalId === m.animalId) continue;
      // otherwise it's a perimeter edge — draw
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBonds() {
  const minds = state.minds;
  if (!minds.length) return;

  // committed 4-adjacency bonds (warm) — the polyomino edges
  const map = new Map();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (m.animalId < 0) continue;
    map.set(`${m.gx},${m.gy}`, i);
  }

  ctx.save();
  // First: subtle cream filaments between Voronoi neighbors that are close to gauge distance.
  // Reads as tissue "connective fibers" without committing to structure.
  if (state._neighbors) {
    ctx.strokeStyle = `rgba(${CREAM}, 0.10)`;
    ctx.lineWidth = 0.55;
    for (let i = 0; i < minds.length; i++) {
      const m = minds[i];
      const N = state._neighbors[i];
      for (const j of N) {
        if (j <= i) continue;
        const o = minds[j];
        const d = Math.hypot(m.x - o.x, m.y - o.y);
        // fade with distance around gauge s
        const s = state.gauge.s;
        const off = Math.abs(d - s) / s;
        const a = clamp(1 - off * 2.2, 0, 1);
        if (a < 0.05) continue;
        ctx.globalAlpha = a * 0.35;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Bright committed bonds
  if (map.size) {
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(231, 172, 82, 0.85)";
    ctx.shadowBlur = 9;
    ctx.strokeStyle = "rgba(248, 220, 150, 0.85)";
    ctx.lineWidth = 1.35;
    const seen = new Set();
    const dirs = [[1, 0], [0, 1]];
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
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawField() {
  if (!state.showField) return;
  const minds = state.minds;
  ctx.save();
  ctx.lineWidth = 1.05;
  ctx.lineCap = "round";
  ctx.shadowColor = `rgba(${CREAM}, 0.35)`;
  ctx.shadowBlur = 3;
  for (const m of minds) {
    const sp = Math.hypot(m.vx, m.vy);
    if (sp < 0.08) continue;
    let len = Math.max(CFG.vectorMin, Math.min(CFG.vectorMax, sp * CFG.vectorScale));
    const ux = m.vx / sp, uy = m.vy / sp;
    const ex = m.x + ux * len, ey = m.y + uy * len;
    const tint = m.committed ? CREAM : TINT[m.tintIdx];
    // Tapered line: start faint at the mind, brighten toward the tip.
    const grad = ctx.createLinearGradient(m.x, m.y, ex, ey);
    grad.addColorStop(0, `rgba(${tint}, 0.05)`);
    grad.addColorStop(0.55, `rgba(${tint}, 0.55)`);
    grad.addColorStop(1, `rgba(${tint}, 0.95)`);
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = `rgba(${tint}, 0.9)`;
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMinds() {
  const minds = state.minds;
  const t = state.frame / 60;
  const gs = state.gauge.s;
  ctx.save();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const tint = TINT[m.tintIdx];
    const isAnimal = m.animalId >= 0;
    const brightness = isAnimal ? 1 : m.committed ? 0.85 : 0.7;

    // Animal cells breathe together at a phase locked to their animalId
    let breathScale = 1;
    if (isAnimal) {
      breathScale = 1 + 0.08 * Math.sin(t * 1.4 + m.animalId * 0.7);
    }

    // Cilia — soft radial hairs around each mind's cell body.
    // Uncommitted: swaying with time and mind phase. Committed: quiet, longer, reaching outward.
    const cilLen = m.committed ? 5.6 : 4.2;
    const cilA = m.committed ? 0.28 : 0.18;
    ctx.strokeStyle = `rgba(${CREAM}, ${cilA})`;
    ctx.lineWidth = 0.65;
    ctx.lineCap = "round";
    for (let k = 0; k < m.cilia; k++) {
      const base = (k / m.cilia) * Math.PI * 2;
      const sway = m.committed ? 0 : 0.35 * Math.sin(t * 1.2 + m.phase + k);
      const a = base + sway;
      const r0 = 3.8 * breathScale;
      const r1 = r0 + cilLen * (0.9 + 0.2 * Math.sin(t + k));
      ctx.beginPath();
      ctx.moveTo(m.x + Math.cos(a) * r0, m.y + Math.sin(a) * r0);
      ctx.lineTo(m.x + Math.cos(a) * r1, m.y + Math.sin(a) * r1);
      ctx.stroke();
    }

    // Birth flash — an expanding cream ring at the moment of committing.
    if (m.commitFlash > 0) {
      const f = m.commitFlash / 45;
      const ringR = (1 - f) * gs * 0.5 + 4;
      ctx.strokeStyle = `rgba(${CREAM}, ${f * 0.9})`;
      ctx.lineWidth = 1 + 1.2 * f;
      ctx.beginPath();
      ctx.arc(m.x, m.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer soft glow
    ctx.shadowColor = `rgba(${isAnimal ? CREAM : tint}, ${0.85 * brightness})`;
    ctx.shadowBlur = isAnimal ? 18 : 10;
    ctx.fillStyle = `rgba(${isAnimal ? CREAM : tint}, ${0.9 * brightness})`;
    const outerR = (isAnimal ? 3.4 : 3.0) * breathScale;
    ctx.beginPath();
    ctx.arc(m.x, m.y, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Crisp inner core
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${CREAM}, ${0.9 * brightness})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.35 * breathScale, 0, Math.PI * 2);
    ctx.fill();

    // Organelles orbit inside committed cells
    if (m.committed) {
      const n = 3;
      const rr = gs * 0.22;
      for (let k = 0; k < n; k++) {
        const a = m.phase * 0.35 + (k / n) * Math.PI * 2 + t * 0.15;
        const ox = m.x + Math.cos(a) * rr * (0.7 + 0.3 * Math.sin(t + k));
        const oy = m.y + Math.sin(a) * rr * (0.7 + 0.3 * Math.cos(t + k));
        ctx.fillStyle = `rgba(${CREAM}, 0.55)`;
        ctx.beginPath();
        ctx.arc(ox, oy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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
  for (let i = 0; i < 3; i++) {
    const jx = (Math.random() - 0.5) * state.gauge.s * 0.8;
    const jy = (Math.random() - 0.5) * state.gauge.s * 0.8;
    state.minds.push(new Mind(x + jx, y + jy));
  }
  state.jitter = Math.max(state.jitter, 0.9);
});

canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = e.clientX - rect.left;
  state.mouse.y = e.clientY - rect.top;
  state.mouse.inside = true;
});
canvas.addEventListener("pointerleave", () => { state.mouse.inside = false; });

// ─── Boot ────────────────────────────────────────────────────────────────────
resize();
seed();
requestAnimationFrame(frame);



// Some Chrome UI (debug bars, download bars) shifts viewport without firing
// resize. Poll size and re-fit if it changed.
setInterval(() => {
  if (window.innerWidth !== W || window.innerHeight !== H) resize();
}, 400);
window.addEventListener("load", resize);
window.addEventListener("visibilitychange", () => { if (!document.hidden) resize(); });
