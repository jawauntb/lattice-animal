# SYSTEM_DESIGN.md

*Current architecture snapshot. Update this every time a file is added,
removed, or its role shifts.*

Last updated: 2026‑09‑18 (iter 20 — WebGPU pairwise pass for chord kinship + cancer nearest-search).

This file is the architecture you hand a collaborator. `README.md` is
the public story. `INSTRUCTIONS_AND_INSPIRATION.md` is the aesthetic
and theory. `HANDOFF.md` is how an agent picks up cold.

---

## The one‑paragraph summary

A Node/Express server serves a single static page (`public/index.html`)
plus vanilla ES‑module JavaScript, CSS, and generated icons. All
simulation, rendering, audio, and UI run in the browser. The field
snapshots to `localStorage` (`la:field:v3`) so a refresh keeps the
animals for up to three days; there is no server database. A compiled
47‑neuron fly heading circuit loops on the page. A 754‑neuron motif on
one Modal L4 writes a delayed letter through `/think`. Traveling
beta/gamma waves walk each polyomino and add or cancel at seams. The
field's two O(n²) scans (chord‑commit kinship, cancer nearest‑search) run
on a WebGPU compute pass when the browser supports it, falling back to
the original serial CPU scan otherwise. Deployment is Railway via
Nixpacks, sourced from `jawauntb/lattice-animal@main`.

## Repo layout

```
lattice_animal/
├── AGENTS.md                          ← agent workflow + ideas queue
├── INSTRUCTIONS_AND_INSPIRATION.md    ← purpose, aesthetic, research
├── HANDOFF.md                         ← cold pickup briefing
├── README.md                          ← public story (GitHub + share)
├── SYSTEM_DESIGN.md                   ← this file
├── package.json                       ← "start": "node server.js"
├── package-lock.json
├── server.js                          ← Express static + /think proxy
├── modal_mind/                        ← Modal L4 slow mind + fly-deep.json
├── railway.json                       ← Railway build/deploy config
├── nixpacks.toml                      ← Nixpacks node20 install/start
├── docs/railway-autodeploy.md         ← GitHub App + webhook fallback
├── tests/mobile-budget.test.mjs       ← URL-bar / skipHeavy predicates
├── tests/jev.test.mjs                 ← applyAnswers / eatNow / morph handoff
├── .github/workflows/deploy.yml       ← optional RAILWAY_WEBHOOK ping
├── .gitignore
├── icons/
│   ├── icon.svg                       ← 512×512 P‑pentomino source
│   └── og.svg                         ← 1200×630 social‑preview source
├── scripts/
│   ├── build-icons.mjs                ← sharp → PNGs + ICO
│   ├── compile-fly-cx.py              ← 47‑neuron / 280‑synapse motif
│   └── compile-fly-deep.py            ← 754‑neuron / 7200‑synapse motif
└── public/
    ├── index.html                     ← shell, modal, drawer, ?v= cache bust
    ├── style.css
    ├── main.js                        ← sim + render + waves + input
    ├── budget.js                      ← phone-stable resize / skipHeavy
    ├── jev.js                         ← System One questions + apply
    ├── connectome.js                  ← local reflex + /think client
    ├── gpu.js                         ← WebGPU all‑pairs pass (chord kin, cancer scan)
    ├── audio.js                       ← voices + species policies
    ├── data/fly-cx.json               ← compiled heading motif (CC‑BY Janelia)
    ├── vendor/                        ← d3-delaunay + delaunator + predicates
    ├── site.webmanifest
    └── favicon / icons / og-image.png
```

## Per‑file responsibilities

### Deploy / infra

- **`server.js`** — Express. Serves `public/` with compression.
  `Cache-Control: no-store` in dev, and always on `.html` in prod so
  `?v=` busts land. Other assets: 1‑hour maxAge in prod. `/healthz`.
  `POST /think` and `GET /think/status` proxy to Modal using
  `THINK_URL`, `THINK_STATUS_URL`, `THINK_TOKEN`. 503 if unset, 504
  on timeout. `POST /decide` and `GET /decide/status` proxy to
  TypeSafe `POST https://api.typesafe.ai/v1/systemone` using
  `TYPESAFE_API_KEY`. The browser sends field state only; the
  server attaches `QUESTIONS` from `public/jev.js`. 503 `no-jev`
  if unset. Binds `PORT`, default 3000.
- **`package.json`** — `type: module`, `start: node server.js`,
  `engines node>=20`. Runtime: `express`, `compression`. Dev: `sharp`.
- **`railway.json`** — Nixpacks, `node server.js`, `/healthz`.
- **`nixpacks.toml`** — Node 20, `npm ci` with `--omit=dev`,
  `NODE_ENV=production`.
- **`modal_mind/app.py`** — one L4, scale‑to‑zero, FastAPI `/think`.
  Graph: `modal_mind/fly-deep.json`. Secret `lattice-think`.

### The page shell

- **`public/index.html`**
  - `<canvas id="stage">` fills the viewport
  - `.chrome.top` — brand, epigraph, `.action-cluster` (mute, pause,
    reseed, chord/arpeggio, hide panels)
  - `.chrome.legend` — cast + controls. `body.panels-off` hides
    legend and telemetry (`pointer-events: none` on descendants)
  - `.chrome.telemetry` — minds, committed, animals, largest,
    entropy, V, χ, width, loop, think, wave, **jev**
  - `.chrome.bottom` — `?`, verse pill, `⌇` (always visible)
  - `.modal-scrim` + `.modal` — full explainer
  - `.narrator-drawer` — log + morphospace chips
  - `#narrator-loci` — pins on the field
  - import map: `d3-delaunay` → `/vendor/d3-delaunay.js`
  - CSS/JS cache bust: `?v=18` (bump when those files change)
  - inline script talks to `window.__la`

### Styling

- **`public/style.css`** — tissue palette custom properties
  (`--mind --bound --committed --animal --cream --ink`…).
  `[hidden] { display: none !important }`. `.chrome` is
  `pointer-events: none` with auto on children. z‑index: canvas
  bottom, loci 3, chrome 7–8, tooltips above chrome, modals above
  that. `body.panels-off` fades legend/telemetry.

### The heart — `public/main.js`

1. Imports `d3-delaunay`, `audio.js`, `connectome.js` (`?v=`).
2. Palettes `TINT` (4), `ANIMAL_HUES` (12), nacre tiles baked once
   per hue (`bakeNacre` / `nacreFill`).
3. `CFG` — gauge, motion, commit, V leak, χ grid, wave hop / V write.
   `WAVE_CLOCK` — per‑species beta/gamma rad/frame.
4. `BUDGET` + `budget.js` — CSS/pixel/dpr/frame caps. `skipHeavy`
   needs four slow frames on a phone (six on desktop) and stays on
   until ~4 s of calm on coarse pointers so nacre/cilia do not
   strobe. URL-bar height jitter (<110 px) only restyles the
   canvas; it does not remap minds. The working-hard notice has a
   20 s cooldown. Full-field locus hush is desktop-only.
5. `state` — see State shape below.
6. `Mind` — position, gauge cell, commit, animal identity, V,
   valence[7], cancer, beta/gamma/waveHop, heading from the circuit.
7. `seed` / `tryRestoreField` — sunflower scatter, or `la:field:v3`.
8. Gauge math, χ rebuild/sample, valence update, morph memory.
9. `updateWaves(neighbors)` — BFS hops on the polyomino; beta from
   heading + species clock; gamma gated by beta and χ; V += wave.
   Voronoi seams scored as analog products. `tryWaveEcology` —
   constructive takeover (eat) or destructive neck cut (compete),
   gated by Jev noul thresholds when a decision is live.
   `detectWaveNarration` — first wave, first integrated body.
10. Living phase — wander / spawn / fission / dissolve / wave ecology
    / random species call, rates blended by Jev `act` when
    confidence clears. Enters at ≥85% committed or ~22 s.
11. `step()` — Delaunay → proposals → V leak + fly.stepMind +
    species policy → forces → commit → animal BFS →
    `updateWaves` → narrations → living phase → persist every ~5 s.
12. `render()` layers, back to front:
    trail fade → χ blooms → light cones → w‑max fan → morph ghosts →
    anticipation → dust/twinkles → ghost lattice → nacre membranes →
    Voronoi edges → animal outline (seam color = analog sum) →
    bonds + wave pearls → vectors → minds (cilia, valence threads,
    V ring, cancer pulse) → fly constellation → predictive ghosts →
    loci.
13. `tick()` — telemetry including `#t-wave` and `#t-jev`.
14. Input — space / R / M / H / A / ? / tap / drag / long‑press.
15. `window.__la` — pause, reseed, mute, panels, temporal gap,
    `wave()`, `jev()`, `vStats()`, `chiStats()`, `circuitStats()`, `gpuStats()`,
    wound, size, audioInfo.
16. `jev.requestDecide` every ~2.8 s after an animal exists.
    Typed answers only. No generated text.

Persistence schema `la:field:v3` stores minds (incl. V, valence,
cancer), gauge + width, animalKeys, morphByColor, temporalGapMode,
narration. Waves are recomputed each tick, not saved. Older keys
are rejected. Save on interval, hide, and `beforeunload`. **R**
clears the save.

### Fly circuit — `public/connectome.js`

Loads `public/data/fly-cx.json` (47 neurons, 280 synapses,
`male-cns:v1.0`, CC‑BY Janelia). `stepMind` loops the same W, K
times (species sets K). Writes `circuitE`, `thought`, `heading`,
`headingMag`, and a leak into `V`. `headingOf` is the EPG bump
the spatial wave walks.

`THINK.openingMs = 8000`, `cadenceMs = 4000`. `requestThink` is
skipped during the opening, when `document.hidden`, and until
`opts.open` (living phase or ≥1 animal). Then `POST /think`.
`applyThink` writes GPU readout into `V`. No websocket.

`draw` paints a small constellation on a few thinking minds
(capped further when `skipHeavy`).

### GPU pairwise pass — `public/gpu.js`

The two scans in `step()` that are genuinely O(n²) — chord‑interference
kinship at a mass‑commit burst, and a cancer mind's nearest‑other‑animal
search — run as a single WebGPU compute pass, one thread per mind, instead
of a serial `for (const o of minds)` scan. `init()` feature‑detects
`navigator.gpu`, requests an adapter/device, and compiles one compute
pipeline; if any step fails (no WebGPU, no adapter, device lost) `ready()`
stays false forever after and every caller keeps its original CPU loop —
nothing else in `main.js` depends on the GPU being present.

`dispatchPairwise(minds, frame, chordWindow, chordRadius)` is fire‑and‑
forget: it uploads position/animal/committed/cancer state, dispatches
`ceil(n/64)` workgroups, and asynchronously maps the result buffer back.
Resolution lands a frame or two later and writes straight onto the mind
objects (`_gpuKin`, `_gpuCancerV`, `_gpuCancerD2`, `_gpuCancerFound`,
`_gpuFrame`) — never blocks the render loop, never stalls waiting on the
GPU. `step()` only trusts a result within 3 frames of `resultFrame()`
(`gpuFresh`); anything older falls back to the CPU scan for that frame.
Telemetry `gpu` reads `webgpu` once a fresh result exists, `warming`
just after init while the first dispatch is in flight, or `cpu` when
WebGPU isn't available. This is deliberately scoped to the two quadratic
scans only — the Delaunay‑neighbor gauge/force/wave passes are already
near‑linear (bounded by average Voronoi neighbor count) and stay on the
CPU so the emergent gauge‑negotiation behavior is untouched.

### Jev — `public/jev.js`

TypeSafe System One (Almeida 2026). `QUESTIONS` are eat / compete
nouls, act + morph choices, one_body score. `snapshot(state)` is
the only payload the browser sends. `applyAnswers` becomes
`state.jev`. `eatNow` / `competeNow` replace the old seam coin
flips when a decision is live. `lifeWeights` scales wander /
spawn / fission. `pickMorph` sets `ingressMorph` unless the
viewer already tapped a chip (`userMorph`). Jev cannot generate
text and cannot place a cell off the grid. `/decide` is 503
`no-jev` without `TYPESAFE_API_KEY`.

### Voices — `public/audio.js`

- `SPECIES` — 10 keys, rgb, `restingV`, `policy`.
- Events: birth, commit, growth, merger, fission, death, **call**.
- `applySpeciesPolicy(mind, neighbors, ctx)` — causal identity:
  lion depolarizes, parakeet spawn‑bias, wolf long‑range V match,
  elephant anchors, whale slow sync, frog pulses, owl settle,
  dolphin fast scan, cricket noise, sparrow burst.
- Armed on first gesture only.

## Data flow

```
requestAnimationFrame
        ↓
   step()  if !paused
        ↓
gpu.dispatchPairwise (fire‑and‑forget; result lands in ~1‑2 frames)
        ↓
Delaunay(positions) → Voronoi neighbors
        ↓
localS / localT / nMean  →  gauge.theta / s / width
        ↓
V leak toward committed neighbors; cancer if isolated too long
        ↓
fly.stepMind (K loops) → heading bump → V
        ↓
audio.applySpeciesPolicy
        ↓
forces (snap · coherence · repel · PD · walls)
        ↓
commit / chord / animal BFS / morph memory
        ↓
updateWaves → analog V; seams
        ↓
detectNarrations / detectWaveNarration → verse + loci + audio
        ↓
updateLivingPhase → wander / spawn / fission / dissolve / tryWaveEcology
        ↓
saveField every ~5 s

render() — layer stack in main.js §12
```

Tooltip and telemetry read `state`; they do not write it except
through `__la` helpers.

## State shape (essentials)

```
state = {
  minds: [Mind, ...],
  dust, twinkles,
  gauge: { cx, cy, theta, s, width },
  jitter, paused, frame, mouse,
  animalCount, largestAnimal, prev*,
  narration: { current, history[], flags{}, lastNarratedFrame, lastLifeFrame },
  animalColors: Map<id, rgb>,
  animalKeys: Map<signature, { color, memory, age, missAge }>,
  morphByColor: Map<rgb, offsets>,
  ingressMorph, temporalGapMode,
  chi, chiW, chiH, chiSources[],
  waveCoh, waveByAnimal: Map, waveSeams[],
  loci[], gaze, bottleneckIdx, regenUrgent,
  ingressMorph, userMorph, jev,
  perf: { lastMs, skipHeavy, streak, calm, noticeAt },
  _delaunay, _voronoi, _neighbors,
}

Mind = {
  x, y, vx, vy, gx, gy, _assigned,
  settle, committed, animalId, animalColor, lastAnimalColor,
  localS, localT, nMeanX, nMeanY,
  tintIdx, phase, orgSeed, cilia,
  commitFlash, commitChord, bornAt, spawnedAt, dying,
  V, restingV, valence[7], lightCone, vStable, prevV, isoTicks,
  cancer, cancerAge, collapse,
  beta, gamma, waveHop, heading, headingMag,
  circuit[], circuitE, thought, circuitK,
}
```

## Interaction map

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Pause | Space, ⏸ | ⏸ |
| Reseed (clears save) | R, ↻ | ↻ |
| Mute (persisted) | M, speaker, legend | speaker, legend |
| Hide panels (persisted `la:panels`) | H, top stacked‑lines, ⌇ | same; phones start hidden |
| Chord / arpeggio (look only) | A, three‑bar | three‑bar |
| Drop 3 minds | click | tap (chord + blurb if still) |
| Paint trail | drag | drag (no page scroll) |
| Hover blurb | pointermove | still‑tap |
| Take a cell / regen | long‑press committed | long‑press |
| Morphospace bias | drawer chips | drawer chips |
| Info | ?, ? key | ? |
| Narrator | verse ▲, tap a log line | same |
| Hidden toggles | V / F / G | — |

## Telemetry

| Key | Meaning |
| --- | --- |
| minds | candidates in the field |
| committed | locked to the gauge |
| animals | 4‑connected bodies of 2+ |
| largest | cells in the biggest body |
| entropy | mean offset from gauge cell |
| V | mean voltage of committed minds |
| χ | peak of the concern field |
| width | w‑max rotation family width |
| loop | mean fly‑circuit reuse K |
| gpu | `webgpu` / `warming` / `cpu` — chord + cancer pairwise pass backend |
| think | `opening` / `L4 N` / `local` |
| wave | mean beta coherence (0–1) |

## Deploy pipeline

```
edit → commit → git push origin main
                    │
                    ▼
         GitHub jawauntb/lattice-animal@main
                    │
                    ▼
         Railway GitHub App autodeploy
         (webhook fallback: .github/workflows/deploy.yml)
                    │
                    ▼
         Nixpacks → node server.js
                    │
                    ▼
         https://latticeanimal-production.up.railway.app
```

Emergency only: `railway up --detach` from a linked cwd. See
`docs/railway-autodeploy.md`.

Env on Railway (never commit): `THINK_URL`, `THINK_STATUS_URL`,
`THINK_TOKEN`, `TYPESAFE_API_KEY`. Without the TypeSafe key the
field walks on today's heuristics and telemetry `jev` reads `off`.
Doppler configs `jawaun-personal` and
`research_derived_experiments` if a new secret is needed.

## Extension points

- **Life event** — `updateLivingPhase()` + `narrate` +
  `audio.play(voiceOf(m), kind)`.
- **Narrator event** — `detectNarrations` or `detectWaveNarration`
  with a one‑shot flag.
- **Species** — `SPECIES` in `audio.js` (rgb, restingV, policy,
  voice) and a `WAVE_CLOCK` row in `main.js`.
- **Render layer** — insert in `render()` at the right depth.
  Warmth stays on committed gold.
- **Mobile control** — legend `data-action` + `fireAction` in
  `index.html` + `pointer-events: auto` if nested under `.chrome`.
- **Persist a field** — `serializeField` / `tryRestoreField`, bump
  `SAVE_KEY` to `la:field:v<N>`.
- **Recompile fly motifs** —
  `python3 scripts/compile-fly-cx.py` /
  `compile-fly-deep.py`. Redeploy mind:
  `modal deploy modal_mind/app.py`.

## What is shipped vs still a queue item

Shipped and visible: V leak + rings + voltage‑gated bonds, χ blooms,
valence threads that fold at commit, w‑max fan, light cones, morph
holes + regen spawn, chord/arpeggio look, nacre, hide‑panels, two
clocks, traveling waves, eat/compete/integrate, localStorage v3,
narrator loci, WebGPU pairwise pass for chord kinship + cancer search
(telemetry `gpu`, CPU fallback everywhere WebGPU is absent).

Not shipped (do not describe these as live): server‑side persistent
life while Jawaun is away; click‑to‑isolate an animal; continuous
listen‑mode bed; space‑warp under χ; sexual dimorphism; pull‑to‑split
by long‑pressing a bond; PreText moving type. Language cancer exists
as a rare isolation → depolarize path, not a full invasion demo.

## Update this file whenever

- A file is added or deleted
- A public function's contract changes
- The render layer order shifts
- A new state field is introduced
- A new env var or deploy target lands
- A README claim would otherwise drift from the code

If you finish a change: update this file in the same commit, or say
why you did not.
