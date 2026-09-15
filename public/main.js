import { Delaunay } from "d3-delaunay";

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
  animalKeys: new Map(),    // signature → cached animalId so a rebounding animal keeps its color
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
  state.animalCount = 0;
  state.largestAnimal = 0;
  state.prevAnimalCount = 0;
  state.prevCommittedCount = 0;
  state.prevLargest = 0;
  state.animalColors.clear();
  state.animalKeys.clear();
  state.narration.history.length = 0;
  state.narration.flags = {};
  state.narration.lastNarratedFrame = -1000;
  renderDrawerLog();
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

// ─── Narrator ────────────────────────────────────────────────────────────────
function narrate({ short, long, kind = "note" }) {
  // Debounce: at least 20 frames between narrations so the reader can catch each.
  if (state.frame - state.narration.lastNarratedFrame < 20) return;
  state.narration.lastNarratedFrame = state.frame;
  state.narration.current = short;
  setVerseText(short);
  state.narration.history.unshift({
    frame: state.frame, short, long, kind,
    ts: Date.now(),
  });
  if (state.narration.history.length > 60) state.narration.history.length = 60;
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
    <div class="log-entry ${i === 0 ? "fresh " : ""}${e.kind}">
      <div class="log-short">${escapeHtml(e.short)}</div>
      <div class="log-long">${escapeHtml(e.long)}</div>
      <div class="log-time">${fmtTime(e.frame)}</div>
    </div>
  `).join("");
  el.innerHTML = html;
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
    narrate({
      short: "the field has come alive",
      long: "The negotiation is over. From here nothing is scripted — the animals wander, birth new minds at their edges, occasionally split when they've grown too large, and re-merge when they drift into each other. The invariant is that every configuration is still a real lattice animal.",
      kind: "note",
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
  if (spawnRoll < LIFE.spawnPerFrame / 60 && minds.length < LIFE.maxMinds) {
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
  const p = parents[Math.floor(Math.random() * parents.length)];
  const spot = pickAdjacent(p, occ);
  if (!spot) return false;
  const t = gaugeToWorld(spot.gx, spot.gy);
  const child = new Mind(t.x + (Math.random() - 0.5) * 6, t.y + (Math.random() - 0.5) * 6);
  child.gx = spot.gx; child.gy = spot.gy;
  child._assigned = true;
  child.tintIdx = p.tintIdx;
  child.animalColor = p.animalColor;
  child.lastAnimalColor = p.animalColor;
  child.spawnedAt = state.frame;
  state.minds.push(child);
  // Small brief nudge in temperature so the newborn shimmers
  state.jitter = Math.max(state.jitter, 0.25);
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
  return true;
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
    narrate({
      short: "the field is being born",
      long: "A hundred minds have just materialized. None of them can talk to each other. All they can do is move — and all they can see is where their nearest neighbors are. Watch the arrows: those are the directions they want to go.",
      kind: "note",
    });
  }

  // Alignment visible — jitter has cooled enough that motion has direction
  if (!n.flags.alignment && state.frame > 90 && state.jitter < CFG.jitterInit * 0.5) {
    n.flags.alignment = true;
    narrate({
      short: "a shared 'up' is emerging",
      long: "The random shaking is dying down. From nothing but neighbor positions, the field is agreeing on a spacing and an orientation — a shared grid nobody drew. That's the gauge being negotiated.",
      kind: "note",
    });
  }

  // First commit — one mind stopped moving
  if (!n.flags.first_commit && committed >= 1) {
    n.flags.first_commit = true;
    narrate({
      short: "the first mind found its spot",
      long: "One mind has stopped drifting. It's locked to a cell of the shared grid — the first vote for what the answer is. From here the others will start finding their own cells around it.",
      kind: "note",
    });
  }

  // Chord events — three or more simultaneous commits near each other
  if (freshCommits && freshCommits.length >= 3) {
    narrate({
      short: `a chord: ${freshCommits.length} minds committed together`,
      long: `${freshCommits.length} minds locked in at the same instant. Nobody coordinated the timing — they were just all ready together. In the theory this matters: consciousness papers argue a bound moment requires true co-instantiation, not staggered pieces. You just watched one.`,
      kind: "chord",
    });
  } else if (freshCommits && freshCommits.length === 2) {
    narrate({
      short: "two minds committed at the same instant",
      long: "A chord, if you're keeping count — two commitments in the same tick. Not many at once yet, but the pace is picking up.",
      kind: "chord",
    });
  }

  // First animal — a lattice animal has formed
  if (!n.flags.first_animal && state.animalCount >= 1) {
    n.flags.first_animal = true;
    narrate({
      short: "a lattice animal is born",
      long: "Two committed minds are now sitting on 4-adjacent cells of the shared grid. Together they count as an animal — the smallest possible body. Watch the warm filament that just appeared between them: that's the bond.",
      kind: "animal",
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
      narrate({ short, long, kind: "note" });
    }
  }

  // Largest animal grows past thresholds
  const largeThresholds = [5, 10, 20, 40];
  for (const t of largeThresholds) {
    const flag = `large_${t}`;
    if (!n.flags[flag] && state.largestAnimal >= t) {
      n.flags[flag] = true;
      narrate({
        short: `the biggest animal is now ${state.largestAnimal} cells wide`,
        long: `The largest connected polyomino has grown to ${state.largestAnimal} cells. Every cell in it was placed by a mind that only ever saw its neighbors — nobody planned the shape.`,
        kind: "animal",
      });
    }
  }

  // Merger — animal count dropped while committed count went up (or held).
  const prevA = state.prevAnimalCount, prevC = state.prevCommittedCount;
  if (state.frame > 60 && state.animalCount < prevA && committed >= prevC && state.animalCount > 0) {
    const merged = prevA - state.animalCount;
    if (merged >= 1) {
      narrate({
        short: merged === 1
          ? "two animals merged into one"
          : `${merged + 1} animals merged into fewer`,
        long: "A new commit sitting on an adjacent cell just bridged two separate animals — they're one body now. Watch the perimeter outline redraw itself around the union.",
        kind: "animal",
      });
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
    m.nMeanX = m.nMeanX * 0.85 + nx * 0.15;
    m.nMeanY = m.nMeanY * 0.85 + ny * 0.15;
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
        m.bornAt = state.frame;
        freshCommits.push(m);
      }
    } else if (d > CFG.releaseDist) {
      m.settle = Math.max(0, m.settle - 2);
      if (m.settle === 0) m.committed = false;
    }
    if (m.commitFlash > 0) m.commitFlash--;
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
    m.commitFlash = Math.round(45 * Math.min(2.5, 0.9 + 0.35 * kin));
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
      let color = state.animalKeys.get(sig);
      if (!color) {
        // Try to inherit from any member's previous animal color
        const prevColors = new Map();
        for (const idx of members) {
          const prev = minds[idx].lastAnimalColor;
          if (prev) prevColors.set(prev, (prevColors.get(prev) || 0) + 1);
        }
        let best = null, bestN = 0;
        for (const [c, n] of prevColors) if (n > bestN) { best = c; bestN = n; }
        color = best || ANIMAL_HUES[(state.animalKeys.size * 7 + members[0]) % ANIMAL_HUES.length];
        state.animalKeys.set(sig, color);
      }
      for (const idx of members) {
        minds[idx].animalId = animalCount;
        minds[idx].animalColor = color;
        minds[idx].lastAnimalColor = color;
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
  // The narrator now drives the verse line. If it hasn't spoken in a while
  // (nothing worth reporting), cycle through the ambient verses so the bar
  // never sits empty.
  const framesSinceNarration = state.frame - state.narration.lastNarratedFrame;
  if (framesSinceNarration > 60 * 10 && state.verseTimer > 60 * 8) {
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
        ctx.strokeStyle = `rgba(${color}, 0.9)`;
        ctx.shadowColor = `rgba(${color}, 0.85)`;
        ctx.shadowBlur = 10;
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

    // Birth flash — an expanding cream ring at the moment of committing. Chord
    // events (kin >= 2) fire brighter, wider, longer.
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
        const w = Math.exp(-(dAlt - dCur) / (gs * 0.35));
        if (w < 0.08) continue;
        const a = 0.12 * w * (1 - m.settle / CFG.commitFrames);
        if (a < 0.01) continue;
        ctx.fillStyle = `rgba(${CREAM}, ${a})`;
        ctx.beginPath();
        ctx.arc(alt.x, alt.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer soft glow
    const glowTint = isAnimal ? (m.animalColor || CREAM) : tint;
    ctx.shadowColor = `rgba(${glowTint}, ${0.9 * brightness})`;
    ctx.shadowBlur = isAnimal ? 18 : 10;
    ctx.fillStyle = `rgba(${glowTint}, ${0.9 * brightness})`;
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
function setVerseText(text) {
  const v = document.getElementById("verse");
  if (!v) return;
  v.style.opacity = 0;
  setTimeout(() => {
    v.textContent = text;
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
function togglePause() {
  state.paused = !state.paused;
  const btn = document.getElementById("btn-pause");
  if (btn) btn.classList.toggle("active", state.paused);
}
function doReseed() { seed(); }

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === " ") { togglePause(); e.preventDefault(); }
  else if (k === "r") { doReseed(); }
  else if (k === "v") { state.showVoronoi = !state.showVoronoi; }
  else if (k === "f") { state.showField = !state.showField; }
  else if (k === "g") { state.showGhost = !state.showGhost; }
});

// Expose tap handlers for the on-screen buttons.
window.__la = Object.assign(window.__la || {}, {
  togglePause,
  reseed: doReseed,
});

// Paint interaction: click drops three minds; drag paints a trail of them
// (respectful of gauge spacing so they don't pile up).
const paint = { active: false, lastX: 0, lastY: 0, minSpacing: 24 };
function dropMindsAt(x, y, count = 3, jitter = 0.8) {
  const s = state.gauge.s;
  for (let i = 0; i < count; i++) {
    const jx = (Math.random() - 0.5) * s * jitter;
    const jy = (Math.random() - 0.5) * s * jitter;
    state.minds.push(new Mind(x + jx, y + jy));
  }
  state.jitter = Math.max(state.jitter, 0.9);
}
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  paint.active = true;
  paint.lastX = x; paint.lastY = y;
  dropMindsAt(x, y, 3, 0.8);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  state.mouse.x = x;
  state.mouse.y = y;
  state.mouse.inside = true;
  if (paint.active) {
    const dx = x - paint.lastX, dy = y - paint.lastY;
    const d = Math.hypot(dx, dy);
    if (d >= paint.minSpacing) {
      const steps = Math.floor(d / paint.minSpacing);
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        dropMindsAt(paint.lastX + dx * t, paint.lastY + dy * t, 1, 0.3);
      }
      paint.lastX = x; paint.lastY = y;
    }
  }
});
canvas.addEventListener("pointerup", (e) => {
  paint.active = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener("pointercancel", () => { paint.active = false; });
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
