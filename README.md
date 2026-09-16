# Lattice Animal

**A body made of minds — agreement by position, commitment by movement.**

Live: https://latticeanimal-production.up.railway.app

A living tessellation where a hundred independent cell‑minds find each
other through movement alone and lock into a shared polyomino body. Each
mind sees only its Voronoi neighbors and moves according to a local rule.
From no communication, a shared grid emerges; from the shared grid,
animals emerge; from the animals, an ecology. A compiled fly heading
circuit thinks inside each cell. Once a body exists, that thought walks
the polyomino as a traveling wave — analog add and cancel at the seams.

Built for CIMC's *Lattice Animals* hackathon (Sep 26, 2026, San Francisco).

**Share this.** Live demo first. Then this README. Architecture and
limits: [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md). Vision and citations:
[`INSTRUCTIONS_AND_INSPIRATION.md`](INSTRUCTIONS_AND_INSPIRATION.md).
Source: [jawauntb/lattice-animal](https://github.com/jawauntb/lattice-animal).

## How it works

Nothing talks. A mind sees only the Voronoi neighbors around it and
moves. From those positions it proposes a spacing and a rotation. The
shared *gauge* is the running mean of those proposals. A mind that stays
on one cell of that gauge long enough *commits*. Two 4‑adjacent
committed minds are an animal — a real polyomino, not a drawing.

After that the field does not freeze.

1. **Voltage *V*** — each mind carries a concern scalar. It leaks toward
   the mean *V* of committed neighbors (Levin gap junctions). Bonds
   brighten when |ΔV| is small and dim shut when the drop is large.
2. **Concern field *χ*** — spawn, fission, merge, and your tap leave a
   cool bloom. Nearby cells tighten their spacing. The global grid does
   not collapse.
3. **Fly circuit** — a 47‑neuron heading motif from the Janelia male CNS
   (EPG / PEN / PEG / Delta7) loops *K* times on the page and writes a
   bump into that cell's *V*. A slower 754‑neuron / 7200‑synapse thought
   on one Modal L4 waits through page load, then writes a letter every
   four seconds. The GPU scales to zero. The page never waits.
4. **Traveling waves** — that heading bump leaves the cell and walks the
   animal (Miller, Brincat & Roy 2026, *Analog Cognition and
   Consciousness*). Slow *beta* is the stencil: memory, species clock,
   what the body is holding. Faster *gamma* is the edge report, allowed
   only where beta is open. Cool pearls ride the gold bonds. Telemetry
   `wave` is mean beta coherence across animals.
5. **Seams compute** — where two animals touch, the waves add or cancel.
   Add + a size/coherence edge: the larger body writes its color and
   voltage into the smaller one. The cells stay on the grid. Only the
   lineage changes. That is eating. Cancel: a neck cell lets go. That is
   competing. When one pattern holds a body of five or more, the
   predictive ghosts reach farther. That is the higher‑order animal —
   not more cells, one wave.

Every state is still a lattice animal: cells on a shared gauge, bonded
4‑adjacent. Waves do not take anyone off the grid.

## Numbers on the page

| Key | Meaning |
| --- | --- |
| minds | candidate cells |
| committed | locked to the shared gauge |
| animals | separate 4‑connected bodies |
| largest | cells in the biggest body |
| entropy | mean offset from the assigned cell (0 is still) |
| V | mean voltage of committed minds |
| χ | peak of the concern field (1 when quiet) |
| width | how wide the compatible rotation family still is |
| loop | mean times the fly circuit is reused this tick |
| think | `opening` (no GPU yet), `L4 N` (a letter landed), or `local` |
| wave | mean beta coherence. Near 1, one pattern holds the body |

## What this is not

- Not a genome. Species are causal clocks and voices, not Darwinian
  evolution.
- Not predation off the grid. Eating rewrites lineage. Competing opens
  a neck. The squares stay.
- Not a server world. Persistence is `localStorage` on this browser
  (`la:field:v3`, about three days). The animals do not keep living
  on Railway while you are away.
- Not a full human connectome. Two compiled fly motifs (47 and 754
  neurons) from Janelia `male-cns:v1.0` (CC‑BY).

## What you're watching

- **Colored cells** — every Voronoi region is painted in its mind's tint,
  drawn from the objetd'art tissue palette. Committed cells carry a
  baked nacre sheen (one 96px tile per hue, reused as a pattern).
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
  shut (Levin gap‑junction conductance). A cool pearl rides each bond
  when a traveling wave is walking the body.
- **Traveling waves** — the fly heading bump leaves the cell and walks
  the polyomino (Miller, Brincat & Roy 2026). Slow *beta* is the
  stencil; faster *gamma* is the edge report. At a seam they add
  (one lineage writes its voltage into another) or cancel (a neck
  lets go). Telemetry `wave` is mean beta coherence.
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
- **Eat** — constructive waves at a seam rewrite the smaller animal's
  lineage. Same squares, new voice.
- **Compete** — destructive waves open a neck. One body becomes two.
- **Integrate** — high beta coherence on a body of five or more. The
  wave has found one animal.
- **Dissolve** — an uncommitted mind that's drifted for too long fades
  out over 45 frames.
- **Gauge breath** — the shared rotation slowly drifts, so animals must
  constantly re‑negotiate.
- **Persist** — the field snapshots to `localStorage` so a refresh
  keeps the animals for up to three days. **R** clears the save.

## Ten voiced species

Each animal has a species based on its hue. Ten species are procedurally
voiced with Web Audio — no audio files ship with the site.

| Species | Hue | Voice | What it causes |
| --- | --- | --- | --- |
| Lion | salmon | sawtooth roar | depolarizes neighbors; fastest wave |
| Parakeet | cyan | triangle trill | spawn bias, encroaches |
| Wolf | periwinkle | sine howl | long‑range V matching |
| Elephant | azure | brass trumpet | anchors neighbors' V |
| Whale | orchid | low sine song | slow synchrony; slowest wave |
| Frog | spring | square ribbits | rhythmic V pulse |
| Owl | mint | soft hoots | settles seekers faster |
| Dolphin | amber gold | descending click | fastest neighbor scan; deepest K |
| Cricket | lemon | high pulses | raises the V noise floor |
| Sparrow | lilac | triangle warble | brief coordination bursts |

Rose and ember hues stay silent — the quiet species. Same fly weights;
the species clock is how often those weights return.

Sounds trigger on commit (after the mind has a color), growth, merger,
fission, death, a walk, and a living-phase call every few seconds so a
saved field still has a voice. Tap once so the browser will let the
field speak.

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
- **H**, the stacked-lines button in the top cluster, or **⌇** — hide
  or show the legend and telemetry (persisted). The verse updates with
  the field instead of waiting a few seconds.

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
- **Levin, Ingressing Minds / planarian bioelectric memory** — *V*,
  voltage‑gated bonds, remembered holes, regeneration toward a shape.
- **Miller, Brincat & Roy 2026, Analog Cognition and Consciousness** —
  traveling beta/gamma on the polyomino; analog add and cancel at the
  seam; a globally integrated wave as the higher‑order body.

## Stack

- Vanilla ES modules, no build step
- `d3-delaunay` from `public/vendor/` (no CDN on the hot path) for Voronoi
- Web Audio for procedural species voices
- `express` + `compression` — served statically
- Deployed on Railway (`node server.js` at `$PORT`, `/healthz`)
- Optional Modal L4 behind `/think` (`THINK_URL`, `THINK_TOKEN`)
- Persistence: browser `localStorage` only (`la:field:v3`)

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
