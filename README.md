# Lattice Animal

**A body made of minds — agreement by position, commitment by movement.**

Live: https://latticeanimal-production.up.railway.app

A living tessellation where a hundred independent cell‑minds find each
other through movement alone and lock into a shared polyomino body. Each
mind sees only its Voronoi neighbors and moves according to a local rule.
From no communication, a shared grid emerges; from the shared grid,
animals emerge; from the animals, an ecology.

Built for CIMC's *Lattice Animals* hackathon (Sep 26, 2026, San Francisco).

## What you're watching

- **Colored cells** — every Voronoi region is painted in its mind's tint,
  drawn from the objetd'art tissue palette.
- **Vector cilia** — soft radial hairs plus a directional arrow showing
  the mind's intended next move. A dashed cool arrow shows what the
  mind's neighbor mean *would* suggest — wildly divergent in chaos,
  converging with the tinted arrow as the gauge is negotiated.
- **Ghost‑self dots** — tiny cream points around each uncommitted mind
  mark its top candidate lattice cells. They collapse to one at commit.
- **Cream perimeter** — the outline of every lattice animal, tinted by
  the animal's own hue.
- **Warm filaments** — bonds between adjacent committed minds. These are
  the polyomino's actual edges. Different animals show up as different
  colors from a 12‑hue palette. Opacity and width follow |ΔV| across
  the bond: matched voltage is open; a large drop gates the filament
  shut (Levin gap‑junction conductance).
- **V ring** — a thin teal (hyperpolarized) or coral (depolarized) ring
  on every mind. The telemetry `V` readout is the mean voltage of
  committed cells.
- **Concern blooms** — cool teal/blue clouds at spawn, fission,
  dissolve, merge, and wherever you drop minds. Nearby cells tighten
  their spacing; the shared grid itself does not collapse. Telemetry
  `χ` is the peak of that field.
- **Valence threads** — seven colored spokes on a searching mind.
  At commit they fold into one cream line.
- **W‑max fan** — a cream family of compatible rotations at the
  gauge origin. Wide while the field is still choosing.
- **Light cones** — a cool circle around each searching mind.
  Overlaps glow. A committed body shares one fused cone.
- **Remembered holes** — dashed cells after you take a committed
  square. The body tries to sit someone there again.
- **If the field has to shrink** to stay snappy on a phone, a
  small notice says so. Delaunay is served from this site, not a
  CDN.
- **Narrator pins** — when the verse names an event, a cream
  mark sits on the field at that place. Tap a log line to see
  it again.
- **Birth flash rings** — expanding cream rings when a mind commits. When
  multiple minds commit within the same tick, their rings amplify into a
  brighter *chord* burst (Mind‑Cannot‑Smear‑Across‑Time).
- **Cosmic dust and twinkles** — the medium the minds drift through.

## The living phase

Once ~85% of the field has committed, the ecology takes over:

- **Wander** — an edge cell releases its commit and re‑targets an adjacent
  unoccupied cell, drifting the animal one square across the grid.
- **Spawn** — an edge cell births a new mind at an adjacent unoccupied
  cell, inheriting the parent's animal color as a hint.
- **Fission** — a large animal splits when a bridge cell releases its
  commit.
- **Merger** — a new commit bridging two animals fuses them into one.
- **Dissolve** — an uncommitted mind that's drifted for too long fades
  out over 45 frames.
- **Gauge breath** — the shared rotation slowly drifts, so animals must
  constantly re‑negotiate.

## Ten voiced species

Each animal has a species based on its hue. Ten species are procedurally
voiced with Web Audio — no audio files ship with the site.

| Species | Hue | Voice |
| --- | --- | --- |
| Lion | salmon | sawtooth roar with 22 Hz growl LFO |
| Parakeet | cyan | 5‑note triangle trill |
| Wolf | periwinkle | sine howl gliding 500→190 Hz |
| Elephant | azure | brass‑bandpass trumpet |
| Whale | orchid | 180→140 Hz sine song with 3 Hz FM |
| Frog | spring | 2–3 low square ribbits |
| Owl | mint | two soft sine hoots |
| Dolphin | amber gold | high descending click |
| Cricket | lemon | 4 tight ~5 kHz pulses |
| Sparrow | lilac | 3‑note triangle warble |

Rose and ember hues stay silent — the quiet species. Sounds trigger on
commit (after the mind has a color), growth, merger, fission, death,
a walk, and a living-phase call every few seconds so a saved field
still has a voice. Tap once so the browser will let the field speak.

## Controls

- **Space** or the ⏸ button — pause / resume
- **R** or the ↻ button — reseed a fresh field
- **M** or the speaker button — mute / unmute (persisted in localStorage)
- **Tap / click** — drop three minds at that point (a glass chord;
  a still tap also shows the mind's blurb, including on a phone)
- **Drag** — paint a trail of minds. The field plucks a quiet grain
  under your finger. Pitch follows where you are.
- **Hover a mind** — quick blurb of what it's doing and its species
- **Long‑press a committed cell** — take it; the body tries to grow
  the remembered shape back
- **A** or the three‑bar button — chord vs arpeggio (look only)
- **Narrator → inhabitants** — bias births toward a morphospace shape
- **?** — open the full explainer
- **H** or **⌇** — hide or show the legend and telemetry (persisted)

## Theory sources

The demo weaves in ideas from a survey of CIMC research documents:

- **DVFP (Dynamical Voronoi Fokker‑Planck)** — the dual‑vector display of
  neighbor‑mean direction vs. actual velocity is a direct rendering of
  the paper's central measurement.
- **Mind Cannot Smear Across Time** — chord vs. arpeggio commit
  interference on the birth‑flash rings.
- **Learning When Not To Act** — the field's periodic quiet stillness
  before the living phase.
- **Geometric Meaning and Agency** — the ghost‑self rosette that
  collapses into a single chosen cell at commit.
- **Solving a Million‑Step LLM Task with Zero Errors (MAKER)** — the
  bookend captions that state the demo's own philosophy.
- **First‑Order Self / Tapestry of Valence / Ensemble Uncertainty** —
  drives the per‑animal color palette and the delayed‑response cues on
  neighbor‑caused vs. self‑caused motion.

## Stack

- Vanilla ES modules, no build step
- `d3-delaunay` (loaded from a CDN) for Voronoi
- Web Audio for procedural species voices
- `express` + `compression` — served statically
- Deployed on Railway (`node server.js` at `$PORT`, `/healthz` for the
  health check)

## Running locally

```bash
npm install
npm start
# → http://localhost:3000
```

Fresh icons and OG image are generated from a P‑pentomino source SVG:

```bash
node scripts/build-icons.mjs
```

## Iteration roadmap

Each mind has two clocks. A 47-neuron heading circuit loops on the page.
A slower thought — 754 neurons, 7200 synapses from `male-cns:v1.0` —
stays quiet through page load and the opening, then one HTTP letter
every four seconds from a Modal L4 writes a readout into voltage. The
GPU scales to zero when nobody is looking. A held websocket would keep
it billed. Recompile the small motif with
`python3 scripts/compile-fly-cx.py`; the deep one with
`python3 scripts/compile-fly-deep.py`. Deploy the mind with
`modal deploy modal_mind/app.py`.

## Deploy

Push to `main` autodeploys. Railway's GitHub App is sourced to
`jawauntb/lattice-animal@main`. A mapvest-style webhook fallback lives
in `.github/workflows/deploy.yml` if `RAILWAY_WEBHOOK` is set. See
`docs/railway-autodeploy.md`.

Env vars and API keys land through Doppler (`jawaun-personal` shared
config) as they're introduced.

## Acknowledgements

- Aesthetic borrowed from [objetd'art](https://objetdart-production.up.railway.app/) —
  tissue, cells, stars, interference, quarks, atoms, dna.
- CIMC and the *Lattice Animals* hackathon frame.
- Anthropic Claude Code for the pair‑coding.
