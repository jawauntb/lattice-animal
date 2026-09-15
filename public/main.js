import { Delaunay } from "d3-delaunay";
import * as audio from "/audio.js";

// ─── Palette (drawn from objetd'art tissue: cool + warm, muted, luminous) ────
const TINT = [
  "231, 172, 82",   // amber
  "134, 186, 168",  // teal
  "150, 178, 226",  // soft blue
  "226, 140, 108",  // coral
];
// Expanded palette for per-animal identity — 12 luminous colors that read as
// distinct at a glance and stay in the tissue/cosmos world (no brown/beige).
const ANIMAL_HUES = [
  "255, 209, 92",    // amber gold
  "255, 168, 132",   // salmon
  "255, 128, 168",   // rose
  "218, 140, 240",   // orchid
  "168, 156, 240",   // periwinkle
  "132, 176, 255",   // azure
  "132, 220, 236",   // cyan
  "132, 236, 200",   // mint
  "170, 232, 148",   // spring
  "232, 220, 128",   // lemon
  "255, 156, 96",    // ember
  "220, 172, 244",   // lilac
];
const CREAM = "242, 238, 230";
const NIGHT = { r: 6, g: 8, b: 16 };
const VALENCE_TINTS = [
  "134, 186, 168",
  "150, 178, 226",
  "132, 220, 236",
  "231, 172, 82",
  "170, 232, 148",
  "226, 140, 108",
  "168, 156, 240",
];

// ─── Verses ──────────────────────────────────────────────────────────────────
// Bookends frame the demo's own philosophy; the middle rotates ambient lines.
const OPENING_VERSE = "no mind sees the whole — only its neighbors";
const CLOSING_VERSE = "not from a smarter mind, but from enough of them checking each other";
const VERSES = [
  "no channel but movement · no commitment but position",
  "a mind for a single cell — and single cells don't count",
  "agreement is a shape they can hold together",
  "the gauge is not given, it is negotiated",
  "each cell asks: which lattice am I in?",
  "committed by staying still on the same map",
  "the body appears where minds refuse to drift apart",
  "movement is the only language they share",
  "voltage matches, and a bond remembers how to open",
  "the body keeps walking after the argument is over",
  "a concern blooms, then the lattice leans toward it",
  "voltage is concern made visible",
  "to live is to keep deciding together",
  "the vector became a scalar",
  "it doesn't decide, then check. the checking is the deciding",
  "the shape is not what it looks like. it's what commits together",
];

const MORPHS = [
  { key: "P-pentomino", cells: [[0,0],[1,0],[0,1],[0,2],[-1,2]] },
  { key: "L-tetromino", cells: [[0,0],[0,1],[0,2],[1,2]] },
  { key: "T-tetromino", cells: [[-1,0],[0,0],[1,0],[0,1]] },
  { key: "S-tetromino", cells: [[0,0],[1,0],[1,1],[2,1]] },
];

const LIFE_PULSE = [
  {
    short: "the animals are still negotiating",
    long: "Commitment was not the end. The bodies keep choosing the next cell, and the shared grid keeps breathing under them.",
  },
  {
    short: "a body is walking one cell at a time",
    long: "An edge mind released its hold and reached for the empty square beside it. That is how a lattice animal takes a step.",
  },
  {
    short: "nothing here is finished",
    long: "The field is alive because it refuses to freeze. Wander, birth, split, and join are the same agreement, later.",
  },
  {
    short: "the pattern is still arriving",
    long: "What you see is a pointer. The animal is the pattern using these cells as a doorway, and it is not done coming through.",
  },
  {
    short: "neighbors are still the only news",
    long: "No mind can see the whole body. Each one only feels who is next to it, and that is enough to keep a shape.",
  },
  {
    short: "the voltage is finding its rest",
    long: "Cells that agree on V keep their gold bonds bright. A mismatch dims the filament until they match again, or part.",
  },
  {
    short: "an edge is thinking about a child",
    long: "Spawn starts as a tightness at the rim. If the empty cell stays empty, a new mind will be asked to sit there.",
  },
  {
    short: "the field has not gone quiet",
    long: "Stillness on the grid is not silence. The animals are holding a form while they decide whether to grow, walk, or divide.",
  },
  {
    short: "voltage drifts through bonds",
    long: "Each mind is tuning toward its neighbors. A slow consensus, with no words.",
  },
  {
    short: "the concern rises gently",
    long: "Activity blooms in one place and the lattice leans toward it. That lean is the field paying attention.",
  },
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
  // Per-mind V (Levin voltage / Bennett concern). Diffuse only — do not
  // gate commit on V yet. Bond opacity is the render of ΔV.
  vDiffuse: 0.02,
  vRest: 0.008,
  // Concern field χ(x,y): 16 px coarse grid, Gaussians on life events.
  // Local spacing = gauge.s / χ^0.35. Do not touch the frozen global s.
  chiStep: 16,
  chiAlpha: 0.35,
  chiDecay: 0.975,
  valenceN: 7,
  coneScale: 1.5,
  holdMs: 520,
};

// Pixel + frame budget for Chrome on a phone. The field remaps into this
// sim size; CSS still fills the viewport so a resize never blanks the canvas.
const BUDGET = {
  maxCssW: 1440,
  maxCssH: 960,
  maxPixels: 2_200_000,
  maxDpr: 2,
  mobileDpr: 1.5,
  frameMs: 22,
  heavyMs: 36,
  mindCap: 140,
};

// ─── DOM / Canvas setup ──────────────────────────────────────────────────────
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });
let dpr = 1;
let viewW = 0, viewH = 0;
let W = 0, H = 0;

function coarsePointer() {
  return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

function fitView() {
  viewW = Math.max(1, window.innerWidth);
  viewH = Math.max(1, window.innerHeight);
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, coarsePointer() ? BUDGET.mobileDpr : BUDGET.maxDpr));
  let w = viewW, h = viewH;
  const cssScale = Math.min(1, BUDGET.maxCssW / w, BUDGET.maxCssH / h);
  w = Math.max(320, Math.round(w * cssScale));
  h = Math.max(240, Math.round(h * cssScale));
  const pixels = w * h * dpr * dpr;
  if (pixels > BUDGET.maxPixels) {
    const k = Math.sqrt(BUDGET.maxPixels / pixels);
    w = Math.max(320, Math.round(w * k));
    h = Math.max(240, Math.round(h * k));
  }
  return { w, h, scaled: w < viewW - 4 || h < viewH - 4 };
}

function remapField(oldW, oldH, newW, newH) {
  if (!oldW || !oldH || (oldW === newW && oldH === newH)) return;
  const sx = newW / oldW, sy = newH / oldH;
  for (const m of state.minds) {
    m.x *= sx;
    m.y *= sy;
  }
  state.gauge.cx *= sx;
  state.gauge.cy *= sy;
  for (const s of state.chiSources) {
    s.cx *= sx;
    s.cy *= sy;
  }
  for (const loc of state.loci || []) {
    loc.x *= sx;
    loc.y *= sy;
  }
  if (state.gaze) {
    state.gaze.x *= sx;
    state.gaze.y *= sy;
  }
  for (const e of state.narration.history) {
    if (Number.isFinite(e.x)) e.x *= sx;
    if (Number.isFinite(e.y)) e.y *= sy;
  }
  state.chi = null;
  renderLocusPins();
}

function clientToSim(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || viewW || 1;
  const rh = rect.height || viewH || 1;
  return {
    x: (clientX - rect.left) * (W / rw),
    y: (clientY - rect.top) * (H / rh),
  };
}

function noteBlowup(msg, holdMs = 4200) {
  const el = document.getElementById("field-notice");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(noteBlowup._t);
  noteBlowup._t = setTimeout(() => { el.hidden = true; }, holdMs);
}

function resize() {
  const oldW = W, oldH = H;
  const fit = fitView();
  W = fit.w;
  H = fit.h;
  const bw = Math.max(1, Math.floor(W * dpr));
  const bh = Math.max(1, Math.floor(H * dpr));
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  canvas.style.width = viewW + "px";
  canvas.style.height = viewH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (typeof state !== "undefined") {
    remapField(oldW, oldH, W, H);
    makeDust();
    if (fit.scaled) {
      state.perf.scaledAt = performance.now();
      noteBlowup("the field was scaled so this screen stays snappy", 6400);
    }
    if (typeof render === "function") {
      try { render(); } catch { noteBlowup("the field skipped a frame so it could keep walking"); }
    }
  }
}
window.addEventListener("resize", resize);

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  minds: [],
  dust: [],
  twinkles: [],
  gauge: { cx: 0, cy: 0, theta: 0, s: CFG.spacingInit, width: 0.28 },
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
  prevAnimalCount: 0,
  prevCommittedCount: 0,
  prevLargest: 0,
  narration: {
    current: "the field is being born",
    history: [],           // { frame, short, long, ts, kind }
    lastNarratedFrame: -1000,
    flags: {},             // one-shot events like first_commit
  },
  // Per-animal identity: stable color assignment.
  animalColors: new Map(),  // animalId → tint string "r,g,b"
  animalKeys: new Map(),    // signature → { color, memory, age }
  morphByColor: new Map(),  // color → remembered relative offsets
  temporalGapMode: "chord",
  ingressMorph: null,
  bottleneckIdx: -1,
  regenUrgent: 0,
  inhabited: [],
  chi: null,                // Float32Array, coarse χ grid (base 1 + event Gaussians)
  chiW: 0,
  chiH: 0,
  chiSources: [],           // { cx, cy, amp, sigma, decay }
  perf: { lastMs: 0, skipHeavy: false, streak: 0 },
  loci: [],                 // narrator marks on the field { x, y, short, kind, born, id }
  locusId: 0,
  gaze: null,               // { x, y, born, kind } — the field leans toward the verse
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
    this.commitChord = 1;      // set at the moment of commit — how many nearby minds committed together (an interference amplifier)
    this.bornAt = 0;
    // Neighbor-mean direction (updated in step). Used for the dual-vector display.
    this.nMeanX = 0; this.nMeanY = 0;
    // Voltage / concern scalar. Uncommitted minds start near 0; species
    // resting V is applied once the mind inherits an animal color.
    this.restingV = 0;
    this.V = clamp(gauss(0, 0.12), -1, 1);
    this.valence = new Float32Array(CFG.valenceN);
    this.lightCone = CFG.spacingInit * CFG.coneScale;
    this.vStable = 0;
    this.prevV = this.V;
    this.isoTicks = 0;
    this.cancer = false;
    this.cancerAge = 0;
    this.collapse = 0;
  }
}

function gauss(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function syncRestingV(m, rgb) {
  const color = rgb || m.animalColor || m.lastAnimalColor;
  if (!color) return;
  m.restingV = audio.restingVForColor(color);
}

function coerceAnimalRecord(v) {
  if (!v) return null;
  if (typeof v === "string") return { color: v, memory: null, age: 0, missAge: 0 };
  return {
    color: v.color,
    memory: Array.isArray(v.memory) ? v.memory : null,
    age: v.age || 0,
    missAge: v.missAge || 0,
  };
}

function captureOffsets(members, minds) {
  let minX = Infinity, minY = Infinity;
  for (const i of members) {
    minX = Math.min(minX, minds[i].gx);
    minY = Math.min(minY, minds[i].gy);
  }
  return members.map(i => `${minds[i].gx - minX},${minds[i].gy - minY}`).sort();
}

function memberAnchor(members, minds) {
  let minX = Infinity, minY = Infinity;
  for (const i of members) {
    minX = Math.min(minX, minds[i].gx);
    minY = Math.min(minY, minds[i].gy);
  }
  return { minX, minY };
}

function missingOffsets(members, minds, memory) {
  return missingWorldCells(members, minds, memory).map(h => h.key);
}

function missingWorldCells(members, minds, memory) {
  if (!memory || !memory.length || !members.length) return [];
  const have = members.map(i => [minds[i].gx, minds[i].gy]);
  const mem = memory.map(k => k.split(",").map(Number));
  const haveSet = new Set(have.map(([a, b]) => `${a},${b}`));
  let bestDx = 0, bestDy = 0, bestN = -1;
  for (const [hx, hy] of have) {
    for (const [mx, my] of mem) {
      const dx = hx - mx, dy = hy - my;
      let n = 0;
      for (const [x, y] of mem) if (haveSet.has(`${x + dx},${y + dy}`)) n++;
      if (n > bestN) { bestN = n; bestDx = dx; bestDy = dy; }
    }
  }
  if (bestN < memory.length * 0.5) return [];
  const out = [];
  for (const [x, y] of mem) {
    const gx = x + bestDx, gy = y + bestDy;
    if (!haveSet.has(`${gx},${gy}`)) out.push({ gx, gy, key: `${x},${y}` });
  }
  return out;
}

function adjacentToMembers(gx, gy, members, minds) {
  const set = new Set(members.map(i => `${minds[i].gx},${minds[i].gy}`));
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    if (set.has(`${gx + dx},${gy + dy}`)) return true;
  }
  return false;
}

function rememberAnimal(m) {
  const minds = state.minds;
  const members = [];
  for (let i = 0; i < minds.length; i++) {
    if (minds[i].animalId === m.animalId && minds[i].committed) members.push(i);
  }
  if (members.length < 2 || !m.animalColor) return;
  const mem = captureOffsets(members, minds);
  state.morphByColor.set(m.animalColor, mem);
  state.regenUrgent = 240;
}

function rotateCells(cells, k) {
  let out = cells.map(([x, y]) => [x, y]);
  for (let i = 0; i < k; i++) out = out.map(([x, y]) => [-y, x]);
  let minX = Infinity, minY = Infinity;
  for (const [x, y] of out) { minX = Math.min(minX, x); minY = Math.min(minY, y); }
  return out.map(([x, y]) => `${x - minX},${y - minY}`).sort().join("|");
}

function morphKeyFromOffsets(offsets) {
  const sig = offsets.slice().sort().join("|");
  for (const morph of MORPHS) {
    for (let k = 0; k < 4; k++) {
      if (rotateCells(morph.cells, k) === sig) return morph.key;
    }
  }
  return null;
}

function currentInhabitants() {
  const found = new Set();
  const by = new Map();
  const minds = state.minds;
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (m.animalId < 0) continue;
    if (!by.has(m.animalId)) by.set(m.animalId, []);
    by.get(m.animalId).push(i);
  }
  for (const members of by.values()) {
    const off = captureOffsets(members, minds);
    const key = morphKeyFromOffsets(off);
    if (key) found.add(key);
  }
  return [...found];
}

function preferredSpawn(parent, occ) {
  const minds = state.minds;
  const members = [];
  for (let i = 0; i < minds.length; i++) {
    if (minds[i].animalId === parent.animalId && minds[i].committed) members.push(i);
  }
  const memory = state.morphByColor.get(parent.animalColor)
    || (state.ingressMorph && MORPHS.find(m => m.key === state.ingressMorph)
      ? MORPHS.find(m => m.key === state.ingressMorph).cells.map(([x, y]) => `${x},${y}`)
      : null);
  if (memory && members.length) {
    const missing = missingWorldCells(members, minds, memory).slice().sort(() => Math.random() - 0.5);
    for (const hole of missing) {
      const gx = hole.gx, gy = hole.gy;
      if (!occ.has(`${gx},${gy}`) && adjacentToMembers(gx, gy, members, minds)) {
        return { gx, gy, dx: gx - parent.gx, dy: gy - parent.gy, regen: true };
      }
    }
  }
  return pickAdjacent(parent, occ);
}

function updateValence(m, N, minds) {
  const sFit = 1 - clamp(Math.abs(m.localS - state.gauge.s) / state.gauge.s, 0, 1);
  let dT = m.localT - state.gauge.theta;
  while (dT > Math.PI / 4) dT -= Math.PI / 2;
  while (dT < -Math.PI / 4) dT += Math.PI / 2;
  const rFit = 1 - clamp(Math.abs(dT) / (Math.PI / 4), 0, 1);
  const tightness = clamp(N.length / 6, 0, 1);
  const hue = m.tintIdx / Math.max(1, TINT.length - 1);
  let coh = 0;
  if (N.length) {
    let c = 0;
    for (const j of N) if (minds[j].committed) c++;
    coh = c / N.length;
  }
  const stale = clamp(m.settle / CFG.commitFrames, 0, 1);
  const r = m.lightCone || state.gauge.s * CFG.coneScale;
  let hits = 0;
  for (const o of minds) {
    if (o === m) continue;
    if (Math.hypot(o.x - m.x, o.y - m.y) < r) hits++;
  }
  const overlap = clamp(hits / 8, 0, 1);
  const tgt = [sFit, rFit, tightness, hue, coh, stale, overlap];
  const v = m.valence;
  if (m.committed) {
    let mean = 0;
    for (let i = 0; i < 7; i++) mean += tgt[i];
    mean /= 7;
    for (let i = 0; i < 7; i++) v[i] += (mean - v[i]) * 0.22;
  } else {
    for (let i = 0; i < 7; i++) v[i] += (tgt[i] - v[i]) * 0.12;
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
  state.gauge.width = 0.28;
  state.jitter = CFG.jitterInit;
  state.frame = 0;
  state.animalCount = 0;
  state.largestAnimal = 0;
  state.prevAnimalCount = 0;
  state.prevCommittedCount = 0;
  state.prevLargest = 0;
  state.animalColors.clear();
  state.animalKeys.clear();
  state.morphByColor.clear();
  state.ingressMorph = null;
  state.bottleneckIdx = -1;
  state.regenUrgent = 0;
  state.inhabited = [];
  state.narration.history.length = 0;
  state.narration.flags = {};
  state.narration.lastNarratedFrame = -1000;
  state.narration.lastLifeFrame = -1000;
  state.chiSources.length = 0;
  state.loci.length = 0;
  state.gaze = null;
  renderLocusPins();
  state.chi = null;
  state.chiW = 0;
  state.chiH = 0;
  state._delaunay = null;
  state._voronoi = null;
  state._neighbors = null;
  renderDrawerLog();
}

function emitChi(cx, cy, amp = 1, sigma = 80) {
  state.chiSources.push({
    cx, cy, amp, sigma,
    decay: CFG.chiDecay,
  });
}

function rebuildChi() {
  const step = CFG.chiStep;
  const gw = Math.max(1, Math.ceil(W / step));
  const gh = Math.max(1, Math.ceil(H / step));
  if (!state.chi || state.chiW !== gw || state.chiH !== gh) {
    state.chiW = gw;
    state.chiH = gh;
    state.chi = new Float32Array(gw * gh);
  }
  const grid = state.chi;
  grid.fill(1);
  const keep = [];
  for (const s of state.chiSources) {
    s.amp *= s.decay;
    if (s.amp > 0.03) keep.push(s);
  }
  state.chiSources = keep;
  for (const s of keep) {
    const r = s.sigma * 2.8;
    const x0 = Math.max(0, Math.floor((s.cx - r) / step));
    const y0 = Math.max(0, Math.floor((s.cy - r) / step));
    const x1 = Math.min(gw - 1, Math.ceil((s.cx + r) / step));
    const y1 = Math.min(gh - 1, Math.ceil((s.cy + r) / step));
    const inv = 1 / (2 * s.sigma * s.sigma);
    for (let j = y0; j <= y1; j++) {
      const wy = j * step + step * 0.5;
      const dy = wy - s.cy;
      for (let i = x0; i <= x1; i++) {
        const wx = i * step + step * 0.5;
        const dx = wx - s.cx;
        grid[j * gw + i] += s.amp * Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }
}

function sampleChi(x, y) {
  const grid = state.chi;
  if (!grid) return 1;
  const gw = state.chiW, gh = state.chiH, step = CFG.chiStep;
  const fx = clamp(x / step, 0, Math.max(0, gw - 1.001));
  const fy = clamp(y / step, 0, Math.max(0, gh - 1.001));
  const x0 = fx | 0, y0 = fy | 0;
  const x1 = Math.min(gw - 1, x0 + 1);
  const y1 = Math.min(gh - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a = grid[y0 * gw + x0];
  const b = grid[y0 * gw + x1];
  const c = grid[y1 * gw + x0];
  const d = grid[y1 * gw + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
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
  const gx = Math.round(u), gy = Math.round(v);
  const width = g.width || 0;
  // W-max: while the rotation family is still wide, pick the cell that
  // stays compatible across the family rather than the single mean theta.
  if (width < 0.07) return { gx, gy };
  let bestGx = gx, bestGy = gy, bestD = Infinity;
  const samples = 5;
  for (let i = 0; i < samples; i++) {
    const t = g.theta + ((i / (samples - 1)) - 0.5) * 2 * width;
    const alt = { cx: g.cx, cy: g.cy, theta: t, s: g.s };
    const w = worldToGauge(x, y, alt);
    const cand = { gx: Math.round(w.u), gy: Math.round(w.v) };
    const p = gaugeToWorld(cand.gx, cand.gy, alt);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; bestGx = cand.gx; bestGy = cand.gy; }
  }
  return { gx: bestGx, gy: bestGy };
}
function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

function findLargestAnimalColor() {
  // Tally committed minds by animal color; return the color with the most cells.
  const counts = new Map();
  for (const m of state.minds) {
    if (m.animalId >= 0 && m.animalColor) {
      counts.set(m.animalColor, (counts.get(m.animalColor) || 0) + 1);
    }
  }
  let best = null, bestN = 0;
  for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n; }
  return best;
}

// ─── Narrator ────────────────────────────────────────────────────────────────
function mindsCentroid(pred) {
  let x = 0, y = 0, n = 0;
  for (const m of state.minds) {
    if (pred && !pred(m)) continue;
    x += m.x; y += m.y; n++;
  }
  if (n) return { x: x / n, y: y / n };
  return { x: state.gauge.cx, y: state.gauge.cy };
}

function locateNarration(x, y) {
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  if (state.chiSources.length) {
    const s = state.chiSources[state.chiSources.length - 1];
    return { x: s.cx, y: s.cy };
  }
  const flashing = mindsCentroid(m => m.commitFlash > 0 || m.collapse > 0);
  if (state.minds.some(m => m.commitFlash > 0 || m.collapse > 0)) return flashing;
  if (state.animalCount > 0) return mindsCentroid(m => m.animalId >= 0);
  return mindsCentroid();
}

function simToClient(x, y) {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || viewW || 1;
  const rh = rect.height || viewH || 1;
  return {
    left: rect.left + x * (rw / (W || 1)),
    top: rect.top + y * (rh / (H || 1)),
  };
}

function locusTint(kind) {
  if (kind === "chord") return CREAM;
  if (kind === "animal") return "255, 209, 92";
  if (kind === "life") return "134, 186, 168";
  return "150, 178, 226";
}

function verseAnchorSim() {
  const v = document.getElementById("verse-btn");
  if (!v) return { x: W * 0.5, y: H - 36 };
  const r = v.getBoundingClientRect();
  return clientToSim(r.left + r.width * 0.5, r.top + 6);
}

function hearVerse() {
  const btn = document.getElementById("verse-btn");
  if (!btn) return;
  btn.classList.add("hearing");
  clearTimeout(hearVerse._t);
  hearVerse._t = setTimeout(() => btn.classList.remove("hearing"), 1600);
}

function showLocus(entry) {
  if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) return;
  const loc = {
    id: ++state.locusId,
    x: entry.x,
    y: entry.y,
    short: entry.short,
    kind: entry.kind,
    born: state.frame,
  };
  state.loci = state.loci.filter(l => state.frame - l.born < 220);
  state.loci.unshift(loc);
  if (state.loci.length > 2) state.loci.length = 2;
  state.gaze = { x: loc.x, y: loc.y, born: state.frame, kind: loc.kind };
  emitChi(loc.x, loc.y, 0.32, 52);
  hearVerse();
  renderLocusPins();
}

function pulseLocus(entry) {
  if (!entry || !Number.isFinite(entry.x)) return false;
  showLocus({ ...entry, born: state.frame });
  return true;
}

function renderLocusPins() {
  const host = document.getElementById("narrator-loci");
  if (!host) return;
  const loc = state.loci[0];
  if (!loc || state.frame - loc.born > 220) {
    host.innerHTML = "";
    return;
  }
  const pos = simToClient(loc.x, loc.y);
  host.innerHTML = `<div class="narrator-pin" data-id="${loc.id}" style="left:${pos.left}px;top:${pos.top + 26}px">
    <span class="pin-label">${escapeHtml(loc.short)}</span>
  </div>`;
}

function narrateLife({ short, long, kind = "life", x, y }) {
  // Living events are frequent. Keep them readable: one every few seconds.
  if (state.frame - (state.narration.lastLifeFrame || -1e9) < 60 * 2.6) return;
  state.narration.lastLifeFrame = state.frame;
  narrate({ short, long, kind, x, y });
}

function narrate({ short, long, kind = "note", x, y }) {
  // Debounce: at least 20 frames between narrations so the reader can catch each.
  if (state.frame - state.narration.lastNarratedFrame < 20) return;
  const at = locateNarration(x, y);
  state.narration.lastNarratedFrame = state.frame;
  state.narration.current = short;
  setVerseText(short, true);
  const entry = {
    frame: state.frame, short, long, kind,
    ts: Date.now(),
    x: at.x, y: at.y,
  };
  state.narration.history.unshift(entry);
  if (state.narration.history.length > 60) state.narration.history.length = 60;
  showLocus(entry);
  renderDrawerLog();
}

function fmtTime(frame) {
  const s = frame / 60;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}m ${r}s`;
}

function renderDrawerLog() {
  const el = document.getElementById("drawer-log");
  if (!el) return;
  const hist = state.narration.history;
  if (!hist.length) {
    el.innerHTML = '<div class="drawer-log-empty">no events yet — the field is warming up.</div>';
    return;
  }
  const html = hist.map((e, i) => `
    <button type="button" class="log-entry ${i === 0 ? "fresh " : ""}${e.kind}${Number.isFinite(e.x) ? " has-locus" : ""}" data-locus="${i}">
      <div class="log-short">${escapeHtml(e.short)}</div>
      <div class="log-long">${escapeHtml(e.long)}</div>
      <div class="log-time">${fmtTime(e.frame)}${Number.isFinite(e.x) ? " · on the field" : ""}</div>
    </button>
  `).join("");
  el.innerHTML = html;
  el.querySelectorAll("[data-locus]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = +btn.dataset.locus;
      const entry = state.narration.history[i];
      if (pulseLocus(entry)) {
        btn.classList.add("fresh");
        setVerseText(entry.short, true);
      }
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

// ─── Living dynamics ─────────────────────────────────────────────────────────
// After the initial chaos → alignment → commitment arc, the field becomes a
// living ecology: animals wander a cell at a time, spawn new minds from
// their edges, fission across long or stressed bodies, and merge back
// together. Everything still respects the gauge — the invariant is that
// every state is a realization of a lattice animal (or several).
const LIFE = {
  minSpawnFrame: 60 * 20,  // give the field time to settle before life stirs
  wanderPerFrame: 0.35,    // expected wanders/sec (60 fps assumption)
  spawnPerFrame: 0.05,
  dyingFrames: 45,
  maxMinds: 220,
  minMinds: 40,
  lifeCooldown: 8,
  gaugeBreath: { theta: 0, s: 0, cx: 0, cy: 0 },
};

function updateLivingPhase() {
  const minds = state.minds;
  const total = minds.length || 1;
  const committed = minds.filter(m => m.committed).length;
  const frac = committed / total;

  // Sweep dying minds' fade counters — cull them at 0.
  for (let i = minds.length - 1; i >= 0; i--) {
    const m = minds[i];
    if (m.dying > 0) {
      m.dying--;
      if (m.dying === 0) {
        minds.splice(i, 1);
      }
    }
  }

  // Enter the living phase once the field is settled OR enough time has passed.
  if (!state.narration.flags.living && (frac > 0.85 || state.frame > 60 * 22)) {
    state.narration.flags.living = true;
    const live = mindsCentroid(m => m.animalId >= 0);
    narrate({
      short: "the field has come alive",
      long: "The negotiation is over. From here nothing is scripted — the animals wander, birth new minds at their edges, occasionally split when they've grown too large, and re-merge when they drift into each other. The invariant is that every configuration is still a real lattice animal.",
      kind: "note",
      x: live.x, y: live.y,
    });
  }
  if (!state.narration.flags.living) return;

  // Slow-breathe the gauge — a subtle rotational drift so animals must
  // constantly re-negotiate their exact positions. Small enough to look
  // organic, not disruptive.
  state.gauge.theta += Math.sin(state.frame * 0.003) * 0.00025;

  // Life events fire on a Poisson schedule, spaced by cooldown.
  if (state.frame - (state._lastLifeFrame || 0) < LIFE.lifeCooldown) return;
  // Weighted event pick
  const wanderRoll = Math.random();
  const spawnRoll = Math.random();
  let did = false;
  if (wanderRoll < LIFE.wanderPerFrame / 60) { did = tryWander() || did; }
  if (state.regenUrgent > 0) state.regenUrgent--;
  const spawnHungry = minds.some(m => m._spawnBias);
  const spawnChance = (LIFE.spawnPerFrame / 60)
    * (spawnHungry ? 2.4 : 1)
    * (state.ingressMorph ? 1.35 : 1)
    * (state.regenUrgent > 0 ? 5 : 1);
  if (spawnRoll < spawnChance && minds.length < Math.min(LIFE.maxMinds, BUDGET.mindCap)) {
    did = trySpawn() || did;
  }
  // Occasionally consider fission
  if (Math.random() < 0.006 && state.largestAnimal >= 8) {
    did = tryFission() || did;
  }
  // Occasionally consider dissolving very-old wandering uncommitted minds
  if (Math.random() < 0.02 && minds.length > LIFE.minMinds) {
    did = tryDissolve() || did;
  }
  if (did) state._lastLifeFrame = state.frame;
}

function occupiedCells() {
  const set = new Set();
  for (const m of state.minds) {
    if (m.committed) set.add(`${m.gx},${m.gy}`);
  }
  return set;
}

function pickAdjacent(m, occupied) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]].slice().sort(() => Math.random() - 0.5);
  for (const [dx, dy] of dirs) {
    const nk = `${m.gx + dx},${m.gy + dy}`;
    if (!occupied.has(nk)) return { dx, dy, gx: m.gx + dx, gy: m.gy + dy };
  }
  return null;
}

function tryWander() {
  // A committed mind at an edge of its animal releases and re-targets an
  // adjacent unoccupied lattice cell. The animal drifts one cell across
  // the shared grid.
  const candidates = state.minds.filter(m => m.committed && m.dying === undefined);
  if (candidates.length < 3) return false;
  // Prefer edge cells (with at least one empty neighbor) so wandering shows.
  const occ = occupiedCells();
  const edges = candidates.filter(m => pickAdjacent(m, occ));
  if (edges.length === 0) return false;
  const m = edges[Math.floor(Math.random() * edges.length)];
  const move = pickAdjacent(m, occ);
  if (!move) return false;
  // Release commit, retarget, nudge velocity toward new cell.
  m.committed = false;
  m.settle = 0;
  m._assigned = true;      // keep new cell sticky
  m.gx = move.gx; m.gy = move.gy;
  const t = gaugeToWorld(m.gx, m.gy);
  const dx = t.x - m.x, dy = t.y - m.y;
  const norm = Math.hypot(dx, dy) || 1;
  m.vx += (dx / norm) * 1.6;
  m.vy += (dy / norm) * 1.6;
  if (Math.random() < 0.16) {
    narrateLife({
      short: "a body took a single step",
      long: "An edge cell released its hold and reached for the empty square beside it. That is a walk, one lattice step at a time.",
      kind: "life",
      x: t.x, y: t.y,
    });
  }
  return true;
}

function trySpawn() {
  // A committed mind at the edge of an animal births a new mind at an
  // adjacent unoccupied lattice cell. Inherits the parent's animal color
  // as a strong hint (will be confirmed when it commits).
  const committed = state.minds.filter(m => m.committed && m.dying === undefined);
  if (committed.length === 0) return false;
  const occ = occupiedCells();
  const parents = committed.filter(m => pickAdjacent(m, occ));
  if (parents.length === 0) return false;
  const biased = parents.filter(m => m._spawnBias);
  const p = (biased.length ? biased : parents)[Math.floor(Math.random() * (biased.length ? biased.length : parents.length))];
  const spot = preferredSpawn(p, occ);
  if (!spot) return false;
  if (p._spawnBias) p._spawnBias = 0;
  const t = gaugeToWorld(spot.gx, spot.gy);
  const child = new Mind(t.x + (Math.random() - 0.5) * 6, t.y + (Math.random() - 0.5) * 6);
  child.gx = spot.gx; child.gy = spot.gy;
  child._assigned = true;
  child.tintIdx = p.tintIdx;
  child.animalColor = p.animalColor;
  child.lastAnimalColor = p.animalColor;
  syncRestingV(child, p.animalColor);
  child.V = clamp(gauss(child.restingV, 0.10), -1, 1);
  child.spawnedAt = state.frame;
  state.minds.push(child);
  // Small brief nudge in temperature so the newborn shimmers
  state.jitter = Math.max(state.jitter, 0.25);
  const sp = voiceOf(p);
  if (sp) audio.play(sp, "birth");
  emitChi(child.x, child.y, 0.85, 70);
  narrateLife({
    short: spot.regen ? "the body reached for a remembered cell" : "a new mind sat down at the edge",
    long: spot.regen
      ? "Damage left a hole in the remembered shape. The surviving cells asked a mind to sit where the pattern still wanted a body."
      : "The animal asked an empty cell to host someone. The child inherited a color and a resting voltage, and now it has to earn the grid.",
    kind: "life",
    x: child.x, y: child.y,
  });
  return true;
}

function tryDissolve() {
  // A mind that's been drifting a long time without ever committing fades out.
  const candidates = state.minds.filter(m =>
    !m.committed && m.dying === undefined && (state.frame - (m.spawnedAt || 0)) > 60 * 20
  );
  if (candidates.length === 0) return false;
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  target.dying = LIFE.dyingFrames;
  const sp = voiceOf(target);
  if (sp) audio.play(sp, "death");
  emitChi(target.x, target.y, 0.75, 64);
  narrateLife({
    short: "a drifting mind is fading",
    long: "It never found a cell it could keep. The field is letting it go so the remaining bodies can breathe.",
    kind: "life",
    x: target.x, y: target.y,
  });
  return true;
}

function voiceOf(m) {
  return audio.speciesForColor(m.animalColor || m.lastAnimalColor);
}

function tryFission() {
  // Pick the largest animal. Find a "leaf" or thin-neck cell — releasing
  // its commit lets the graph re-form as two animals sharing no bond.
  const byAnimal = new Map();
  for (const m of state.minds) {
    if (m.animalId < 0 || m.dying !== undefined) continue;
    if (!byAnimal.has(m.animalId)) byAnimal.set(m.animalId, []);
    byAnimal.get(m.animalId).push(m);
  }
  const large = [...byAnimal.values()].filter(a => a.length >= 8);
  if (large.length === 0) return false;
  const anim = large[Math.floor(Math.random() * large.length)];
  const set = new Set(anim.map(m => `${m.gx},${m.gy}`));
  // Prefer minds with only 1 or 2 same-animal neighbors — likely bridges/leaves.
  const weak = anim.filter(m => {
    let count = 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (set.has(`${m.gx + dx},${m.gy + dy}`)) count++;
    }
    return count === 2;
  });
  if (weak.length === 0) return false;
  const m = weak[Math.floor(Math.random() * weak.length)];
  m.committed = false;
  m.settle = 0;
  m._assigned = false;
  // Kick sideways so it visibly leaves
  const dir = Math.random() * Math.PI * 2;
  m.vx += Math.cos(dir) * 2.4;
  m.vy += Math.sin(dir) * 2.4;
  const sp = voiceOf(m);
  if (sp) audio.play(sp, "fission");
  emitChi(m.x, m.y, 1.2, 92);
  narrateLife({
    short: "a body divided along a thin neck",
    long: "A bridge cell let go. One animal is becoming two, and each half will try to remember a shape.",
    kind: "life",
    x: m.x, y: m.y,
  });
  return true;
}
// ─── Narrator: sniff phase-change events and narrate them.
function detectNarrations(freshCommits) {
  const n = state.narration;
  const total = state.minds.length || 1;
  const committed = state.minds.filter(m => m.committed).length;
  const fracCommitted = committed / total;

  // Genesis — first frame
  if (state.frame === 1 && !n.flags.genesis) {
    n.flags.genesis = true;
    const at = mindsCentroid();
    narrate({
      short: "the field is being born",
      long: "A hundred minds have just materialized. None of them can talk to each other. All they can do is move — and all they can see is where their nearest neighbors are. Watch the arrows: those are the directions they want to go.",
      kind: "note",
      x: at.x, y: at.y,
    });
  }

  // Alignment visible — jitter has cooled enough that motion has direction
  if (!n.flags.alignment && state.frame > 90 && state.jitter < CFG.jitterInit * 0.5) {
    n.flags.alignment = true;
    narrate({
      short: "a shared 'up' is emerging",
      long: "The random shaking is dying down. From nothing but neighbor positions, the field is agreeing on a spacing and an orientation — a shared grid nobody drew. That's the gauge being negotiated.",
      kind: "note",
      x: state.gauge.cx, y: state.gauge.cy,
    });
  }

  // First commit — one mind stopped moving
  if (!n.flags.checking && state.minds.some(m => !m.committed && m.settle > 8)) {
    n.flags.checking = true;
    const checker = state.minds.find(m => !m.committed && m.settle > 8);
    narrate({
      short: "it doesn't decide, then check. the checking is the deciding",
      long: "A mind is staying near a cell and counting. That count is the decision. There is no later moment where it approves what it already did.",
      kind: "note",
      x: checker ? checker.x : state.gauge.cx,
      y: checker ? checker.y : state.gauge.cy,
    });
  }

  if (!n.flags.first_commit && committed >= 1) {
    n.flags.first_commit = true;
    const first = state.minds.find(m => m.committed);
    narrate({
      short: "the vector became a scalar",
      long: "Seven concerns were still open. Then the mind stayed, and they folded into one fact: this cell.",
      kind: "note",
      x: first ? first.x : state.gauge.cx,
      y: first ? first.y : state.gauge.cy,
    });
  }

  // Chord events — three or more simultaneous commits near each other
  if (freshCommits && freshCommits.length >= 3) {
    let cx = 0, cy = 0;
    for (const m of freshCommits) { cx += m.x; cy += m.y; }
    narrate({
      short: `a chord: ${freshCommits.length} minds committed together`,
      long: `${freshCommits.length} minds locked in at the same instant. Nobody coordinated the timing — they were just all ready together. In the theory this matters: consciousness papers argue a bound moment requires true co-instantiation, not staggered pieces. You just watched one.`,
      kind: "chord",
      x: cx / freshCommits.length, y: cy / freshCommits.length,
    });
  } else if (freshCommits && freshCommits.length === 2) {
    narrate({
      short: "two minds committed at the same instant",
      long: "A chord, if you're keeping count — two commitments in the same tick. Not many at once yet, but the pace is picking up.",
      kind: "chord",
      x: (freshCommits[0].x + freshCommits[1].x) * 0.5,
      y: (freshCommits[0].y + freshCommits[1].y) * 0.5,
    });
  }

  // First animal — a lattice animal has formed
  if (!n.flags.first_animal && state.animalCount >= 1) {
    n.flags.first_animal = true;
    const body = mindsCentroid(m => m.animalId >= 0);
    narrate({
      short: "the shape is not what it looks like. it's what commits together",
      long: "Two committed minds are now sitting on 4-adjacent cells of the shared grid. Together they count as an animal — the smallest possible body. Watch the warm filament that just appeared between them: that's the bond.",
      kind: "animal",
      x: body.x, y: body.y,
    });
  }

  // Fraction milestones
  const milestones = [
    [0.25, "milestone_25", "a quarter of the field is locked in", "About one in four minds has committed. The lattice is beginning to hold. Look at the warm filaments — they're the edges of small polyominos starting to form."],
    [0.50, "milestone_50", "half the field has committed", "Half the minds are still. From here the remaining ones tend to fall into place quickly — their neighbors have already picked cells, so it's obvious which cell is theirs."],
    [0.90, "milestone_90", "the negotiation is nearly complete", "Almost every mind has committed. The last few are picking between two nearly-equal candidate cells — that's the flickering you might see near the edges."],
    [0.99, "milestone_100", "every mind has committed", "The field has gone still. The chaos is over; the body is stable. What you're looking at is the answer they arrived at together, using only movement as a language."],
  ];
  for (const [thresh, flag, short, long] of milestones) {
    if (!n.flags[flag] && fracCommitted >= thresh) {
      n.flags[flag] = true;
      const at = mindsCentroid(m => m.committed);
      narrate({ short, long, kind: "note", x: at.x, y: at.y });
    }
  }

  // Largest animal grows past thresholds — the biggest animal's species roars.
  const largeThresholds = [5, 10, 20, 40];
  for (const t of largeThresholds) {
    const flag = `large_${t}`;
    if (!n.flags[flag] && state.largestAnimal >= t) {
      n.flags[flag] = true;
      const big = mindsCentroid(m => m.animalColor === findLargestAnimalColor());
      narrate({
        short: `the biggest animal is now ${state.largestAnimal} cells wide`,
        long: `The largest connected polyomino has grown to ${state.largestAnimal} cells. Every cell in it was placed by a mind that only ever saw its neighbors — nobody planned the shape.`,
        kind: "animal",
        x: big.x, y: big.y,
      });
      // Find its species and give a full-voice call
      const largest = findLargestAnimalColor();
      const sp = audio.speciesForColor(largest);
      if (sp) audio.play(sp, "growth");
    }
  }

  // Merger — animal count dropped while committed count went up (or held).
  const prevA = state.prevAnimalCount, prevC = state.prevCommittedCount;
  if (state.frame > 60 && state.animalCount < prevA && committed >= prevC && state.animalCount > 0) {
    const merged = prevA - state.animalCount;
    if (merged >= 1) {
      const seam = mindsCentroid(m => m.animalId >= 0);
      narrate({
        short: merged === 1
          ? "two animals merged into one"
          : `${merged + 1} animals merged into fewer`,
        long: "A new commit sitting on an adjacent cell just bridged two separate animals — they're one body now. Watch the perimeter outline redraw itself around the union.",
        kind: "animal",
        x: seam.x, y: seam.y,
      });
      // Voice the merger with the surviving animal's species
      const sp = audio.speciesForColor(findLargestAnimalColor());
      if (sp) audio.play(sp, "merger");
      let cx = 0, cy = 0, n = 0;
      for (const m of state.minds) {
        if (m.animalId >= 0) { cx += m.x; cy += m.y; n++; }
      }
      if (n) emitChi(cx / n, cy / n, 1.05, 100);
    }
  }
  state.prevAnimalCount = state.animalCount;
  state.prevCommittedCount = committed;
  state.prevLargest = state.largestAnimal;
}

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
    let sumX = 0, sumY = 0;
    for (const j of N) {
      const dx = minds[j].x - m.x;
      const dy = minds[j].y - m.y;
      const d = Math.hypot(dx, dy);
      dists.push(d);
      const a = Math.atan2(dy, dx);
      sumSin4 += Math.sin(4 * a);
      sumCos4 += Math.cos(4 * a);
      sumX += dx; sumY += dy;
    }
    dists.sort((a, b) => a - b);
    const median = dists[Math.floor(dists.length / 2)];
    m.localS = clamp(median, CFG.spacingMin, CFG.spacingMax);
    m.localT = Math.atan2(sumSin4, sumCos4) / 4;
    // Neighbor-mean direction, EMA-smoothed for a legible arrow.
    const nx = sumX / N.length, ny = sumY / N.length;
    const scan = m._fastScan ? 0.35 : 0.15;
    m.nMeanX = m.nMeanX * (1 - scan) + nx * scan;
    m.nMeanY = m.nMeanY * (1 - scan) + ny * scan;
    m._fastScan = 0;
    meanS += m.localS;
    meanC += Math.cos(4 * m.localT);
    meanSn += Math.sin(4 * m.localT);
    count++;
  }

  // V diffusion: each mind drifts toward the mean V of its committed
  // Voronoi neighbors. Isolated minds rest toward their species band.
  // Rate is a leak, not a snap — Levin gap-junction matching.
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const N = neighborsCache[i] || [];
    let sum = 0, n = 0;
    for (const j of N) {
      if (minds[j].committed) { sum += minds[j].V; n++; }
    }
    const target = n > 0 ? sum / n : m.restingV;
    const rate = n > 0 ? CFG.vDiffuse : CFG.vRest;
    m.V = clamp(m.V + (target - m.V) * rate, -1, 1);
    if (n > 0) {
      const iso = Math.abs(m.V - target);
      m.isoTicks = iso > 0.55 ? (m.isoTicks || 0) + 1 : Math.max(0, (m.isoTicks || 0) - 2);
      if (!m.cancer && m.isoTicks > 90 && Math.random() < 0.008) {
        m.cancer = true;
        m.committed = false;
        m.settle = 0;
        m.V = clamp(m.V + 0.28, -1, 1);
        emitChi(m.x, m.y, 1.1, 88);
        narrateLife({
          short: "a mind left the informational structure",
          long: "Its voltage drifted too far from the body for too long. Isolated, it depolarized and began to speak a language the others could not use.",
          kind: "life",
          x: m.x, y: m.y,
        });
      }
    }
    if (m.cancer) {
      m.cancerAge = (m.cancerAge || 0) + 1;
      m.V = clamp(m.V + 0.012, -1, 1);
      let nearest = null, best = Infinity;
      for (const o of minds) {
        if (o === m || o.animalId < 0 || o.animalId === m.animalId) continue;
        const d = Math.hypot(o.x - m.x, o.y - m.y);
        if (d < best) { best = d; nearest = o; }
      }
      if (nearest) m.V = clamp(m.V + (nearest.V - m.V) * 0.04, -1, 1);
    }
    if (Math.abs(m.V - m.prevV) < 0.012) m.vStable = Math.min(240, (m.vStable || 0) + 1);
    else m.vStable = Math.max(0, (m.vStable || 0) - 2);
    m.prevV = m.V;
    updateValence(m, N, minds);
    const nbMinds = N.map(j => minds[j]);
    audio.applySpeciesPolicy(m, nbMinds, { minds, frame: state.frame, emitChi });
  }

  // Load-bearing bottleneck: the committed mind whose V is farthest from
  // its neighbors would reshape the lattice most if it moved.
  let bot = -1, botScore = 0;
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (!m.committed) continue;
    const N = neighborsCache[i] || [];
    let sum = 0, n = 0;
    for (const j of N) { if (minds[j].committed) { sum += minds[j].V; n++; } }
    if (!n) continue;
    const score = Math.abs(m.V - sum / n) * (1 + (m.animalId >= 0 ? 0.4 : 0));
    if (score > botScore) { botScore = score; bot = i; }
  }
  state.bottleneckIdx = botScore > 0.08 ? bot : -1;

  if (count > 0) {
    // Rotation adapts freely, but spacing stays anchored to the initial size —
    // free adaptation collapses (contracting minds → smaller spacing → more contraction).
    const targetT = Math.atan2(meanSn / count, meanC / count) / 4;
    let dT = targetT - state.gauge.theta;
    while (dT > Math.PI / 4) dT -= Math.PI / 2;
    while (dT < -Math.PI / 4) dT += Math.PI / 2;
    state.gauge.width = clamp(state.gauge.width * 0.94 + Math.abs(dT) * 0.18, 0.018, 0.55);
    const snap = state.gauge.width < 0.07
      ? 1
      : (0.28 + 0.72 * (1 - clamp(state.gauge.width / 0.4, 0, 1)));
    state.gauge.theta += dT * CFG.gaugeLR * snap;
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
      const chi = sampleChi(m.x, m.y);
      const s = state.gauge.s / Math.pow(Math.max(chi, 1), CFG.chiAlpha);
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

  // First pass: mark this tick's fresh commits so we can measure chord vs arpeggio.
  const freshCommits = [];
  for (const m of minds) {
    const t = gaugeToWorld(m.gx, m.gy);
    const d = Math.hypot(m.x - t.x, m.y - t.y);
    if (d < CFG.commitDist) {
      m.settle = Math.min(CFG.commitFrames, m.settle + 1);
      if (m.settle >= CFG.commitFrames && !m.committed) {
        m.committed = true;
        m.commitFlash = 45;
        m._arpDelay = 0;
        m.collapse = 72;
        m.bornAt = state.frame;
        freshCommits.push(m);
      }
    } else if (d > CFG.releaseDist) {
      m.settle = Math.max(0, m.settle - 2);
      if (m.settle === 0) m.committed = false;
    }
    if (m._arpDelay > 0) {
      m._arpDelay--;
      if (m._arpDelay === 0) m.commitFlash = Math.round(45 * Math.min(2.5, 0.9 + 0.35 * (m.commitChord || 1)));
    }
    if (m.commitFlash > 0) m.commitFlash--;
    if (m.collapse > 0) m.collapse--;
  }
  // Voice each fresh commit softly — its animal's species (if it has one) speaks.
  for (const m of freshCommits) {
    const sp = audio.speciesForColor(m.animalColor || m.lastAnimalColor);
    if (sp) audio.play(sp, "commit");
  }

  // Chord interference: any freshly committed mind whose kin also committed within
  // this tick or the previous 3 gets a brighter, longer birth-flash. Truly
  // simultaneous commits are the "chord"; staggered ones remain the "arpeggio."
  const CHORD_WINDOW = 3;
  const CHORD_RADIUS = state.gauge.s * 1.6;
  for (const m of freshCommits) {
    let kin = 1;
    for (const o of minds) {
      if (o === m) continue;
      if (o.committed && state.frame - o.bornAt <= CHORD_WINDOW) {
        const dx = o.x - m.x, dy = o.y - m.y;
        if (dx * dx + dy * dy < CHORD_RADIUS * CHORD_RADIUS) kin++;
      }
    }
    m.commitChord = kin;
    const flash = Math.round(45 * Math.min(2.5, 0.9 + 0.35 * kin));
    if (state.temporalGapMode === "arpeggio") {
      m._arpDelay = 8 + freshCommits.indexOf(m) * 14;
      m.commitFlash = 0;
    } else {
      m.commitFlash = flash;
    }
    // Retroactively brighten the just-committed kin who fired in the window
    for (const o of minds) {
      if (o === m || !o.committed) continue;
      if (state.frame - o.bornAt <= CHORD_WINDOW && o.commitChord < kin) {
        const dx = o.x - m.x, dy = o.y - m.y;
        if (dx * dx + dy * dy < CHORD_RADIUS * CHORD_RADIUS) {
          o.commitChord = kin;
          o.commitFlash = Math.max(o.commitFlash, Math.round(45 * Math.min(2.5, 0.9 + 0.35 * kin)));
        }
      }
    }
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
      // Stable color: the signature is the sorted list of gauge cells. If the
      // same body reforms later it keeps its color; a merged body inherits the
      // color of whichever contributor had more cells.
      const sig = members.map(i => `${minds[i].gx},${minds[i].gy}`).sort().join("|");
      let rec = coerceAnimalRecord(state.animalKeys.get(sig));
      if (!rec) {
        const prevColors = new Map();
        for (const idx of members) {
          const prev = minds[idx].lastAnimalColor;
          if (prev) prevColors.set(prev, (prevColors.get(prev) || 0) + 1);
        }
        let best = null, bestN = 0;
        for (const [c, n] of prevColors) if (n > bestN) { best = c; bestN = n; }
        rec = {
          color: best || ANIMAL_HUES[(state.animalKeys.size * 7 + members[0]) % ANIMAL_HUES.length],
          memory: best ? (state.morphByColor.get(best) || null) : null,
          age: 0,
          missAge: 0,
        };
      }
      rec.age = (rec.age || 0) + 1;
      if (members.length >= 2 && rec.age >= 24 && !rec.memory) {
        rec.memory = captureOffsets(members, minds);
        state.morphByColor.set(rec.color, rec.memory);
      }
      if (rec.memory) {
        const missing = missingOffsets(members, minds, rec.memory);
        rec.missAge = missing.length ? (rec.missAge || 0) + 1 : 0;
        if (rec.missAge > 60 * 12) {
          rec.memory = captureOffsets(members, minds);
          rec.missAge = 0;
          state.morphByColor.set(rec.color, rec.memory);
        } else if (!missing.length) {
          state.morphByColor.set(rec.color, rec.memory);
        }
      }
      state.animalKeys.set(sig, rec);
      const color = rec.color;
      for (const idx of members) {
        minds[idx].animalId = animalCount;
        minds[idx].animalColor = color;
        minds[idx].lastAnimalColor = color;
        syncRestingV(minds[idx], color);
      }
      state.animalColors.set(animalCount, color);
      animalSize.push(members.length);
      animalCount++;
    }
  }
  state.animalCount = animalCount;
  state.largestAnimal = animalSize.reduce((a, b) => Math.max(a, b), 0);

  // Detect and emit narrations for phase transitions this tick.
  detectNarrations(freshCommits);

  // Living dynamics — once the field is mostly committed, life takes over.
  updateLivingPhase();

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
  // The narrator never goes silent. After commit, speak living observations.
  // Before that, cycle ambient verses if the phase events have been quiet.
  const framesSinceNarration = state.frame - state.narration.lastNarratedFrame;
  if (state.narration.flags.living && framesSinceNarration > 60 * 11) {
    const pulse = LIFE_PULSE[state.verseIndex % LIFE_PULSE.length];
    state.verseIndex++;
    const here = mindsCentroid(m => m.animalId >= 0);
    narrate({ short: pulse.short, long: pulse.long, kind: "life", x: here.x, y: here.y });
  } else if (!state.narration.flags.living && framesSinceNarration > 60 * 10 && state.verseTimer > 60 * 8) {
    state.verseTimer = 0;
    state.verseIndex = (state.verseIndex + 1) % VERSES.length;
    setVerseText(VERSES[state.verseIndex]);
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

  rebuildChi();
  drawAmbient();
  const heavy = !(state.perf && state.perf.skipHeavy);
  if (heavy) drawChiField();
  drawLightCones();
  drawWmaxFan();
  drawMorphGhosts();
  if (heavy) drawAnticipation();
  drawDust();
  if (heavy) drawTwinkles();
  drawGhostLattice();
  drawMembranes();     // Voronoi cells filled with each mind's tint (soft)
  drawVoronoiEdges();  // very faint boundary lines above the fills
  drawAnimalOutline(); // the polyomino body
  drawBonds();         // filaments between minds
  drawField();         // vector cilia
  drawMinds();         // nucleus + organelles
  if (heavy) drawPredictiveGhosts();
  drawLoci();
  if (state.frame % 4 === 0) {
    state.loci = state.loci.filter(l => state.frame - l.born < 220);
    renderLocusPins();
  }
}

function drawLoci() {
  if (!state.loci.length) return;
  ctx.save();
  const loc = state.loci[0];
  const age = state.frame - loc.born;
  const t = clamp(1 - age / 220, 0, 1);
  const arrive = clamp(age / 16, 0, 1);
  const tint = locusTint(loc.kind);
  const reach = Math.max(W, H) * 0.92;

  // A hush: the rest of the field falls back so this moment can be seen.
  const hush = ctx.createRadialGradient(loc.x, loc.y, 36, loc.x, loc.y, reach);
  hush.addColorStop(0, "rgba(0,0,0,0)");
  hush.addColorStop(0.38, `rgba(6, 8, 16, ${0.10 * t})`);
  hush.addColorStop(1, `rgba(6, 8, 16, ${0.46 * t})`);
  ctx.fillStyle = hush;
  ctx.fillRect(0, 0, W, H);

  // Well of attention — cool, never a second warm body.
  const well = ctx.createRadialGradient(loc.x, loc.y, 0, loc.x, loc.y, 120);
  well.addColorStop(0, `rgba(${CREAM}, ${0.22 * t})`);
  well.addColorStop(0.32, `rgba(${tint}, ${0.14 * t})`);
  well.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.arc(loc.x, loc.y, 120, 0, Math.PI * 2);
  ctx.fill();

  // Interference rings — the moment arriving.
  for (let k = 0; k < 3; k++) {
    const r = (12 + age * 0.32 + k * 18) * arrive;
    ctx.strokeStyle = `rgba(${k === 0 ? CREAM : tint}, ${t * (0.78 - k * 0.18)})`;
    ctx.lineWidth = k === 0 ? 1.9 : 1.2;
    ctx.beginPath();
    ctx.arc(loc.x, loc.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(${CREAM}, ${0.85 * t})`;
  ctx.beginPath();
  ctx.arc(loc.x, loc.y, 3.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(${CREAM}, ${0.7 * t})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(loc.x - 5, loc.y);
  ctx.lineTo(loc.x + 5, loc.y);
  ctx.moveTo(loc.x, loc.y - 5);
  ctx.lineTo(loc.x, loc.y + 5);
  ctx.stroke();

  // A hair of light from the verse to the event — this is why it said this.
  const from = verseAnchorSim();
  const mx = (from.x + loc.x) * 0.5;
  const my = Math.min(from.y, loc.y) - 48;
  ctx.strokeStyle = `rgba(${tint}, ${0.28 + 0.48 * t})`;
  ctx.lineWidth = 1.45;
  ctx.setLineDash([5, 7]);
  ctx.lineDashOffset = -state.frame * 0.7;
  ctx.shadowColor = `rgba(${tint}, ${0.35 * t})`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.quadraticCurveTo(mx, my, loc.x, loc.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Residual ring of the previous moment, already forgetting.
  const prev = state.loci[1];
  if (prev) {
    const pa = state.frame - prev.born;
    const pt = clamp(1 - pa / 220, 0, 1);
    ctx.strokeStyle = `rgba(${CREAM}, ${0.12 * pt})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(prev.x, prev.y, 18 + pa * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

function drawChiField() {
  // Cool, faint concern blooms. Warmth stays on committed gold — this is
  // only the spatial map of activity, not a second body.
  const src = state.chiSources;
  if (!src.length) return;
  ctx.save();
  for (const s of src) {
    const a = clamp(s.amp, 0, 1.4);
    const g = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, s.sigma * 2.2);
    g.addColorStop(0, `rgba(134, 186, 168, ${0.11 * a})`);
    g.addColorStop(0.45, `rgba(150, 178, 226, ${0.055 * a})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.cx, s.cy, s.sigma * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLightCones() {
  const minds = state.minds;
  if (!minds.length) return;
  const gs = state.gauge.s;
  ctx.save();
  const byAnimal = new Map();
  const seekers = minds.filter(m => !m.committed);
  const coneBudget = seekers.length <= 18
    ? new Set(seekers)
    : new Set(seekers.filter(m => m.settle > 0).concat(seekers.slice(0, 12)));
  for (const m of minds) {
    const r = (m.localS || gs) * CFG.coneScale * (m.committed && m.animalId >= 0 ? 1.15 : 1);
    m.lightCone = r;
    // Per-mind cones stay on searching minds only. Committed cells join
    // the animal's fused cone so the field does not turn into graph paper.
    if (!m.committed && coneBudget.has(m)) {
      const g = ctx.createRadialGradient(m.x, m.y, r * 0.15, m.x, m.y, r);
      g.addColorStop(0, "rgba(132, 176, 255, 0.12)");
      g.addColorStop(1, "rgba(132, 176, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(132, 176, 255, 0.48)";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (m.animalId >= 0) {
      if (!byAnimal.has(m.animalId)) byAnimal.set(m.animalId, []);
      byAnimal.get(m.animalId).push(m);
    }
  }
  const neigh = state._neighbors;
  if (neigh) {
    for (let i = 0; i < minds.length; i++) {
      const m = minds[i];
      if (m.committed) continue;
      for (const j of neigh[i] || []) {
        if (j <= i) continue;
        const o = minds[j];
        if (o.committed) continue;
        const d = Math.hypot(m.x - o.x, m.y - o.y);
        if (d < (m.lightCone + o.lightCone) * 0.55) {
          ctx.fillStyle = "rgba(180, 210, 255, 0.16)";
          ctx.beginPath();
          ctx.arc((m.x + o.x) * 0.5, (m.y + o.y) * 0.5, 14, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  for (const group of byAnimal.values()) {
    if (group.length < 2) continue;
    let cx = 0, cy = 0, r = 0;
    for (const m of group) { cx += m.x; cy += m.y; r = Math.max(r, m.lightCone || gs); }
    cx /= group.length; cy /= group.length;
    ctx.strokeStyle = "rgba(160, 200, 255, 0.48)";
    ctx.lineWidth = 1.7;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 0.85);
    g.addColorStop(0, "rgba(150, 178, 226, 0.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWmaxFan() {
  const g = state.gauge;
  const w = Math.max(0.03, g.width || 0.28);
  const wide = clamp(w / 0.4, 0, 1);
  ctx.save();
  ctx.translate(g.cx, g.cy);
  ctx.rotate(g.theta);
  const reach = g.s * 3.6;
  ctx.fillStyle = `rgba(${CREAM}, ${0.045 + 0.12 * wide})`;
  for (const base of [0, Math.PI / 2]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, base - w, base + w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = `rgba(${CREAM}, ${0.28 + 0.40 * wide})`;
  ctx.lineWidth = 1.35;
  for (const sign of [-1, 1]) {
    const a = sign * w;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(Math.cos(a + Math.PI / 2) * 10, Math.sin(a + Math.PI / 2) * 10);
    ctx.lineTo(Math.cos(a + Math.PI / 2) * reach, Math.sin(a + Math.PI / 2) * reach);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMorphGhosts() {
  const minds = state.minds;
  if (!minds.length) return;
  const by = new Map();
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    if (m.animalId < 0 || !m.committed) continue;
    if (!by.has(m.animalId)) by.set(m.animalId, { color: m.animalColor, members: [] });
    by.get(m.animalId).members.push(i);
  }
  const pulse = 0.55 + 0.40 * (0.5 + 0.5 * Math.sin(state.frame * 0.12));
  ctx.save();
  for (const { color, members } of by.values()) {
    const memory = state.morphByColor.get(color);
    if (!memory || members.length < 1) continue;
    const missing = missingWorldCells(members, minds, memory);
    if (!missing.length) continue;
    for (const hole of missing) {
      const p = gaugeToWorld(hole.gx, hole.gy);
      ctx.strokeStyle = `rgba(${color || CREAM}, ${pulse})`;
      ctx.shadowColor = `rgba(${color || CREAM}, 0.7)`;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${CREAM}, 0.22)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawAnticipation() {
  const minds = state.minds;
  const occ = occupiedCells();
  const seen = new Set();
  ctx.save();
  for (const m of minds) {
    if (!m.committed || m.animalId < 0) continue;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of dirs) {
      const gx = m.gx + dx, gy = m.gy + dy;
      const key = `${gx},${gy}`;
      if (occ.has(key) || seen.has(key)) continue;
      const p = gaugeToWorld(gx, gy);
      const chi = sampleChi(p.x, p.y);
      const mem = state.morphByColor.get(m.animalColor);
      const members = [];
      for (let i = 0; i < minds.length; i++) if (minds[i].animalId === m.animalId) members.push(i);
      const missing = mem ? missingWorldCells(members, minds, mem) : [];
      const wanted = missing.some(h => h.gx === gx && h.gy === gy);
      const mount = wanted || chi > 1.18;
      if (!mount) continue;
      seen.add(key);
      const a = clamp(0.16 + (chi - 1) * 0.22 + (wanted ? 0.22 : 0), 0, 0.48);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16);
      g.addColorStop(0, `rgba(${CREAM}, ${a})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
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
    if (state.gaze && state.frame - state.gaze.born < 160) {
      const gd = Math.hypot(m.x - state.gaze.x, m.y - state.gaze.y);
      if (gd < 150) alpha *= 1 + (1 - gd / 150) * 0.55 * (1 - (state.frame - state.gaze.born) / 160);
    }
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

  // Warm halo behind the animal body — glow tinted by the animal's own color.
  ctx.save();
  for (const i of cellMap.values()) {
    const m = minds[i];
    const r = state.gauge.s * 0.75;
    const color = m.animalColor || "255, 209, 92";
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
    g.addColorStop(0, `rgba(${color}, 0.18)`);
    g.addColorStop(0.55, `rgba(${color}, 0.06)`);
    g.addColorStop(1, `rgba(${color}, 0.00)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Perimeter of the animal body: for each animal-member Voronoi cell,
  // stroke only those polygon edges whose adjacent site is NOT in the animal.
  // Perimeter is tinted by the animal's own color (with a cream inner stroke
  // so it still reads as a "body" not a colored patch).
  ctx.save();
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const i of cellMap.values()) {
    const m = minds[i];
    const poly = vor.cellPolygon(i);
    if (!poly) continue;
    const N = state._neighbors[i] || [];
    const color = m.animalColor || CREAM;
    for (let k = 0; k < poly.length - 1; k++) {
      const [x1, y1] = poly[k];
      const [x2, y2] = poly[k + 1];
      const midx = (x1 + x2) * 0.5, midy = (y1 + y2) * 0.5;
      let bestJ = -1, bestD2 = Infinity;
      for (const j of N) {
        const dx = minds[j].x - midx, dy = minds[j].y - midy;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestJ = j; }
      }
      if (bestJ >= 0 && minds[bestJ].animalId === m.animalId) continue;
      if (bestJ >= 0 && minds[bestJ].animalId >= 0 && minds[bestJ].animalId !== m.animalId) {
        const dV = Math.abs((m.V ?? 0) - (minds[bestJ].V ?? 0));
        const shimmer = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(state.frame * 0.22 + midx * 0.05));
        ctx.strokeStyle = `rgba(160, 220, 255, ${shimmer})`;
        ctx.shadowColor = `rgba(160, 220, 255, ${0.55 + 0.4 * dV})`;
        ctx.shadowBlur = 12 + 10 * dV;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        continue;
      }
      // Perimeter edge — colored glow, cream inner
      ctx.strokeStyle = `rgba(${color}, 0.75)`;
      ctx.shadowColor = `rgba(${color}, 0.8)`;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(${CREAM}, 0.55)`;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
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
      if (!N) continue;
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

  // Bright committed bonds — colored by the animal's own hue so different
  // animals show up as different-colored constellations.
  if (map.size) {
    ctx.lineCap = "round";
    ctx.lineWidth = 1.5;
    const seen = new Set();
    const dirs = [[1, 0], [0, 1]];
    for (const [key, i] of map) {
      const m = minds[i];
      const color = m.animalColor || "248, 220, 150";
      for (const [dx, dy] of dirs) {
        const nk = `${m.gx + dx},${m.gy + dy}`;
        const j = map.get(nk);
        if (j === undefined) continue;
        const edgeKey = key + "|" + nk;
        if (seen.has(edgeKey)) continue;
        seen.add(edgeKey);
        const o = minds[j];
        // Levin: gap-junction conductance is voltage-gated. Same-V bonds
        // stay open and bright; large |ΔV| gates them shut.
        const dV = Math.abs((m.V ?? 0) - (o.V ?? 0));
        const gate = clamp(1 - dV, 0, 1);
        ctx.strokeStyle = `rgba(${color}, ${0.22 + 0.68 * gate})`;
        ctx.shadowColor = `rgba(${color}, ${0.30 + 0.55 * gate})`;
        ctx.shadowBlur = 4 + 8 * gate;
        ctx.lineWidth = 0.65 + 1.15 * gate;
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
    // === Dual-vector divergence: what the neighborhood suggests vs. what
    // the mind actually does. Wildly splayed in chaos, converging as the
    // gauge is negotiated — a direct visual of DVFP's key measurement.
    if (!m.committed) {
      const nsp = Math.hypot(m.nMeanX, m.nMeanY);
      if (nsp > 0.5) {
        const nlen = Math.min(28, nsp * 0.35);
        const ex = m.x + (m.nMeanX / nsp) * nlen;
        const ey = m.y + (m.nMeanY / nsp) * nlen;
        // Fade this hint arrow as it aligns with the actual velocity — the
        // convergence itself is the story.
        let alignAlpha = 0.35;
        if (sp > 0.1) {
          const dot = (m.vx * m.nMeanX + m.vy * m.nMeanY) / (sp * nsp);
          alignAlpha = 0.4 * (1 - Math.max(0, dot));  // fades as vectors agree
        }
        if (alignAlpha > 0.03) {
          ctx.strokeStyle = `rgba(140, 195, 255, ${alignAlpha})`;
          ctx.lineWidth = 0.75;
          ctx.setLineDash([2.5, 3]);
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

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

    // Cilia — uncommitted length follows spacing-fit valence; hue follows
    // rotation-fit (teal → coral). Stability brightens them over time.
    const v0 = m.valence ? m.valence[0] : 0.5;
    const v1 = m.valence ? m.valence[1] : 0.5;
    const stable = clamp((m.vStable || 0) / 60, 0, 1);
    const cilLen = (m.committed ? 5.6 : 4.2) * (0.82 + 0.38 * v0);
    const cilA = (m.committed ? 0.32 : 0.22) * (0.7 + 0.9 * stable);
    const cr = Math.round(134 + (226 - 134) * (1 - v1));
    const cg = Math.round(186 + (140 - 186) * (1 - v1));
    const cb = Math.round(168 + (108 - 168) * (1 - v1));
    ctx.strokeStyle = m.committed ? `rgba(${CREAM}, ${cilA})` : `rgba(${cr}, ${cg}, ${cb}, ${cilA})`;
    ctx.lineWidth = 0.85;
    ctx.lineCap = "round";
    ctx.shadowColor = `rgba(${m.committed ? CREAM : `${cr}, ${cg}, ${cb}`}, ${0.25 + 0.55 * stable})`;
    ctx.shadowBlur = 2 + 12 * stable;
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
    ctx.shadowBlur = 0;

    // Seven valence threads. Open on the uncommitted mind; collapse to one
    // cream spoke in the frames after commit.
    if (m.valence && (!m.committed || m.collapse > 0)) {
      const fold = m.committed ? 1 - (m.collapse / 72) : 0;
      for (let k = 0; k < 7; k++) {
        const a0 = (k / 7) * Math.PI * 2 + m.phase * 0.15;
        const a = a0 * (1 - fold);
        const len = (4.2 + 10 * m.valence[k]) * (1 - 0.45 * fold);
        const tint = fold > 0.62 ? CREAM : VALENCE_TINTS[k];
        ctx.strokeStyle = `rgba(${tint}, ${0.58 + 0.40 * m.valence[k]})`;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(m.x + Math.cos(a) * 5, m.y + Math.sin(a) * 5);
        ctx.lineTo(m.x + Math.cos(a) * (5 + len), m.y + Math.sin(a) * (5 + len));
        ctx.stroke();
      }
    }

    // Birth flash — an expanding cream ring at the moment of committing. Chord
    // events (kin >= 2) fire brighter, wider, longer.
    if (m._arpDelay > 0) {
      const wait = 1 - m._arpDelay / 36;
      ctx.strokeStyle = `rgba(${CREAM}, ${0.18 + 0.35 * wait})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6 + 10 * wait, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (m.commitFlash > 0) {
      const chord = m.commitChord || 1;
      const life = 45 * Math.min(2.5, 0.9 + 0.35 * chord);
      const f = m.commitFlash / life;
      const ringR = (1 - f) * gs * (0.5 + 0.12 * (chord - 1)) + 4;
      const intensity = Math.min(1, 0.7 + 0.18 * chord);
      ctx.strokeStyle = `rgba(${CREAM}, ${f * intensity})`;
      ctx.lineWidth = 1 + 1.4 * f + 0.4 * (chord - 1);
      ctx.beginPath();
      ctx.arc(m.x, m.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
      // Chord echo — a second inner ring for real chord events
      if (chord >= 2) {
        ctx.strokeStyle = `rgba(${CREAM}, ${f * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(m.x, m.y, ringR * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Ghost-self rosette: for uncommitted minds, faintly render their four
    // 4-adjacent candidate cells alongside their current best pick, dimmed by
    // how much less good those alternatives look. Collapses to one at commit.
    if (!m.committed && state.frame > 20) {
      const targetX = m.x - (m.x - gaugeToWorld(m.gx, m.gy).x);
      // (target coords for the current pick)
      const cur = gaugeToWorld(m.gx, m.gy);
      const dCur = Math.hypot(cur.x - m.x, cur.y - m.y);
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      for (const [dx, dy] of dirs) {
        const alt = gaugeToWorld(m.gx + dx, m.gy + dy);
        const dAlt = Math.hypot(alt.x - m.x, alt.y - m.y);
        // weight by how close the alt is relative to the current pick (Softmax‑ish)
        const w = Math.exp(-(dAlt - dCur) / (gs * (0.28 + state.gauge.width)));
        const keep = 0.045 + 0.16 * clamp(state.gauge.width / 0.4, 0, 1);
        if (w < keep) continue;
        const a = (0.22 + 0.28 * clamp(state.gauge.width / 0.35, 0, 1)) * w * (1 - m.settle / CFG.commitFrames);
        if (a < 0.04) continue;
        ctx.fillStyle = `rgba(${CREAM}, ${a})`;
        ctx.beginPath();
        ctx.arc(alt.x, alt.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // V ring — sign as tissue teal (hyperpolarized) vs coral (depolarized),
    // magnitude as alpha. Cool accent only; warmth stays on committed gold.
    const vAbs = Math.abs(m.V);
    if (vAbs > 0.04) {
      const vTint = m.V >= 0 ? "226, 140, 108" : "134, 186, 168";
      ctx.strokeStyle = `rgba(${vTint}, ${0.16 + 0.40 * vAbs})`;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.arc(m.x, m.y, (isAnimal ? 5.2 : 4.6) * breathScale, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (m.cancer) {
      const age = m.cancerAge || 0;
      const dark = age < 40;
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 6 + m.phase));
      ctx.strokeStyle = dark
        ? `rgba(20, 16, 24, ${0.55 + 0.3 * pulse})`
        : `rgba(255, 90, 120, ${0.45 + 0.5 * pulse})`;
      ctx.lineWidth = dark ? 3.2 : 2.2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, (dark ? 5 : 8.5) * breathScale, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (i === state.bottleneckIdx) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4);
      ctx.strokeStyle = `rgba(${CREAM}, ${0.35 + 0.40 * pulse})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 11 + 3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    const spKey = audio.speciesForColor(m.animalColor || m.lastAnimalColor);
    if (spKey && m.committed) {
      const mark = {
        lion: "226, 140, 108", parakeet: "132, 220, 236", wolf: "168, 156, 240",
        elephant: "132, 176, 255", whale: "218, 140, 240", frog: "170, 232, 148",
        owl: "132, 236, 200", dolphin: "255, 209, 92", cricket: "232, 220, 128",
        sparrow: "220, 172, 244",
      }[spKey];
      if (mark) {
        ctx.strokeStyle = `rgba(${mark}, 0.7)`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 8.2 * breathScale, m.phase, m.phase + 1.1);
        ctx.stroke();
      }
    }

    // Outer soft glow
    const glowTint = isAnimal ? (m.animalColor || CREAM) : tint;
    const glowA = m.cancer ? 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5)) : 0.9 * brightness;
    ctx.shadowColor = `rgba(${glowTint}, ${glowA})`;
    ctx.shadowBlur = isAnimal ? 18 : 10;
    ctx.fillStyle = `rgba(${glowTint}, ${glowA})`;
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

function drawPredictiveGhosts() {
  const minds = state.minds;
  const by = new Map();
  for (const m of minds) {
    if (m.animalId < 0) continue;
    if (!by.has(m.animalId)) by.set(m.animalId, []);
    by.get(m.animalId).push(m);
  }
  const cents = [];
  for (const [id, group] of by) {
    let cx = 0, cy = 0, born = Infinity;
    for (const m of group) { cx += m.x; cy += m.y; born = Math.min(born, m.bornAt || 0); }
    cents.push({
      id, group, x: cx / group.length, y: cy / group.length,
      mature: group.length >= 5 && (state.frame - born) >= 60 * 8,
      color: group[0].animalColor || CREAM,
    });
  }
  ctx.save();
  for (const a of cents) {
    if (!a.mature) {
      const nx = Math.cos(state.gauge.theta) * 6;
      const ny = Math.sin(state.gauge.theta) * 6;
      ctx.strokeStyle = `rgba(${CREAM}, 0.28)`;
      ctx.lineWidth = 1.1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(a.x + nx, a.y + ny, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    let best = null, bd = Infinity;
    for (const o of cents) {
      if (o.id === a.id) continue;
      const d = Math.hypot(o.x - a.x, o.y - a.y);
      if (d < bd) { bd = d; best = o; }
    }
    if (!best) continue;
    const ux = (best.x - a.x) / (bd || 1), uy = (best.y - a.y) / (bd || 1);
    for (const m of a.group) {
      ctx.strokeStyle = `rgba(${a.color}, 0.32)`;
      ctx.lineWidth = 1.15;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(m.x + ux * 14, m.y + uy * 14, 4.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
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
  const committed = state.minds.filter(m => m.committed);
  const src = committed.length ? committed : state.minds;
  const meanV = src.length
    ? src.reduce((a, m) => a + m.V, 0) / src.length
    : 0;
  const vEl = el("t-v");
  if (vEl) vEl.textContent = (meanV >= 0 ? "+" : "") + meanV.toFixed(2);
  const chiEl = el("t-chi");
  if (chiEl) {
    let peak = 1;
    if (state.chi) {
      for (let i = 0; i < state.chi.length; i++) if (state.chi[i] > peak) peak = state.chi[i];
    }
    chiEl.textContent = peak.toFixed(2);
  }
  const wEl = el("t-width");
  if (wEl) wEl.textContent = state.gauge.width.toFixed(2);
  if (state.frame % 20 === 0) updateMorphospace();
}
function setVerseText(text, instant) {
  const v = document.getElementById("verse");
  if (!v) return;
  clearTimeout(setVerseText._t);
  if (instant) {
    v.style.transition = "none";
    v.style.opacity = 1;
    v.textContent = text;
    requestAnimationFrame(() => { v.style.transition = ""; });
    return;
  }
  v.style.opacity = 0;
  setVerseText._t = setTimeout(() => {
    v.textContent = text;
    v.style.opacity = 1;
  }, 800);
}

// ─── Loop ────────────────────────────────────────────────────────────────────
function frame() {
  const t0 = performance.now();
  try {
    if (!state.paused) step();
    render();
  } catch {
    noteBlowup("the field skipped a frame so it could keep walking");
  }
  const dt = performance.now() - t0;
  state.perf.lastMs = dt;
  if (dt > BUDGET.frameMs) state.perf.streak++;
  else state.perf.streak = Math.max(0, state.perf.streak - 1);
  const wasHeavy = state.perf.skipHeavy;
  state.perf.skipHeavy = state.perf.streak >= 2;
    const scaledRecently = state.perf.scaledAt && (performance.now() - state.perf.scaledAt) < 6400;
    if (state.frame > 45 && !scaledRecently && (dt > BUDGET.heavyMs || (state.perf.skipHeavy && !wasHeavy))) {
    noteBlowup("this screen is working hard — some glows were dimmed");
  }
  if (state.frame % 6 === 0) tick();
  if (state.frame - lastSaveFrame > SAVE_EVERY_FRAMES) {
    lastSaveFrame = state.frame;
    saveField();
  }
  requestAnimationFrame(frame);
}

// ─── Input ───────────────────────────────────────────────────────────────────
function togglePause() {
  state.paused = !state.paused;
  const btn = document.getElementById("btn-pause");
  if (btn) btn.classList.toggle("active", state.paused);
}
function doReseed() { seed(); }
function toggleMute() {
  const next = !audio.isMuted();
  audio.setMuted(next);
  const btn = document.getElementById("btn-mute");
  if (btn) btn.classList.toggle("active", next);
  try { localStorage.setItem("la:muted", next ? "1" : "0"); } catch {}
}
function toggleTemporalGap() {
  state.temporalGapMode = state.temporalGapMode === "chord" ? "arpeggio" : "chord";
  const btn = document.getElementById("btn-gap");
  if (btn) {
    btn.classList.toggle("active", state.temporalGapMode === "arpeggio");
    btn.title = state.temporalGapMode === "arpeggio"
      ? "Arpeggio: commits smear across ticks (A)"
      : "Chord: commits fire together (A)";
  }
}
function setIngressMorph(key) {
  state.ingressMorph = state.ingressMorph === key ? null : key;
  document.querySelectorAll(".morph-chip").forEach(b => {
    b.classList.toggle("on", b.dataset.morph === state.ingressMorph);
  });
}
function renderMorphospace() {
  const row = document.getElementById("morph-row");
  if (!row) return;
  row.innerHTML = MORPHS.map(m =>
    `<button type="button" class="morph-chip" data-morph="${m.key}" aria-pressed="false">${m.key}</button>`
  ).join("");
  row.querySelectorAll(".morph-chip").forEach(b => {
    b.addEventListener("click", () => {
      setIngressMorph(b.dataset.morph);
      b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false");
    });
  });
  updateMorphospace();
}

function updateMorphospace() {
  const inhab = currentInhabitants();
  state.inhabited = inhab;
  document.querySelectorAll(".morph-chip").forEach(b => {
    b.classList.toggle("in", inhab.includes(b.dataset.morph));
    b.classList.toggle("on", b.dataset.morph === state.ingressMorph);
  });
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " ") { togglePause(); e.preventDefault(); }
  else if (k === "r") { doReseed(); }
  else if (k === "v") { state.showVoronoi = !state.showVoronoi; }
  else if (k === "f") { state.showField = !state.showField; }
  else if (k === "g") { state.showGhost = !state.showGhost; }
  else if (k === "a") { toggleTemporalGap(); }
});

// Expose tap handlers for the on-screen buttons.
window.__la = Object.assign(window.__la || {}, {
  togglePause,
  reseed: doReseed,
  toggleMute,
  toggleTemporalGap,
  vStats() {
    const vs = state.minds.map(m => m.V);
    if (!vs.length) return { n: 0, mean: 0, min: 0, max: 0 };
    let min = vs[0], max = vs[0], sum = 0;
    for (const v of vs) { if (v < min) min = v; if (v > max) max = v; sum += v; }
    return { n: vs.length, mean: sum / vs.length, min, max };
  },
  chiStats() {
    let peak = 1, n = state.chiSources.length;
    if (state.chi) {
      for (let i = 0; i < state.chi.length; i++) if (state.chi[i] > peak) peak = state.chi[i];
    }
    return { sources: n, peak, w: state.chiW, h: state.chiH };
  },
  emitChi,
  rememberAnimal,
  pulseCurrentLocus() {
    return pulseLocus(state.narration.history[0]);
  },
  pulseLocus,
  clientToSim,
  noteBlowup,
  budget: BUDGET,
  size() {
    return { W, H, viewW, viewH, dpr, pixels: W * H * dpr * dpr, lastMs: state.perf.lastMs, skipHeavy: state.perf.skipHeavy };
  },
  pickCommitted() {
    const m = state.minds.find(mm => mm.committed && mm.animalId >= 0);
    if (!m) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: m.x, y: m.y,
      clientX: rect.left + m.x * (rect.width / W),
      clientY: rect.top + m.y * (rect.height / H),
      color: m.animalColor,
    };
  },
  wound() {
    const m = state.minds.find(mm => mm.committed && mm.animalId >= 0);
    if (!m) return false;
    rememberAnimal(m);
    m.committed = false;
    m.dying = 48;
    emitChi(m.x, m.y, 1.05, 80);
    state.regenUrgent = 240;
    return { x: m.x, y: m.y, color: m.animalColor };
  },
  missingGhosts() {
    let n = 0;
    const by = new Map();
    for (let i = 0; i < state.minds.length; i++) {
      const m = state.minds[i];
      if (m.animalId < 0 || !m.committed) continue;
      if (!by.has(m.animalId)) by.set(m.animalId, { color: m.animalColor, members: [] });
      by.get(m.animalId).members.push(i);
    }
    for (const { color, members } of by.values()) {
      const memory = state.morphByColor.get(color);
      if (memory) n += missingOffsets(members, state.minds, memory).length;
    }
    return n;
  },
  infect(i) {
    const m = state.minds[i];
    if (!m) return false;
    m.cancer = true;
    m.cancerAge = 0;
    m.committed = false;
    return true;
  },
});

// Audio needs a user gesture to start on most browsers; wire it to the first
// pointer or key event and read any previously-saved mute preference.
try {
  const saved = localStorage.getItem("la:muted");
  if (saved === "1") audio.setMuted(true);
} catch {}
function armAudio() {
  audio.init();
  audio.resume();
  const b = document.getElementById("btn-mute");
  if (b) b.classList.toggle("active", audio.isMuted());
  window.removeEventListener("pointerdown", armAudio, true);
  window.removeEventListener("keydown", armAudio, true);
  window.removeEventListener("touchstart", armAudio, true);
}
window.addEventListener("pointerdown", armAudio, true);
window.addEventListener("keydown", armAudio, true);
window.addEventListener("touchstart", armAudio, true);

// Paint interaction: click drops three minds; drag paints a trail of them
// (respectful of gauge spacing so they don't pile up).
const paint = { active: false, lastX: 0, lastY: 0, minSpacing: 22, startX: 0, startY: 0, moved: false, lastStir: 0, holdTimer: 0, deleted: false, pendingDrop: false, holdIdx: -1 };
function stirAt(x, y, speed) {
  audio.resume();
  audio.playStir({
    xNorm: W ? x / W : 0.5,
    speedNorm: clamp(speed / 36, 0.15, 1),
  });
}
function dropMindsAt(x, y, count = 3, jitter = 0.8) {
  const s = state.gauge.s;
  for (let i = 0; i < count; i++) {
    const jx = (Math.random() - 0.5) * s * jitter;
    const jy = (Math.random() - 0.5) * s * jitter;
    state.minds.push(new Mind(x + jx, y + jy));
  }
  state.jitter = Math.max(state.jitter, 0.9);
  emitChi(x, y, 0.55, 56);
}
function isCoarsePointer() {
  return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
canvas.addEventListener("pointerdown", (e) => {
  const { x, y } = clientToSim(e.clientX, e.clientY);
  paint.active = true;
  paint.moved = false;
  paint.spoken = false;
  paint.deleted = false;
  paint.pendingDrop = false;
  paint.holdIdx = -1;
  paint.lastX = x; paint.lastY = y;
  paint.startX = x; paint.startY = y;
  audio.resume();
  audio.playTouch(W ? x / W : 0.5);
  hideMindTooltip();
  clearTimeout(paint.holdTimer);
  const near = findMindNear(x, y, isCoarsePointer() ? 28 : 20);
  if (near >= 0 && state.minds[near].committed) {
    paint.pendingDrop = true;
    paint.holdIdx = near;
    paint.holdTimer = setTimeout(() => {
      if (!paint.active || paint.moved || paint.holdIdx < 0) return;
      const m = state.minds[paint.holdIdx];
      if (!m || !m.committed) return;
      rememberAnimal(m);
      m.committed = false;
      m.dying = LIFE.dyingFrames;
      emitChi(m.x, m.y, 1.05, 80);
      state.regenUrgent = 240;
      paint.deleted = true;
      narrateLife({
        short: "a cell was taken. the body remembers",
        long: "The remaining minds still hold the shape. They will try to sit someone in the missing square before they accept a new form.",
        kind: "life",
        x: m.x, y: m.y,
      });
    }, CFG.holdMs);
  } else {
    dropMindsAt(x, y, 3, 0.8);
  }
  try { canvas.setPointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener("pointermove", (e) => {
  const { x, y } = clientToSim(e.clientX, e.clientY);
  state.mouse.x = x;
  state.mouse.y = y;
  state.mouse.inside = true;
  if (paint.active) {
    const dx = x - paint.lastX, dy = y - paint.lastY;
    const d = Math.hypot(dx, dy);
    if (Math.hypot(x - paint.startX, y - paint.startY) > 10) paint.moved = true;
    if (d > 2) stirAt(x, y, d);
    if (d >= paint.minSpacing) {
      const steps = Math.floor(d / paint.minSpacing);
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        dropMindsAt(paint.lastX + dx * t, paint.lastY + dy * t, 1, 0.3);
      }
      paint.lastX = x; paint.lastY = y;
      if (!paint.spoken) {
        paint.spoken = true;
        narrateLife({
          short: "you drew a trail of minds",
          long: "They only know they were placed. The rest is the same work as everyone else: see neighbors, propose a gauge, try to stay.",
          kind: "life",
          x, y,
        });
      }
    }
  } else if (!isCoarsePointer()) {
    updateMindTooltip(e.clientX, e.clientY, x, y);
  }
});
canvas.addEventListener("pointerup", (e) => {
  const { x, y } = clientToSim(e.clientX, e.clientY);
  clearTimeout(paint.holdTimer);
  if (paint.pendingDrop && !paint.deleted && !paint.moved) {
    dropMindsAt(paint.startX, paint.startY, 3, 0.8);
  }
  if (!paint.moved && !paint.deleted) {
    updateMindTooltip(e.clientX, e.clientY, x, y);
    if (isCoarsePointer()) {
      clearTimeout(_tooltip.hideTimer);
      _tooltip.hideTimer = setTimeout(hideMindTooltip, 3200);
    }
  }
  paint.active = false;
  paint.pendingDrop = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener("pointercancel", () => { paint.active = false; });
canvas.addEventListener("pointerleave", () => {
  state.mouse.inside = false;
  if (!isCoarsePointer()) hideMindTooltip();
});

// ─── Mind tooltip ────────────────────────────────────────────────────────────
const _tooltip = { el: null, currentIdx: -1, hideTimer: 0 };
function findMindNear(cx, cy, r = 20) {
  const minds = state.minds;
  let best = -1, bestD2 = r * r;
  for (let i = 0; i < minds.length; i++) {
    const m = minds[i];
    const dx = m.x - cx, dy = m.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = i; }
  }
  return best;
}
function describeMind(m) {
  const speciesKey = audio.speciesForColor(m.animalColor || m.lastAnimalColor);
  const species = speciesKey ? speciesKey.charAt(0).toUpperCase() + speciesKey.slice(1) : "unnamed";
  let state1, state2;
  if (m.animalId >= 0) {
    state1 = `<em>animal cell</em>`;
    state2 = `Part of a lattice animal — 4-adjacent to at least one other committed mind on the shared grid.`;
  } else if (m.committed) {
    state1 = `<em>committed</em>`;
    state2 = `Locked to its cell on the shared gauge, but not yet bonded 4-adjacent to another committed mind — a single cell, not yet an animal.`;
  } else if (m.settle > 0) {
    state1 = `<em>bound</em>`;
    state2 = `Sees its neighbors and is drifting toward its candidate lattice cell. About ${Math.round(100 * m.settle / CFG.commitFrames)}% of the way to committing.`;
  } else {
    state1 = `<em>searching</em>`;
    state2 = `Still hunting for its spot. Its neighbor mean is pulling one way; the gauge target another. It'll settle when the two align.`;
  }
  const vStr = (m.V >= 0 ? "+" : "") + m.V.toFixed(2);
  const speciesLine = speciesKey
    ? `<div class="tooltip-species">${species} · V ${vStr}</div>`
    : `<div class="tooltip-species">quiet species · V ${vStr}</div>`;
  return `${speciesLine}<div class="tooltip-body">${state1} — ${state2}</div>`;
}
function updateMindTooltip(clientX, clientY, canvasX, canvasY) {
  if (!_tooltip.el) _tooltip.el = document.getElementById("mind-tooltip");
  if (!_tooltip.el) return;
  const idx = findMindNear(canvasX, canvasY, 22);
  if (idx < 0) {
    hideMindTooltip();
    return;
  }
  const m = state.minds[idx];
  if (idx !== _tooltip.currentIdx) {
    _tooltip.currentIdx = idx;
    _tooltip.el.innerHTML = describeMind(m);
  }
  // Position: offset from cursor, keep within viewport
  const off = 14;
  const w = 260, h = 90;
  let px = clientX + off, py = clientY + off;
  if (px + w > window.innerWidth - 8) px = clientX - off - w;
  if (py + h > window.innerHeight - 8) py = clientY - off - h;
  _tooltip.el.style.left = Math.max(8, px) + "px";
  _tooltip.el.style.top = Math.max(8, py) + "px";
  _tooltip.el.hidden = false;
  requestAnimationFrame(() => _tooltip.el.classList.add("on"));
  clearTimeout(_tooltip.hideTimer);
}
function hideMindTooltip() {
  if (!_tooltip.el) _tooltip.el = document.getElementById("mind-tooltip");
  if (!_tooltip.el) return;
  _tooltip.currentIdx = -1;
  _tooltip.el.classList.remove("on");
  clearTimeout(_tooltip.hideTimer);
  _tooltip.hideTimer = setTimeout(() => { _tooltip.el.hidden = true; }, 200);
}

// ─── Persistence ─────────────────────────────────────────────────────────────
// Save the field to localStorage every few seconds so the ecology survives
// tab close, refresh, minimize-then-hours-later, or a Railway redeploy.
const SAVE_KEY = "la:field:v3";
const SAVE_EVERY_FRAMES = 300;   // ~5 seconds at 60fps
let lastSaveFrame = 0;

function serializeField() {
  const minds = state.minds.map(m => ({
    x: +m.x.toFixed(2), y: +m.y.toFixed(2),
    vx: +m.vx.toFixed(3), vy: +m.vy.toFixed(3),
    gx: m.gx, gy: m.gy, settle: m.settle,
    committed: m.committed ? 1 : 0,
    aid: m.animalId, ac: m.animalColor || null, lac: m.lastAnimalColor || null,
    ti: m.tintIdx, ph: +m.phase.toFixed(2), os: +m.orgSeed.toFixed(3), ci: m.cilia,
    ba: m.bornAt || 0, sa: m.spawnedAt || 0, cf: m.commitFlash | 0, cc: m.commitChord || 1,
    a: !!m._assigned,
    V: +m.V.toFixed(3), rV: +m.restingV.toFixed(3),
    val: m.valence ? Array.from(m.valence, x => +x.toFixed(3)) : null,
    vs: m.vStable | 0, ca: !!m.cancer,
  }));
  return {
    v: 3,
    ts: Date.now(),
    gauge: { cx: state.gauge.cx, cy: state.gauge.cy, theta: state.gauge.theta, s: state.gauge.s, width: state.gauge.width },
    jitter: state.jitter, frame: state.frame,
    W, H,
    minds,
    animalKeys: [...state.animalKeys.entries()],
    morphByColor: [...state.morphByColor.entries()],
    temporalGapMode: state.temporalGapMode,
    narration: {
      history: state.narration.history.slice(0, 30),
      flags: state.narration.flags,
      lastNarratedFrame: state.narration.lastNarratedFrame,
    },
  };
}

function saveField() {
  try {
    const data = serializeField();
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* quota or private mode — silently drop */ }
}

function tryRestoreField() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || (data.v !== 2 && data.v !== 3)) return false;
    // Refuse a save older than 3 days — the ecology is fresh, not archaeological
    if (Date.now() - (data.ts || 0) > 3 * 24 * 3600 * 1000) return false;
    // Rehydrate
    const sx = W / (data.W || W);
    const sy = H / (data.H || H);
    state.minds.length = 0;
    for (const s of data.minds) {
      const m = new Mind(s.x * sx, s.y * sy);
      m.vx = s.vx; m.vy = s.vy;
      m.gx = s.gx; m.gy = s.gy;
      m.settle = s.settle;
      m.committed = !!s.committed;
      m.animalId = s.aid;
      m.animalColor = s.ac || undefined;
      m.lastAnimalColor = s.lac || undefined;
      m.tintIdx = s.ti;
      m.phase = s.ph;
      m.orgSeed = s.os;
      m.cilia = s.ci;
      m.bornAt = s.ba;
      m.spawnedAt = s.sa;
      m.commitFlash = s.cf;
      m.commitChord = s.cc;
      m._assigned = s.a;
      m.V = typeof s.V === "number" ? clamp(s.V, -1, 1) : m.V;
      m.restingV = typeof s.rV === "number" ? clamp(s.rV, -1, 1) : m.restingV;
      if (Array.isArray(s.val) && s.val.length === 7) m.valence = Float32Array.from(s.val);
      m.vStable = s.vs || 0;
      m.cancer = !!s.ca;
      if (m.animalColor || m.lastAnimalColor) syncRestingV(m);
      state.minds.push(m);
    }
    state.gauge.cx = data.gauge.cx * sx;
    state.gauge.cy = data.gauge.cy * sy;
    state.gauge.theta = data.gauge.theta;
    state.gauge.s = data.gauge.s;
    state.gauge.width = typeof data.gauge.width === "number" ? data.gauge.width : 0.28;
    state.jitter = data.jitter || CFG.jitterFloor;
    state.frame = data.frame || 0;
    state.animalKeys = new Map((data.animalKeys || []).map(([k, v]) => [k, coerceAnimalRecord(v)]));
    state.morphByColor = new Map(data.morphByColor || []);
    if (data.temporalGapMode === "arpeggio" || data.temporalGapMode === "chord") {
      state.temporalGapMode = data.temporalGapMode;
    }
    if (data.narration) {
      state.narration.history = data.narration.history || [];
      state.narration.flags = data.narration.flags || {};
      state.narration.lastNarratedFrame = data.narration.lastNarratedFrame || -1000;
      for (const e of state.narration.history) {
        if (Number.isFinite(e.x)) e.x *= sx;
        if (Number.isFinite(e.y)) e.y *= sy;
      }
      renderDrawerLog();
      if (state.narration.history[0]) {
        setVerseText(state.narration.history[0].short);
        pulseLocus(state.narration.history[0]);
      }
    }
    return true;
  } catch (e) { return false; }
}

// ─── Boot ────────────────────────────────────────────────────────────────────
resize();
if (!tryRestoreField()) seed();
renderMorphospace();
{
  const gap = document.getElementById("btn-gap");
  if (gap) gap.classList.toggle("active", state.temporalGapMode === "arpeggio");
}
requestAnimationFrame(frame);



// Some Chrome UI (debug bars, download bars) shifts viewport without firing
// resize. Poll size and re-fit if it changed.
setInterval(() => {
  if (window.innerWidth !== viewW || window.innerHeight !== viewH) resize();
}, 400);
window.addEventListener("load", resize);
window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    saveField();   // one last snapshot before the tab goes dormant
  } else {
    resize();
    render();      // draw once immediately so the tab isn't blank while rAF ramps back up
  }
});
window.addEventListener("beforeunload", () => saveField());
// Also add a reset shortcut so R clears storage too — R already reseeds; make it clear the save
const _origSeed = seed;
seed = function () {
  _origSeed();
  try { localStorage.removeItem(SAVE_KEY); } catch {}
};
