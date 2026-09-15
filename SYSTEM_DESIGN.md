# SYSTEM_DESIGN.md

*Current architecture snapshot. Update this every time a file is added,
removed, or its role shifts.*

Last updated: 2026‑09‑15 (iter 10 — concern field χ: 16 px grid, event Gaussians, local spacing warp).

---

## The one‑paragraph summary

A Node/Express server serves a single static page (`public/index.html`)
plus its vanilla ES‑module JavaScript, CSS, and generated icons. All the
simulation, rendering, audio, and UI logic runs in the browser. There's
no database and no persistent state: every visit starts a fresh field.
Deployment is Railway via Nixpacks; icons are generated ahead of time
from an SVG source with `scripts/build-icons.mjs`.

## Repo layout

```
lattice_animal/
├── AGENTS.md                          ← agent workflow guide
├── INSTRUCTIONS_AND_INSPIRATION.md    ← purpose, aesthetic, research
├── README.md                          ← public README on GitHub
├── SYSTEM_DESIGN.md                   ← this file
├── package.json                       ← "start": "node server.js"
├── package-lock.json
├── server.js                          ← Express static server
├── railway.json                       ← Railway build/deploy config
├── nixpacks.toml                      ← Nixpacks node20 install/start
├── .gitignore
├── icons/
│   ├── icon.svg                       ← 512×512 app icon source (real polyomino)
│   └── og.svg                         ← 1200×630 social‑preview source
├── scripts/
│   └── build-icons.mjs                ← sharp → PNGs + ICO + copies SVG
└── public/
    ├── index.html                     ← page skeleton, meta tags, modal, drawer, script glue
    ├── style.css                      ← all styling
    ├── main.js                        ← sim + rendering + interactions (the heart)
    ├── audio.js                       ← ten procedural species voices + mute
    ├── site.webmanifest               ← PWA manifest
    ├── favicon.svg, favicon.ico, favicon-*.png
    ├── icon-192.png, icon-512.png, icon-mask.png
    ├── apple-touch-icon.png
    └── og-image.png                   ← 1200×630 preview for SMS/Slack/Twitter
```

## Per‑file responsibilities

### Deploy / infra

- **`server.js`** — Tiny Express app. Serves `public/` statically with
  no‑store in dev / 1‑hour maxAge in prod. Exposes `/healthz` for
  Railway. Binds `PORT` env, defaults 3000.
- **`package.json`** — `type: module`, `start: node server.js`, `engines
  node>=20`. Runtime deps: `express`, `compression`. Dev dep: `sharp`
  (only for `build-icons.mjs`).
- **`railway.json`** — Nixpacks builder, `startCommand: node server.js`,
  `healthcheckPath: /healthz`.
- **`nixpacks.toml`** — Sets Node 20, runs `npm ci` (fallback `npm
  install`) with `--omit=dev`, starts with `NODE_ENV=production`.

### The page shell

- **`public/index.html`** — Semantic layout:
  - `<canvas id="stage">` fills the viewport
  - `.chrome.top` — brand, epigraph, `.action-cluster` (mute / pause /
    reseed) in a right column
  - `.chrome.legend` — the cast + controls list (rows for space, R, M
    are `<button class="tappable">`)
  - `.chrome.telemetry` — minds / committed / animals / largest /
    entropy readouts
  - `.chrome.bottom` — grid: `?` info button, `.verse-btn` narrator
    trigger, `⌇` menu button
  - `.modal-scrim` + `.modal` — full explainer
  - `.narrator-drawer` — expandable panel below the verse
  - `.mind-tooltip` — floating hover blurb (positioned near cursor)
  - `<script type="importmap">` maps `d3-delaunay` to a jsDelivr ESM
    build; `main.js` is `type="module"`
  - Bottom inline `<script>` wires all button click / drawer /
    modal / M‑key logic. Talks to `main.js` through `window.__la`.

### Styling

- **`public/style.css`** — All CSS. Ordered as:
  1. `:root` custom properties (palette, safe‑area insets)
  2. Global reset + `[hidden] { display: none !important }` (critical
     — see AGENTS.md failure modes)
  3. `body` background gradient + typography
  4. `#stage` canvas
  5. `.chrome` base (fixed, z‑index 2, pointer‑events: none, children
     auto)
  6. `.top` header + `.top-cluster` + `.action-cluster` + `.action-btn`
  7. `.legend` glass panel + `.row.keys.tappable`
  8. `.telemetry` glass panel
  9. `.bottom` grid + `.verse-btn` + `.chevron` + `.info-btn` + `.menu-btn`
 10. `.mind-tooltip`
 11. `.narrator-drawer` + inner content
 12. `.modal-scrim` + `.modal`
 13. Mobile media queries `@media (max-width: 780px)`, reduced‑motion,
     ultra‑short viewports

### The heart — `public/main.js`

Structure, top to bottom:

1. **Imports** — `d3-delaunay`, `* as audio from "/audio.js"`
2. **Palette & verses**
   - `TINT` — 4 tissue tints for uncommitted per‑mind identity
   - `ANIMAL_HUES` — 12 hues for per‑animal identity
   - `CREAM`, `NIGHT`
   - `OPENING_VERSE`, `CLOSING_VERSE`, `VERSES[]`
3. **`CFG`** — all tunables in one object: gauge params, motion params,
   commit thresholds, render params, cosmos counts.
4. **Canvas setup** — DPR‑aware `resize()`; window resize listener; and a
   post‑boot poll (400 ms) that catches Chrome UI shifts that don't
   fire a resize event.
5. **`state`** — the whole world state:
   - `minds[]` (each is a `Mind` instance)
   - `dust[]`, `twinkles[]` (cosmos)
   - `gauge {cx, cy, theta, s}` (the shared grid)
   - `jitter`, `paused`, toggles for voronoi/field/ghost
   - `frame`, `mouse`, `animalCount`, `largestAnimal`, `prev*` counters
   - `narration {current, history[], flags{}, lastNarratedFrame}`
   - `animalColors: Map(animalId → rgb)`,
     `animalKeys: Map(signature → rgb)` for stable color continuity
6. **`class Mind`** — position, velocity, gauge cell (gx, gy), settle
   counter, committed flag, animalId, animalColor, lastAnimalColor,
   local proposals (localS, localT, nMeanX/Y), tintIdx, cilia count,
   commitFlash, commitChord, bornAt, spawnedAt, dying counter.
7. **`seed(count)`** — sunflower scatter around the center; resets all
   state including narration history + animalKeys.
8. **`makeDust()` / `makeTwinkles()`** — cosmos particles.
9. **Gauge math** — `worldToGauge` / `gaugeToWorld` / `nearestCell`.
10. **`narrate()` / `renderDrawerLog()`** — pushes an event onto the
    log, updates the verse, re‑renders the drawer.
11. **`detectNarrations(freshCommits)`** — called each tick after
    animal detection. One‑shot phase events (genesis, alignment, first
    commit, first animal, N% committed, chord commits, large‑animal
    milestones, mergers).
12. **Living dynamics** — `updateLivingPhase()`, `tryWander()`,
    `trySpawn()`, `tryDissolve()`, `tryFission()`. Enters at ≥85%
    committed or frame > 22 s.
13. **`step()`** — the whole sim tick:
    a. Compute Delaunay + Voronoi.
    b. Each mind reads its Voronoi neighbors, updates `localS`,
       `localT`, `nMeanX/Y`.
    c. Global gauge follows mean of proposals; spacing clamped tight
       to prevent collapse.
    d. Per‑mind forces: hysteretic cell assignment → snap toward
       target → neighbor coherence → hard‑repel co‑located → PD
       velocity damping → drag → maxSpeed cap → position update →
       soft wall.
    e. Commit / release / commit‑flash decrement.
    f. Chord detection amplifies flash.
    g. BFS finds connected components of 4‑adjacent committed minds
       → animals; stable color assignment.
    h. Detect narrations. Drift dust. Anneal jitter. Frame++.
    i. Verse cycling if narrator has been quiet.
14. **`render()`** — layers, back to front:
    a. Fade previous frame (`trailFade`)
    b. Ambient radial gradient (with breath)
    b2. Concern field χ blooms (`drawChiField`)
    c. Dust
    d. Twinkles
    e. Ghost lattice (if enabled)
    f. Membranes (colored Voronoi fills)
    g. Voronoi edges
    h. Animal outlines + halos (per‑animal color)
    i. Bonds (per‑animal color)
    j. Vector field (dashed cool neighbor mean + tinted actual velocity)
    k. Minds (halos, cores, cilia, commit rings, organelles, ghost‑self)
15. **Telemetry / verse** — `tick()` updates DOM readouts every 6
    frames; `setVerseText()` cross‑fades the bottom bar.
16. **Main loop** — `requestAnimationFrame(frame)`. `step()` only when
    not paused; render always.
17. **Input** — keydown (space/R/V/F/G, M for mute), pointerdown/move/
    up/cancel/leave, click handlers for the info modal and action
    buttons.
18. **Hover tooltip** — `findMindNear`, `describeMind` (returns HTML
    with species + state + one‑sentence plain‑language commentary),
    `updateMindTooltip`, `hideMindTooltip`.
19. **Boot** — `resize(); seed(); requestAnimationFrame(frame);`
    Exposes `window.__la = { togglePause, reseed, toggleMute }` for
    the inline HTML script to call.
20. **Audio arm** — first pointer/key gesture initializes `audio.init()`
    and `audio.resume()`, then removes the listeners.

### Voices — `public/audio.js`

Small module. Public API:

- `SPECIES` — 10 species with `key`, `rgb` (matched to `ANIMAL_HUES`),
  and `restingV` in [−1, 1] (Levin membrane band: whale −0.70 …
  lion +0.70)
- `speciesForColor(rgb)` — returns the species key, or `null` for the
  two quiet hues (rose + ember)
- `restingVForColor(rgb)` — species resting V, or 0 for quiet / unknown
- `init()`, `resume()`, `setMuted(bool)`, `isMuted()`, `play(speciesKey,
  event)` — event ∈ {birth, commit, growth, merger, fission, death}
- Internal helpers: `osc`, `gain`, `lpf`, `bpf`
- Ten voice functions: `lion`, `parakeet`, `wolf`, `elephant`, `whale`,
  `frog`, `owl`, `dolphin`, `cricket`, `sparrow` — each builds an
  OscillatorNode graph, sets envelopes and schedules on
  `ctx.currentTime`, connects through `master → compressor →
  destination`.
- Per‑species throttle (`lastPlayTs`) prevents retrigger spam.

### Icons — `icons/` + `scripts/build-icons.mjs`

- **`icons/icon.svg`** — 512×512 SVG rendering a real P‑pentomino lattice
  animal: cosmic ground, dust specks, warm halo, cell perimeter,
  Voronoi interior boundaries, warm gold bonds, cream inner strokes,
  five species‑hued cells with cream cores.
- **`icons/og.svg`** — 1200×630 with the same body (extended to 6 cells)
  on the left, title + subtitle + tagline on the right, using
  system‑fallback serifs so `sharp` can render text.
- **`scripts/build-icons.mjs`** — Reads both SVGs. Uses `sharp` with
  `density: 384` to rasterize at 16, 32, 48, 180 (Apple), 192, 512,
  and 1200×630. Also assembles a multi‑size `favicon.ico` with a
  hand‑rolled ICO packer that wraps three PNGs (16/32/48). Copies
  `favicon.svg` verbatim.

## Data flow

```
raw time (requestAnimationFrame)
        ↓
   step()  ← only when !paused
        ↓
Delaunay(positions)
        ↓
per‑mind proposal loop  ──►  gauge.theta / gauge.s / gauge.cx / gauge.cy
        ↓
force loop  (snap · neighbor coherence · repel · noise · PD damping)
        ↓
position update
        ↓
commit / release / chord amplify / animal BFS / color continuity
        ↓
detectNarrations()  ──►  narrate()  ──►  DOM verse + drawer log
        ↓                                           audio.play(species, event)
updateLivingPhase()  ──►  tryWander / trySpawn / tryFission / tryDissolve
                                                    audio.play(...)

   render()
        ↓
back‑to‑front layer stack (see main.js §14)
```

The tooltip and telemetry read from `state` but don't mutate it.

## State shape (essentials)

```
state = {
  minds: [Mind, ...],                 // grows/shrinks via spawn/dissolve/paint
  dust: [...], twinkles: [...],       // cosmos
  gauge: { cx, cy, theta, s },        // shared grid (s still frozen/clamped)
  jitter, paused,
  showVoronoi, showField, showGhost,  // toggles (hidden keyboard shortcuts)
  frame, mouse,
  animalCount, largestAnimal,
  prevAnimalCount, prevCommittedCount, prevLargest,
  narration: { current, history: [{frame, short, long, kind}], flags: {}, lastNarratedFrame },
  animalColors: Map<animalId, "r,g,b">,
  animalKeys:   Map<signature,  "r,g,b">,
  chi: Float32Array | null,           // coarse χ grid, base 1
  chiW, chiH,                         // cells at CFG.chiStep (16 px)
  chiSources: [{ cx, cy, amp, sigma, decay }],
  _delaunay, _voronoi, _neighbors,    // per‑frame caches
}

Mind = {
  x, y, vx, vy,
  gx, gy,                             // gauge cell integer coords
  _assigned,                          // hysteretic reassignment flag
  settle, committed, animalId,
  animalColor, lastAnimalColor,
  localS, localT, nMeanX, nMeanY,     // local proposals
  tintIdx, phase, orgSeed, cilia,
  commitFlash, commitChord, bornAt,
  spawnedAt, dying,
  V, restingV,                        // voltage / concern; persist in la:field:v2
}
```

## Interaction map

| Surface | Desktop | Mobile |
| --- | --- | --- |
| Pause / resume | Space, ⏸ button | ⏸ button |
| Reseed | R, ↻ button | ↻ button |
| Mute | M, 🔊 button, legend row | 🔊 button, legend row |
| Voronoi toggle | V (hidden) | — |
| Field toggle | F (hidden) | — |
| Ghost lattice | G (hidden) | — |
| Drop 3 minds | click | tap |
| Paint trail | drag | drag |
| Hover blurb | pointermove | — (touch pending) |
| Info modal | ? button, ? key | ? button |
| Legend + telemetry | always visible | ⌇ button |
| Narrator drawer | verse row (▲) | verse row (▲) |
| Escape | closes modal / drawer | — |

## Deploy pipeline

```
edit → git commit → git push origin main
                    │
                    ▼
              (GitHub main)
                    │
     railway up --detach (from local cwd)
                    │
                    ▼
           Railway Nixpacks build
                    │
                    ▼
        node server.js, PORT bound
                    │
                    ▼
   latticeanimal-production.up.railway.app
```

`/healthz` probed by Railway. Domain generated once via `railway
domain` and returned https URL.

## Extension points

- **Add a new life event** — add the trigger in `updateLivingPhase()`,
  narrate + play its species voice with `audio.play(voiceOf(m), "<kind>")`.
- **Add a new narrator event** — extend `detectNarrations()`; add a
  guard flag if it should fire once.
- **Add a new species** — add an entry to `SPECIES` in `audio.js` with
  an unused `rgb` from `ANIMAL_HUES`, write a voice function
  following the OscillatorNode + envelope pattern.
- **Add a new render layer** — insert in `render()` at the right depth
  (see the layer stack). Ambient layers early, particles / minds late.
- **Add a new mobile control** — add an entry to the legend as
  `<button class="row keys tappable" data-action="<name>">`, handle in
  the `fireAction` switch in `index.html`.
- **Persist a new state field** — extend `serializeField()` and
  `tryRestoreField()` in `main.js`. Bump the schema version tag
  (`SAVE_KEY = "la:field:v<N>"`) so old caches are rejected.

## The next-substrate build (Tier 0 in AGENTS.md ideas queue)

Almost every idea in the ideas queue projects out of these new state
fields we haven't shipped yet. When you build them, add:

- `Mind.V: number` — **shipped (iter 9).** Voltage/concern in [-1, 1].
  Gaussian init around 0; `restingV` from `audio.restingVForColor`
  once a species color is inherited. Diffuses toward mean committed
  neighbor V at `CFG.vDiffuse` (0.02); isolated minds use
  `CFG.vRest` (0.008). Persist in `serializeField()` / `la:field:v2`.
  Render: bond opacity/width = f(1 − |ΔV|); teal/coral V ring;
  telemetry `#t-v`; hover tooltip; `window.__la.vStats()`.
- `Mind.valence: Float32Array(7)` — the tapestry of valence
  (Bennett). Dimensions: [spacing‑fit, rotation‑fit, neighbor
  tightness, tint, cohesion, staleness, light‑cone overlap]. Fed by
  the existing local proposal computations. Collapses to a single
  scalar on commit.
- `Mind.lightCone: number` — the mind's spatial influence radius in
  world units. For an uncommitted mind, ≈ neighbor‑mean‑distance × 1.5.
  For a committed mind, ≈ animal's aggregate cone / member count.
- `Mind.shapeMemory: Set<string>` — target morphology, populated on
  first sustained stability as `${dx},${dy}` relative offsets from
  the animal centroid. Read by regeneration when cells are deleted.
- `state.chi: Float32Array` — **shipped (iter 10).** Concern field
  χ(x, y) = 1 + Σ Aₛ exp(-r² / 2σ²), 16 px cells. Sources:
  `state.chiSources`. `rebuildChi()` each render; `sampleChi(x,y)`
  bilinear in the force loop. Local spacing = `gauge.s / χ^0.35`.
  Not persisted (1–2 s life). `drawChiField()` after ambient.
  Telemetry `#t-chi`; `window.__la.chiStats()` / `emitChi`.
- `state.gaugeWidth: number` — Bennett w‑maxing bookkeeping. The
  current *width* of the compatible‑theta distribution around
  `state.gauge.theta`. When width is wide, the gauge is loosely
  committed (w‑maxing); when narrow, tightly committed. Commit
  thresholds sample from this width, not the mean alone.
- `state.temporalGapMode: "chord" | "arpeggio"` — Bennett's temporal
  gap toggle. Chord fires commits at an instant; arpeggio smears
  each commit visually across N ticks. Simulation is unchanged; only
  the render path branches on this.

Add each to the state shape table above when built. New render layers:

- `drawLightCones()` — between `drawAmbient()` and `drawDust()`,
  translucent circles per mind
- `drawChiField()` — right after ambient, before dust; a low‑res
  bilinear‑interpolated warp of the Voronoi cells' local spacing
- `drawValenceThreads()` — inside `drawMinds()`, seven micro‑lines
  radiating from each mind at different orientations, each with a
  hue mapped from the valence dimension it represents
- `drawTargetMorphology()` — when an animal is damaged, ghost
  outlines at the missing relative offsets showing where the shape
  memory says the missing cells should be
- `drawPredictiveGhosts()` — 2nd‑order‑self prediction of neighbor
  animals for mature animals only

## Update this file whenever

- A file is added or deleted in the repo
- A public function's signature or contract changes
- The render layer order shifts
- A new state field is introduced
- A new external dependency lands
- A new deploy target or env var is added

If you're an agent finishing a change: your commit message should
mention that this file was updated in the same commit, or explain why
it wasn't needed.
