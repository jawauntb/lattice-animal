# Instructions & Inspiration

*For humans and future agents, so you can pick up this repo, feel the
intent underneath it, and extend it without breaking its soul.*

Live: https://latticeanimal-production.up.railway.app
Source: https://github.com/jawauntb/lattice-animal
Owner: Jawaun Brown (`jawaun.brown95@gmail.com`)

---

## What this is

A live browser demo for CIMC's **Lattice Animals** hackathon
(Sep 26, 2026, San Francisco):

> A lattice animal is a creature made of grid cells. This month, we make
> the name literal.
>
> Each participant brings a mind for a single cell, and single cells
> don't count. To exist, an animal needs several minds to find each other
> and agree on a form with no channel but movement, no commitment but
> position.
>
> Your job is to build a mind worth agreeing with.

This site is Jawaun's *mind worth agreeing with*, at demo scale — a field
of ~100 independent minds that see only their Voronoi neighbors, propose
a local gauge (spacing + rotation) from those neighbors' positions,
snap toward the nearest lattice cell of the shared gauge, and — over
about thirty seconds — self‑organize into a body of connected
polyominoes. After the initial commitment arc the field enters a *living
phase* where animals wander, spawn, split, merge, and die indefinitely.

## Why it matters

The demo is a small, honest instance of what Markus Buehler has been
calling **recursive meta‑intelligence**:

> A representation becomes an instrument, the instrument becomes an
> executable world, and that world becomes the substrate for further
> intelligence. Intelligence then grows by constructing new spaces to
> think in.

The Voronoi tessellation isn't decoration — it *is* the sensor: each
mind's Voronoi neighbors are literally what it perceives. The gauge
isn't given from outside — it's a running mean of every mind's proposal.
The lattice animal isn't hand‑drawn — it's the observed connected
component of committed minds on the shared grid.

Every visual is a **fiber** of the lattice animal invariant. If you
extend this project, keep that. If a new mechanic can't be expressed as
"this mind is a real cell that respects the shared gauge and might bond
to a 4‑adjacent neighbor", it doesn't belong here.

## The aesthetic north stars

Everything visual here draws from Jawaun's own gallery,
[objetd'art](https://objetdart-production.up.railway.app/):

| Page | What we borrow |
| --- | --- |
| **/tissue** | Colored translucent Voronoi cells, cream connective fibers between neighbors, the "tissue palette" (amber, teal, blue, coral, cream), the whole "field of jewel‑toned cells with a shared perimeter" vibe |
| **/cells** | Nuclei with a warm inner glow, tiny organelles orbiting inside committed cells, soft radial cilia that sway when free and reach when settled, wispy hair‑like edges |
| **/stars** | The cosmic ground — deep midnight blue, drifting dust, twinkles, subtle warm ambient radial gradient behind bodies, the sense of a living cosmos |
| **/waves** | Soft translucent layered forms, gentle overlapping ellipses (used for the animal halos) |
| **/interference** | (Not yet borrowed, but on the list) — patterns that emerge from overlapping waves |
| **/quarks, /atoms, /dna** | Reference for interaction paradigms — pluckable filaments, particle interactions, structure that responds to touch |
| **/light** | The `Listen` button pattern — turn on a soundscape that plays music from what's on screen |

The visual language rule is simple: **cool, luminous, tissue‑palette on
deep cosmic dark; no brown/beige/generic warm slop**. If a design draft
looks like a generic Claude gradient, throw it out.

Reference the Mathelirium / general‑relativity animation for the "space
itself is warped by presence" feeling around each animal.

## Research inspiration

Jawaun's own writing is under `~/Metaphysics of Intelligence/`. The
demo already carries deliberate borrows from:

- **DVFP (Dynamical Voronoi Fokker‑Planck)** — the Voronoi field, the
  gauge negotiation, and the dashed cool arrow showing the neighbor‑mean
  direction diverging from and then converging with the mind's actual
  velocity. This is the paper's central measurement (r≈0.10 between
  neighbor mean and next step) rendered as a live visual.
- **Mind Cannot Smear Across Time** — the *chord vs. arpeggio*
  amplification on the birth‑flash rings. Multiple minds committing in
  the same tick merge into a brighter combined ring; staggered commits
  stay separate. Consciousness papers argue a bound moment requires true
  co‑instantiation.
- **Learning When Not To Act** — the "structural pause" (fixed‑duty‑cycle
  stillness in the global breath) rather than a learned pause; the
  paper's finding that scheduled anchoring beats learned selection.
- **Geometric Meaning and Agency** — the ghost‑self rosette (weighted
  candidate lattice cells around each uncommitted mind) that collapses
  into a single chosen cell at commit. Existential symmetry‑breaking as
  a visible collapse.
- **MAKER — Solving a Million‑Step LLM Task with Zero Errors** — the
  bookend captions ("no mind sees the whole — only its neighbors" /
  "not from a smarter mind, but from enough of them checking each
  other") in the demo's own words.
- **First‑Order Self / Tapestry of Valence / Ensemble Uncertainty** —
  the per‑animal color palette (each body speaks with its own hue), the
  delayed vs. instant response cues on neighbor‑caused vs. self‑caused
  motion, and the "almost‑minds" that track only one concern and never
  commit.
- **Structural Intelligence / Alignment as Ensemble Governance** — the
  frame that intelligence lives in the shared substrate, not in any one
  mind.
- **Buehler, "Recursive Meta‑Intelligence"** — the guiding
  representation → instrument → world → substrate loop.
- **Looped Transformers / Nanbeige‑4.2** — the next‑frontier idea: reuse
  the same tiny per‑mind policy K times per tick for extra cognitive
  depth without more parameters.
- **Janelia + Google male CNS connectome (166,700 neurons, 125M
  synapses, gs://flyem‑male‑cns, open on GitHub)** — the substrate for
  the "each mind runs a real fly‑wired circuit motif looped K times"
  frontier.

## The core mechanic (never break this)

Every mind has exactly one channel and one commitment:

- **Channel: movement.** A mind's only output is where it moves next.
- **Commitment: position.** A mind's only signal to others is where it
  is on the shared plane.

Every mind sees exactly one thing:

- **Sensor: its Voronoi neighbors' positions.**

From those positions each mind proposes a local gauge:

- **spacing** = median distance to its neighbors, clamped
- **rotation** = dominant 4‑fold orientation of its neighborhood
- **neighbor‑mean direction** = an EMA of Σ neighbor displacements

The global gauge is the mean of proposals. Each mind is pulled toward
the nearest lattice cell of the current gauge. When it stays there long
enough it commits. Two 4‑adjacent committed minds form a bond. A
connected component of ≥2 committed minds is a *lattice animal*.

That's the whole invariant. Every visual, sound, and interaction here
is a rendering of some fiber of this invariant. Keep it that way.

## The visual language, at a glance

- **Colored Voronoi membranes** — each mind paints its cell in one of
  four tissue tints (amber, teal, blue, coral) as a personality
- **Ghost‑self rosette** — faint cream dots around each uncommitted mind
  marking candidate cells
- **Vector cilia** — soft radial hairs on every mind + a tapered arrow
  showing its intended velocity
- **Dashed cool arrow** — the neighbor‑mean direction, wildly divergent
  in chaos, converging with the velocity arrow at commitment
- **Cream perimeter** — outline of every lattice animal, tinted by the
  animal's own hue
- **Warm filaments** — bonds between adjacent committed minds, colored
  by the animal's hue
- **Birth‑flash rings** — expanding cream rings when a mind commits,
  amplified when multiple commits are chord‑simultaneous
- **Cosmic ground** — deep midnight blue radial with drifting dust and
  4‑point twinkles

## The ten voices (each lattice animal has a species)

Mapped to ten of the twelve `ANIMAL_HUES`. Rose and ember are the
"quiet species." All voices are procedurally synthesized in
`public/audio.js` — no audio files ship with the site.

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

Events → sound: commit (soft), growth milestone (full‑voice), merger,
fission (startled), death (fading tail). Throttled per species.

## Design principles (bake into every change)

1. **Every configuration must still be a real lattice animal** — no
   mechanic that lets a mind exist off‑grid.
2. **Nothing static.** The field never stops moving. If everything
   settles, life mechanics kick in.
3. **No brown/beige/generic warm slop.** Cool luminous cosmic + tissue
   palette. Warmth only as accent from committed cells and animal auras.
4. **Mobile first, always.** Every control needs to work on touch too.
   Chrome collapses on narrow viewports; a ⌇ button reveals it.
5. **The interface is quiet.** Chrome fades away; the field is the
   subject. Legend, telemetry, and the narrator drawer all sit in
   translucent glass panels behind the field.
6. **Narrator explains for non‑researchers.** The bottom line shows the
   current event; the drawer expands into full plain‑language
   commentary. Assume the viewer is smart but has never heard of DVFP.
7. **Depth without UI complexity.** New ideas should compose with the
   existing visual language rather than add new screens.
8. **Ship fast.** Commit early and often. Push to `main`. Auto‑merge is
   fine — this is Jawaun's repo and the demo is the primary artifact.
9. **Always update the README, the SYSTEM_DESIGN.md, and this file**
   when the mechanic or the vibe changes.

## The vision (the north star)

> People should feel like they've stumbled on alien life forms and want
> to watch and play for hours on end.

Concretely: click‑to‑isolate a single animal like a specimen, generative
music from bond formation ("listen mode"), hover blurbs on every mind,
per‑species voices, wander/spawn/fission/dissolve/merge as an ongoing
ecology, and eventually — each mind's policy is a small loopable fly
connectome subgraph so the animals *actually think*.

## The bro voice

Jawaun's global `CLAUDE.md` requires every user‑facing reply to end with
a short "Bro" section — 1‑3 plain sentences restating what was just
said, no jargon, like one human talking to another. It's not a
formality; it's the tone check on every message.

## Related repos and resources

- `~/objetdart_proj/` — the aesthetic source; look here first for
  interaction and visual ideas
- `~/Metaphysics of Intelligence/` — Jawaun's own writing that seeds
  every structural decision
- `~/Downloads/dvfp_fokker_planck.pdf` and the other PDFs Jawaun
  attached — the theory that shaped the visuals

## Doppler & credentials

When a feature needs a secret (Modal, OpenRouter, HuggingFace, etc.),
pull from Doppler:

- Personal keys: `jawaun-personal` shared config
- Research keys (Modal, HF Inference, etc.): `research_derived_experiments`

Nothing here currently needs a key — everything is client‑side. The
first thing that will is the fly‑connectome inference path.

## The commitment

If you're an agent picking this up: your job is not to *replace* Jawaun's
taste; it's to *serve* it. When in doubt, pause and ask, but ship
biased toward the vision above.
