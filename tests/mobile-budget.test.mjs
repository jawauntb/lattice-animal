import assert from "node:assert/strict";
import {
  isUrlBarJitter,
  nextSkipHeavy,
  noticeDue,
  locusHoldFrames,
  lifeNarrateGap,
  narrateGap,
  NOTICE_MS,
} from "../public/budget.js";

// URL-bar chrome on a phone: cover pixels, do not remap the field.
assert.equal(isUrlBarJitter(0, 80, true), true);
assert.equal(isUrlBarJitter(4, 109, true), true);
assert.equal(isUrlBarJitter(0, 80, false), false, "desktop height change remaps");
assert.equal(isUrlBarJitter(20, 10, true), false, "real width change remaps");
assert.equal(isUrlBarJitter(0, 140, true), false, "rotation-scale height remaps");

// skipHeavy: sticky on a phone, recoverable on desktop after a long calm.
assert.equal(nextSkipHeavy({ skipHeavy: false, streak: 3, calm: 0, coarse: true }), false);
assert.equal(nextSkipHeavy({ skipHeavy: false, streak: 4, calm: 0, coarse: true }), true);
assert.equal(nextSkipHeavy({ skipHeavy: true, streak: 0, calm: 90, coarse: true }), true, "phone stays dim through a short calm");
assert.equal(nextSkipHeavy({ skipHeavy: true, streak: 0, calm: 241, coarse: true }), false, "phone recovers after ~4s calm");
assert.equal(nextSkipHeavy({ skipHeavy: false, streak: 5, calm: 0, coarse: false }), false);
assert.equal(nextSkipHeavy({ skipHeavy: false, streak: 6, calm: 0, coarse: false }), true);
assert.equal(nextSkipHeavy({ skipHeavy: true, streak: 0, calm: 91, coarse: false }), false);

// Working-hard notice cannot strobe every hitch.
assert.equal(noticeDue(1000, 0), true);
assert.equal(noticeDue(1000, 900), false);
assert.equal(noticeDue(1000 + NOTICE_MS + 1, 1000), true);

assert.equal(locusHoldFrames(true), 110);
assert.equal(locusHoldFrames(false), 48);
assert.equal(lifeNarrateGap(true), 120);
assert.equal(lifeNarrateGap(false), 48);
assert.equal(narrateGap(true), 24);

console.log("mobile-budget: ok");
