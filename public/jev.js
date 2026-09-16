// Jev (TypeSafe System One): field state in, typed decisions out.
// It cannot write a verse. It cannot place a cell off the gauge.
// Code keeps the lattice-animal invariant; Jev only biases existing moves.

export const QUESTIONS = {
  eat: {
    type: "noul",
    instructions: "Given `seams` and `animals`, should the larger more coherent animal write its voltage into the smaller one at the most constructive seam? Yes only if their waves are adding and both can remain one 4-adjacent body on the shared gauge.",
    criteria: {
      true: "Constructive overlap and a size/coherence edge: eat, cells stay on the grid",
      false: "Do not eat: the seam is weak, lineages should stay separate, or the body would tear",
    },
  },
  compete: {
    type: "noul",
    instructions: "Should a neck cell on the most destructive seam uncommit so two clocks stop tearing the same polyomino?",
    criteria: {
      true: "Waves cancel; release a 4-adjacent bridge cell",
      false: "Hold the neck; cancellation is not a cut yet",
    },
  },
  act: {
    type: "choice",
    instructions: "What should the living field do next? Every option stays on the negotiated gauge. No mind may leave the lattice.",
    criteria: {
      wander: "An edge cell steps into an empty 4-adjacent square",
      spawn: "Birth a mind into a missing remembered or morph-shaped cell",
      fission: "Split a long or stressed body across a neck",
      hold: "Keep the current polyomino; do not move",
    },
  },
  morph: {
    type: "choice",
    instructions: "Which inhabitant of morphospace is `field` currently a pointer to, if any?",
    criteria: {
      "P-pentomino": "Five-cell P",
      "L-tetromino": "Four-cell L",
      "T-tetromino": "Four-cell T",
      "S-tetromino": "Four-cell S",
      none: "No stable pointer yet",
    },
  },
  one_body: {
    type: "score",
    instructions: "How integrated is the traveling wave on the largest animal in `animals`?",
    criteria: [
      "Fragmented: many clocks, no shared pattern",
      "Partial: local agreement, seams still fight",
      "One body: a single traveling pattern holds the animal",
    ],
  },
};

export const THRESH = {
  eat: 0.58,
  compete: 0.58,
  actConf: 0.32,
  morphConf: 0.50,
};

export const CADENCE_MS = 2800;

export function snapshot(state) {
  const minds = state.minds || [];
  let sumV = 0, nV = 0;
  const species = [];
  const seen = new Set();
  for (const m of minds) {
    if (m.committed) { sumV += m.V || 0; nV++; }
    const key = m._species || "";
    if (key && !seen.has(key)) { seen.add(key); species.push(key); }
  }
  const animals = [];
  const by = state.waveByAnimal;
  if (by && typeof by.values === "function") {
    for (const r of by.values()) {
      animals.push({ n: r.n, coh: +((r.coh || 0).toFixed(3)), integrated: !!r.integrated });
      if (animals.length >= 8) break;
    }
  }
  const seams = (state.waveSeams || []).slice(0, 6).map(s => ({
    inter: +((s.inter || 0).toFixed(3)),
    dV: +((s.dV || 0).toFixed(3)),
  }));
  return {
    field: "lattice-animal",
    living: !!(state.narration && state.narration.flags && state.narration.flags.living),
    minds: minds.length,
    committed: nV,
    animal_count: state.animalCount || animals.length,
    largest: state.largestAnimal || 0,
    wave_coh: +((state.waveCoh || 0).toFixed(3)),
    mean_V: nV ? +(sumV / nV).toFixed(3) : 0,
    morph: state.ingressMorph || null,
    species: species.slice(0, 8),
    animals,
    seams,
    invariant: "Cells sit on the shared gauge. Bonds are 4-adjacent. Jev may only bias wander, spawn, fission, eat, compete, or the morph pointer.",
  };
}

export function applyAnswers(answers) {
  const eat = Number(answers && answers.eat && answers.eat.noul);
  const compete = Number(answers && answers.compete && answers.compete.noul);
  const act = (answers && answers.act && answers.act.choice) || "hold";
  const actConf = Number(answers && answers.act && answers.act.confidence);
  const morphRaw = (answers && answers.morph && answers.morph.choice) || "none";
  const morphConf = Number(answers && answers.morph && answers.morph.confidence);
  const one = Number(answers && answers.one_body && answers.one_body.score);
  return {
    eatP: Number.isFinite(eat) ? eat : 0,
    competeP: Number.isFinite(compete) ? compete : 0,
    act: ["wander", "spawn", "fission", "hold"].includes(act) ? act : "hold",
    actConf: Number.isFinite(actConf) ? actConf : 0,
    morph: morphRaw === "none" ? null : morphRaw,
    morphConf: Number.isFinite(morphConf) ? morphConf : 0,
    oneBody: Number.isFinite(one) ? one : 1,
  };
}

export function lifeWeights(decision) {
  const w = { wander: 1, spawn: 1, fission: 1 };
  if (!decision || decision.actConf < THRESH.actConf) return w;
  if (decision.act === "hold") return { wander: 0.4, spawn: 0.4, fission: 0.35 };
  if (decision.act === "wander") return { wander: 2.1, spawn: 0.7, fission: 0.6 };
  if (decision.act === "spawn") return { wander: 0.7, spawn: 2.4, fission: 0.6 };
  if (decision.act === "fission") return { wander: 0.6, spawn: 0.7, fission: 2.6 };
  return w;
}

export function eatNow(decision, fallbackP, rand = Math.random) {
  if (!decision) return rand() < fallbackP;
  return decision.eatP >= THRESH.eat;
}

export function competeNow(decision, fallbackP, rand = Math.random) {
  if (!decision) return rand() < fallbackP;
  return decision.competeP >= THRESH.compete;
}

export function pickMorph(decision, userMorph) {
  if (userMorph) return userMorph;
  if (!decision || !decision.morph || decision.morphConf < THRESH.morphConf) return null;
  return decision.morph;
}

const clock = { lastAt: 0, inflight: false, last: { ok: false, reason: "off" } };

export function lastCall() {
  return clock.last;
}

export async function requestDecide(state, opts = {}) {
  if (!state) return null;
  const now = (opts.now || Date.now());
  const open = !!(opts.open || (state.narration && state.narration.flags && state.narration.flags.living) || state.animalCount >= 1);
  if (!open) {
    if (!clock.last.ok) clock.last = { ok: false, reason: "opening" };
    return null;
  }
  if (clock.inflight) return null;
  if (clock.last.reason === "no-jev" && now - clock.lastAt < 20000) return null;
  if (now - clock.lastAt < (opts.cadenceMs || CADENCE_MS)) return null;
  clock.inflight = true;
  clock.lastAt = now;
  const t0 = opts.now || Date.now();
  try {
    const res = await fetch("/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: snapshot(state) }),
    });
    const data = await res.json();
    if (data && data.ok && data.answers) {
      const decision = applyAnswers(data.answers);
      clock.last = {
        ok: true,
        model: data.model || "jev-latest",
        ms: data.ms || 0,
        act: decision.act,
        eatP: decision.eatP,
        competeP: decision.competeP,
        morph: decision.morph,
      };
      return decision;
    }
    clock.last = { ok: false, reason: (data && data.reason) || "down", ms: Date.now() - t0 };
    return null;
  } catch {
    clock.last = { ok: false, reason: "down" };
    return null;
  } finally {
    clock.inflight = false;
  }
}
