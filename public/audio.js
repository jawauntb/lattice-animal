// Procedural species voices — each lattice animal has a color, and every color
// gets a species with a distinct synth voice. Sounds are generated live with
// Web Audio, so no audio files ship with the site.

let ctx = null;
let master = null;
let compressor = null;
let muted = false;
const lastPlayTs = new Map();

// The 10 species + their colors (matched to ANIMAL_HUES rgb strings in main.js).
// restingV is the Levin membrane-voltage band: negative = hyperpolarized
// (anchors, synchrony), positive = depolarized (encroaches, fissions).
const SPECIES = [
  { key: "lion",     rgb: "255, 168, 132", restingV:  0.70 },
  { key: "parakeet", rgb: "132, 220, 236", restingV:  0.50 },
  { key: "wolf",     rgb: "168, 156, 240", restingV: -0.20 },
  { key: "elephant", rgb: "132, 176, 255", restingV: -0.55 },
  { key: "whale",    rgb: "218, 140, 240", restingV: -0.70 },
  { key: "frog",     rgb: "170, 232, 148", restingV:  0.10 },
  { key: "owl",      rgb: "132, 236, 200", restingV: -0.40 },
  { key: "dolphin",  rgb: "255, 209, 92",  restingV:  0.20 },
  { key: "cricket",  rgb: "232, 220, 128", restingV:  0.35 },
  { key: "sparrow",  rgb: "220, 172, 244", restingV: -0.05 },
];

export function speciesList() { return SPECIES; }

export function speciesForColor(rgb) {
  const s = SPECIES.find(s => s.rgb === rgb);
  return s ? s.key : null;
}

export function restingVForColor(rgb) {
  if (!rgb) return 0;
  const s = SPECIES.find(s => s.rgb === rgb);
  return s ? s.restingV : 0;
}

export function init() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.20;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.12;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  } catch (e) { console.warn("audio unavailable", e); }
}

export function resume() {
  if (ctx && ctx.state === "suspended") ctx.resume();
}

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }

// Stir / touch: a dragged finger stirs the medium. x chooses a minor
// pentatonic rung; speed opens amplitude. Grains glide off the last
// pitch so one stroke reads as glass on water, not separate notes.
let lastStirFreq = 0;
let lastStirAt = 0;
const STIR_ROOT = 440;
const STIR_SEMIS = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];

function stirIndex(xNorm) {
  return Math.round(clamp01(xNorm) * (STIR_SEMIS.length - 1));
}
function stirFreq(xNorm) {
  return STIR_ROOT * Math.pow(2, STIR_SEMIS[stirIndex(xNorm)] / 12);
}

export function playStir({ xNorm = 0.5, speedNorm = 0.4 } = {}) {
  if (!ctx || muted) return;
  const now = performance.now();
  if (now - (lastPlayTs.get("stir") || 0) < 90) return;
  lastPlayTs.set("stir", now);

  const v = clamp01(speedNorm);
  const sc = 0.18 + 0.17 * v;
  const f = stirFreq(xNorm);
  const t = ctx.currentTime;
  const legato = lastStirFreq > 0 && now - lastStirAt < 420;
  lastStirAt = now;

  const o = osc("sine", legato ? lastStirFreq : f * 0.94);
  o.frequency.exponentialRampToValueAtTime(f, t + (legato ? 0.05 : 0.035));
  const g = gain(0);
  o.connect(g);
  g.gain.linearRampToValueAtTime(0.5 * sc, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
  o.start(t); o.stop(t + 0.4);

  const lfo = osc("sine", 5.6);
  const lg = ctx.createGain(); lg.gain.value = f * 0.0035;
  lfo.connect(lg); lg.connect(o.frequency);
  lfo.start(t); lfo.stop(t + 0.34);

  const oh = osc("sine", f * 2);
  const gh = gain(0);
  oh.connect(gh);
  gh.gain.linearRampToValueAtTime(0.16 * sc, t + 0.02);
  gh.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  oh.start(t); oh.stop(t + 0.26);

  const og = osc("sine", f * 2.76);
  const gg = gain(0);
  og.connect(gg);
  gg.gain.linearRampToValueAtTime(0.10 * sc * (0.2 + 0.8 * v), t + 0.006);
  gg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  og.start(t); og.stop(t + 0.16);

  lastStirFreq = f;
}

export function playTouch(xNorm = 0.5) {
  if (!ctx || muted) return;
  const now = performance.now();
  if (now - (lastPlayTs.get("touch") || 0) < 90) return;
  lastPlayTs.set("touch", now);

  const base = stirIndex(xNorm);
  const t = ctx.currentTime;
  const sc = 0.28;
  const rungs = [-2, 0, 2];
  for (let i = 0; i < rungs.length; i++) {
    const idx = Math.min(STIR_SEMIS.length - 1, Math.max(0, base + rungs[i]));
    const f = STIR_ROOT * Math.pow(2, STIR_SEMIS[idx] / 12);
    const s = t + i * 0.045;
    const o = osc("sine", f * 0.62);
    o.frequency.setValueAtTime(f * 0.62, s);
    o.frequency.exponentialRampToValueAtTime(f, s + 0.03);
    const g = gain(0);
    o.connect(g);
    g.gain.linearRampToValueAtTime(0.34 * sc, s + 0.014);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.17);
    o.start(s); o.stop(s + 0.2);
  }
}

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

export function play(speciesKey, event = "commit") {
  if (!ctx || muted || !speciesKey) return;
  const now = performance.now();
  const last = lastPlayTs.get(speciesKey) || 0;
  const gate = event === "birth" ? 90 : event === "growth" ? 500 : 250;
  if (now - last < gate) return;
  lastPlayTs.set(speciesKey, now);
  const sc = {
    birth: 0.55, commit: 0.75, growth: 1.05, merger: 1.15, fission: 0.85, death: 0.6,
  }[event] || 0.75;

  const voices = {
    lion, parakeet, wolf, elephant, whale, frog, owl, dolphin, cricket, sparrow,
  };
  const v = voices[speciesKey];
  if (v) v(sc);
}

// ─── voice helpers ───────────────────────────────────────────────────────────
function osc(type, f) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
function gain(v = 0) { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; }
function lpf(f, q = 1) { const b = ctx.createBiquadFilter(); b.type = "lowpass"; b.frequency.value = f; b.Q.value = q; return b; }
function bpf(f, q = 1) { const b = ctx.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = f; b.Q.value = q; return b; }

// ─── voices ──────────────────────────────────────────────────────────────────
function lion(sc) {
  const t = ctx.currentTime, dur = 0.7 * sc;
  const o = osc("sawtooth", 90);
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(60, t + dur);
  const filter = lpf(600, 5);
  const g = gain(0);
  o.connect(filter); filter.connect(g);
  g.gain.linearRampToValueAtTime(0.55 * sc, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
  // growl AM
  const lfo = osc("sine", 22);
  const lg = ctx.createGain(); lg.gain.value = 0.28;
  lfo.connect(lg); lg.connect(g.gain);
  lfo.start(t); lfo.stop(t + dur);
}

function parakeet(sc) {
  const t = ctx.currentTime, notes = 5;
  for (let i = 0; i < notes; i++) {
    const s = t + i * 0.078 * sc;
    const f = 950 + (i % 2 ? 320 : 0);
    const o = osc("triangle", f);
    const g = gain(0);
    o.connect(g);
    g.gain.linearRampToValueAtTime(0.42 * sc, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.055);
    o.start(s); o.stop(s + 0.075);
  }
}

function wolf(sc) {
  const t = ctx.currentTime, dur = 1.1 * sc;
  const o = osc("sine", 500);
  o.frequency.setValueAtTime(500, t);
  o.frequency.exponentialRampToValueAtTime(220, t + dur * 0.72);
  o.frequency.exponentialRampToValueAtTime(190, t + dur);
  const filter = lpf(1400, 2);
  const g = gain(0);
  o.connect(filter); filter.connect(g);
  g.gain.linearRampToValueAtTime(0.5 * sc, t + 0.18);
  g.gain.linearRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
  // harmonic
  const oh = osc("sine", 1000);
  oh.frequency.setValueAtTime(1000, t);
  oh.frequency.exponentialRampToValueAtTime(440, t + dur * 0.72);
  const gh = gain(0);
  oh.connect(gh);
  gh.gain.linearRampToValueAtTime(0.08 * sc, t + 0.22);
  gh.gain.linearRampToValueAtTime(0.001, t + dur);
  oh.start(t); oh.stop(t + dur);
}

function elephant(sc) {
  const t = ctx.currentTime, dur = 0.62 * sc;
  const o = osc("sawtooth", 60);
  o.frequency.setValueAtTime(55, t);
  o.frequency.exponentialRampToValueAtTime(180, t + dur * 0.4);
  o.frequency.exponentialRampToValueAtTime(85, t + dur);
  const filter = bpf(280, 3.5);
  const g = gain(0);
  o.connect(filter); filter.connect(g);
  g.gain.linearRampToValueAtTime(0.6 * sc, t + 0.05);
  g.gain.linearRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
}

function whale(sc) {
  const t = ctx.currentTime, dur = 1.6 * sc;
  const o = osc("sine", 180);
  o.frequency.setValueAtTime(190, t);
  o.frequency.linearRampToValueAtTime(140, t + dur);
  const lfo = osc("sine", 3.2);
  const lg = ctx.createGain(); lg.gain.value = 26;
  lfo.connect(lg); lg.connect(o.frequency);
  const g = gain(0);
  o.connect(g);
  g.gain.linearRampToValueAtTime(0.4 * sc, t + 0.35);
  g.gain.linearRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
  lfo.start(t); lfo.stop(t + dur);
}

function frog(sc) {
  const t = ctx.currentTime;
  const beats = 2 + (Math.random() > 0.55 ? 1 : 0);
  for (let i = 0; i < beats; i++) {
    const s = t + i * 0.12 * sc;
    const o = osc("square", 220);
    o.frequency.setValueAtTime(230, s);
    o.frequency.exponentialRampToValueAtTime(140, s + 0.09);
    const filter = lpf(700, 3);
    const g = gain(0);
    o.connect(filter); filter.connect(g);
    g.gain.linearRampToValueAtTime(0.36 * sc, s + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
    o.start(s); o.stop(s + 0.12);
  }
}

function owl(sc) {
  const t = ctx.currentTime;
  const hoots = [ [t, 300, 0.34], [t + 0.29 * sc, 258, 0.48] ];
  for (const [ts, freq, dur] of hoots) {
    const o = osc("sine", freq);
    const g = gain(0);
    o.connect(g);
    g.gain.linearRampToValueAtTime(0.42 * sc, ts + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ts + dur);
    o.start(ts); o.stop(ts + dur + 0.05);
  }
}

function dolphin(sc) {
  const t = ctx.currentTime, dur = 0.32 * sc;
  const o = osc("sine", 3200);
  o.frequency.setValueAtTime(3200, t);
  o.frequency.exponentialRampToValueAtTime(1200, t + dur);
  const g = gain(0);
  o.connect(g);
  g.gain.linearRampToValueAtTime(0.32 * sc, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur);
}

function cricket(sc) {
  const t = ctx.currentTime;
  const beats = 4;
  for (let i = 0; i < beats; i++) {
    const s = t + i * 0.06 * sc;
    const o = osc("square", 5000);
    const filter = bpf(5000, 12);
    const g = gain(0);
    o.connect(filter); filter.connect(g);
    g.gain.linearRampToValueAtTime(0.25 * sc, s + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.028);
    o.start(s); o.stop(s + 0.04);
  }
}

function sparrow(sc) {
  const t = ctx.currentTime;
  const notes = [1000, 1400, 1200];
  for (let i = 0; i < notes.length; i++) {
    const s = t + i * 0.09 * sc;
    const o = osc("triangle", notes[i]);
    const g = gain(0);
    o.connect(g);
    g.gain.linearRampToValueAtTime(0.32 * sc, s + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.085);
    o.start(s); o.stop(s + 0.1);
  }
}
