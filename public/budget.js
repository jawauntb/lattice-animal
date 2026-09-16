// Phone-stable draw budget. Pure predicates so a node assay can pin them.

export const URL_BAR = { dw: 12, dh: 110 };
export const NOTICE_MS = 20000;
export const HEAVY_ON = { coarse: 4, fine: 6 };
export const HEAVY_OFF = { coarse: 240, fine: 90 };

export function isUrlBarJitter(dw, dh, coarse) {
  return !!(coarse && dw < URL_BAR.dw && dh < URL_BAR.dh);
}

export function nextSkipHeavy({ skipHeavy, streak, calm, coarse }) {
  if (!skipHeavy) return streak >= (coarse ? HEAVY_ON.coarse : HEAVY_ON.fine);
  const recover = coarse ? HEAVY_OFF.coarse : HEAVY_OFF.fine;
  return calm <= recover;
}

export function noticeDue(now, last, ms = NOTICE_MS) {
  return !last || now - last > ms;
}

export function locusHoldFrames(coarse) {
  return coarse ? 110 : 48;
}

export function lifeNarrateGap(coarse) {
  return coarse ? 120 : 48;
}

export function narrateGap(coarse) {
  return coarse ? 24 : 10;
}
