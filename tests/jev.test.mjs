import assert from "node:assert/strict";
import {
  QUESTIONS,
  applyAnswers,
  lifeWeights,
  eatNow,
  competeNow,
  pickMorph,
  snapshot,
  THRESH,
} from "../public/jev.js";

assert.equal(QUESTIONS.eat.type, "noul");
assert.equal(QUESTIONS.act.type, "choice");
assert.equal(QUESTIONS.morph.type, "choice");
assert.equal(QUESTIONS.one_body.type, "score");
assert.ok(QUESTIONS.act.criteria.hold);

const answers = {
  eat: { type: "noul", noul: 0.81 },
  compete: { type: "noul", noul: 0.12 },
  act: { type: "choice", choice: "spawn", confidence: 0.71, probabilities: { spawn: 0.71, wander: 0.2, hold: 0.09 } },
  morph: { type: "choice", choice: "P-pentomino", confidence: 0.66 },
  one_body: { type: "score", score: 1.8 },
};
const d = applyAnswers(answers);
assert.equal(d.act, "spawn");
assert.equal(d.morph, "P-pentomino");
assert.equal(eatNow(d, 0.11, () => 0), true);
assert.equal(competeNow(d, 0.09, () => 0), false);
assert.equal(lifeWeights(d).spawn > 2, true);
assert.equal(pickMorph(d, null), "P-pentomino");
assert.equal(pickMorph(d, "L-tetromino"), "L-tetromino", "a hand on the chip wins");

const quiet = applyAnswers({
  eat: { noul: 0.2 },
  compete: { noul: 0.2 },
  act: { choice: "hold", confidence: 0.1 },
  morph: { choice: "none", confidence: 0.2 },
  one_body: { score: 0.4 },
});
assert.equal(eatNow(quiet, 0.11, () => 0), false);
assert.equal(lifeWeights(quiet).wander, 1, "low confidence leaves the poisson alone");
assert.equal(pickMorph(quiet, null), null);

assert.equal(eatNow(null, 0.5, () => 0.4), true);
assert.equal(eatNow(null, 0.5, () => 0.6), false);
assert.ok(THRESH.eat > 0.5);

const snap = snapshot({
  minds: [{ committed: true, V: 0.2, _species: "wolf" }],
  animalCount: 2,
  largestAnimal: 5,
  waveCoh: 0.61,
  waveByAnimal: new Map([[1, { n: 5, coh: 0.61, integrated: true }]]),
  waveSeams: [{ inter: 0.4, dV: 0.1 }],
  narration: { flags: { living: true } },
  ingressMorph: null,
});
assert.equal(snap.field, "lattice-animal");
assert.equal(snap.animal_count, 2);
assert.equal(snap.seams[0].inter, 0.4);
assert.match(snap.invariant, /4-adjacent/);

console.log("jev: ok");
