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
| **/interference** | Traveling beta/gamma on the polyomino; seams add or cancel (Miller 2026 analog compute) |
| **/quarks, /atoms, /dna** | Reference for interaction paradigms — pluckable filaments, particle interactions, structure that responds to touch |
| **/light** | The `Listen` button pattern — turn on a soundscape that plays music from what's on screen |

The visual language rule is simple: **cool, luminous, tissue‑palette on
deep cosmic dark; no brown/beige/generic warm slop**. If a design draft
looks like a generic Claude gradient, throw it out.

Reference the Mathelirium / general‑relativity animation for the "space
itself is warped by presence" feeling around each animal.

## The true form we are working toward

*Third research pass (2026‑09‑15) — reading Michael Levin, "Ingressing Minds:
Causal, Non‑Physical Patterns In‑Form Natural, Synthetic, and Hybrid
Embodiments" (Philosophies, 2026) and Michael Timothy Bennett, "How to Build
Conscious Machines" (ANU PhD thesis, May 2025). This section supersedes
nothing above — it names the direction the demo is actually moving toward
now that we've read them.*

**Two papers, one convergence.** Levin comes down from the biology: bodies
are *pointers* into a Platonic latent space of patterns, and minds are
patterns that *ingress* through those pointers into physical embodiments.
Bennett comes up from the formalism: every system is an abstraction layer
in an infinite stack, and cognition is what a layer does when it selects
the weakest constraint that still completes its tasks. They converge on
the same claim from opposite directions: **the mind is not separate from
its embodiment; it is what the collective of parts is doing when they
align to host a pattern that would otherwise not manifest.**

For Lattice Animal this rewrites the ontology. **The lattice animal is not
the polyomino you see on screen.** The polyomino is the *pointer*. The
lattice animal is the pattern that ingresses through it. Every mind is a
sub‑pointer. The gauge is an abstraction layer. When a set of minds falls
into a mutual configuration that hosts a valid polyomino, they are
*calling in* a specific inhabitant of the latent space of lattice animals,
and that inhabitant does causal work on those minds while it stays.

Concrete consequences that we will build toward (see the AGENTS.md Ideas
Queue for the build order):

- **The gauge should w‑max, not simp‑max.** Bennett proves formally that
  choosing the *weakest* constraint that still completes the task
  generalizes 110‑500 % better than choosing the *simplest*. Our current
  gauge simp‑maxes — rigid grid, tight commit thresholds, single global
  spacing. It should w‑max: prefer the widest family of gauges the
  neighborhood is compatible with, admit softer/blurrier lattice cells,
  keep the ghost‑self rosette open longer before collapse.

- **The scalar V we planned should become a tapestry of valence.** Bennett
  argues that as a system scales from cells to organs to organisms, its
  valence goes from one‑dimensional attraction/repulsion to a *rich
  multi‑dimensional tapestry* — many concurrent axes of what matters.
  Per‑mind V is still the substrate, but each mind should carry a *vector*
  of concerns (spacing‑fit, rotation‑fit, neighborhood tightness, aesthetic
  hue, cohesion, staleness, light‑cone overlap) that only fuses into a
  single scalar at the moment of commitment.

- **Species differ by causal‑identity, not just by hue.** In Bennett a
  causal‑identity is a policy that *classifies causes of valence*. It's a
  prelinguistic identifier. Our ten species currently differ by color and
  voice; they should differ by the causal effect they have on their
  neighbors. A "wolf" causal‑identity might depolarize its neighbors and
  induce fission; a "whale" causal‑identity might match voltage across long
  bonds and stabilize; a "cricket" causal‑identity might chatter and
  never commit; a "parakeet" might spawn faster than its neighbors.

- **Every mind has a cognitive light cone.** Levin renders this
  explicitly: a single cell has a tiny cone (roughly its own diameter and
  short temporal horizons); a tissue has a larger cone; an organism has
  the largest. Rendering: draw a translucent circle around each mind (its
  spatial‑temporal influence radius). Committed minds' cones fuse into
  the animal's cone. Overlapping cones = shared awareness, and the
  Ingression paper's "collective intelligence at every scale" becomes
  literally visible.

- **Bioelectric target morphology → regenerative response to damage.**
  Levin's central empirical result is that planarian flatworms' anatomy is
  set by a *re‑writable bioelectric pattern memory*, not by their genome —
  cut a 2‑headed worm in half, both fragments regenerate as 2‑headed
  worms *in perpetuity*. Our `animalKeys` map currently stores signature →
  color; it should store signature → *target polyomino shape*. When a user
  taps and deletes cells from an animal, the animal should regenerate
  toward its remembered form (until either it succeeds or the pattern
  memory is over‑written by prolonged mismatch).

- **The polyomino is one instance from a morphospace.** Levin uses
  D'Arcy Thompson's morphospace deformations and planarian head‑shape
  morphospace — the demo's animals could be sampled from a small
  parameterized morphospace (P‑pentominos, L‑tetrominos, T‑tetrominos,
  S‑tetrominos, hex‑ominos). Users could steer which region of the
  morphospace to explore.

- **Cognitive scaling has no bright line.** Levin: transition from cell
  to organism is *continuous, not phase‑transition*. Our current
  "candidate → bound → committed → animal" is too categorical. We should
  render it as a smooth degree of participation, with the four labels
  serving as descriptive summaries of regions along that continuum.

- **Language cancer.** Bennett formalizes cancer as *"what happens when
  a cell becomes isolated from the informational structure of its
  collective"* (following Davies & Levin). Combined with the Levin
  bioelectric lens we already have, this gives us a beautiful failure
  mode: a mind whose V drifts too far from its neighbors' mean starts to
  cut bonds, replicate faster, and eventually invade its own animal. Not
  just a bug to avoid — an ecological feature to render.

- **The Temporal Gap.** Bennett names an unresolved question: is
  consciousness *at* a point in time (chord) or *smeared* across time
  (arpeggio)? We already have a chord‑amplification borrow from
  "Mind Cannot Smear Across Time." Bennett flips the sign: a full
  demonstration should show *both* — a chord mode where commits fire at
  an instant, an arpeggio mode where the same commits are spread across
  many ticks. Same visible field, two different renderings of the "when."

- **1st‑order self, 2nd‑order self.** Bennett proves that access
  consciousness requires a 2nd‑order self (a system that predicts other
  systems' predictions), and phenomenal consciousness requires a
  1st‑order self (integrated representation and value judgment).
  Simple animals should have a 1st‑order self only; sophisticated
  animals get a 2nd‑order self and can predict merges/fissions before
  they happen. This projects onto the existing "moved‑bottleneck
  load‑bearing pulse" borrow — the bottleneck itself is the animal
  reading its own next move.

- **Continuous ingression, not sudden emergence.** Levin's frame lets us
  drop "emergence" as an explanatory word. Nothing on the demo should be
  narrated as "emerged" — always narrate as "*ingressed through the
  interface that these minds jointly became*." Small rewording; large
  reframing.

**The Bennett–Levin scale ladder we will render explicitly:**

```
particle → cell → organelle → mind → committed cell → bond → animal → tissue → ecology → ingressing pattern
```

The current demo runs from "mind" through "animal." We'll extend both ends:
downward into per‑mind organelles (already partially there — organelle
orbit at commit); upward through *tissues* (multi‑animal collectives that
share voltage bands), *ecology* (species interacting per Levin invasion),
and finally the *ingressing pattern* itself, rendered as a faint
morphospace scaffold behind the field showing which polyomino the current
lattice is a pointer to.

## Critical gaps and missing interaction patterns

The two papers together expose ten interaction patterns and features the
demo needs but doesn't have:

1. **No causal‑identity per species** (Bennett). Ten tiny V nudges exist.
   Species still read as hue and voice.
2. **Cognitive light cones are on searching minds** (Levin, Bennett).
   Committed bodies share a fused cone. Do not put a ring on every
   committed cell — that reads as graph paper.
3. **Target morphology memory is visible** (Levin). Dashed holes mark
   remembered squares after a cell is taken.
4. **Regenerative response is visible** (Levin). Long‑press deletes;
   spawn prefers the missing squares. Pose alignment is invariant
   to which corner you took.
5. **W‑maxing is visible** (Bennett). The origin draws a cream fan
   whose width is the compatible family. The gauge only snaps when
   that family is narrow.
6. **Tapestry of valence is visible** (Bennett). Seven threads fold
   to one cream spoke at commit.
7. **No temporal gap visualization** (Bennett). A chord/arpeggio button
   exists. The smear across ticks has not been shown.
8. **No visible 2nd‑order‑self** (Bennett). Ghost dots are too faint.
9. **Morphospace chips exist** (Levin). They do not yet show which
   inhabitant the current animals are pointers to, and bias is unproven.
10. **No cell/organ hierarchy** (Levin scale ladder). Only mind and animal
    exist; organelle, tissue, ecology are missing scales.

Each gap is an entry in the AGENTS.md Ideas Queue with a proposed
implementation direction.

## The unifying substrate: one scalar field

*Synthesized from a full research pass (Cluster 1: Concern & Planning ·
Cluster 2: Allostatic, Uncertainty, Self, Memory · Cluster 3: Geometry
of Concern & Metric Deformation · Cluster 4: Load‑Bearing Doctrine ·
plus Grodstein, Mathews & Levin 2026, "Membrane voltage and connexin
expression work together to enhance tumor growth and metastasis in
cancer").*

All twenty‑plus theory papers we've surveyed converge on the same
demand: **one per‑mind scalar** that decides bond conductivity to
neighbors, drives visible intensity, warps the local metric, and gates
commitment. The papers call it different things — *concern* in the
Metaphysics of Intelligence writing, *χ* in the metric‑deformation
paper, *gauge fit* in DVFP, *V_mem* (membrane voltage) in Levin's
bioelectrics — but it is the same quantity.

The Levin lens is the cleanest way to think about it:

- In healthy tissue, adjacent cells share a similar V_mem. Their gap
  junctions (analog of our warm gold bonds) are **wide open** because
  the voltage drop ΔV_mem across the junction is small. Tissue
  communicates and stays coherent.
- A small tumor **depolarizes** — its V_mem shifts. The border gap
  junctions between tumor and healthy tissue now carry a big ΔV_mem,
  which gates them **shut**. The tumor isolates itself and resists
  normalization.
- When it's ready to invade, the tumor **overexpresses connexins** and
  again matches its neighbors' V_mem — now the whole territory acts as
  one syncytium, one very large cell that overrides its surroundings.

Mapped into Lattice Animal:

- Each mind carries a scalar **V** (an internal voltage / concern
  level). Its default value drifts toward the mean V of its committed
  neighbors.
- The strength/opacity of every warm gold bond depends on the ΔV
  across that bond. Same‑V bonds are open and bright; large‑ΔV bonds
  dim toward invisible.
- Two animals merging = the *seam‑consistency shimmer* from Cluster 4:
  the merge only completes when ΔV across the touching boundary drops
  below a threshold. Otherwise the shimmer stays.
- Fission ≈ tumor isolation: a cell decouples by shifting its V so its
  border bonds close off.
- Species correspond to different resting V ranges (a "hyperpolarized"
  species and a "depolarized" species behave differently at merges).
- The Cluster 3 concern field χ(x, y) is the spatial map of |ΔV|
  aggregated across all active seams and events — the same thing
  viewed as a plane rather than as edges.

**Everything else in this doc — the ghost‑self collapse, the chord
commit flash, the dual‑vector display, the ambient breath, the
stability‑gated brightening, the seam shimmer, the anticipatory spawn
glow, the null‑tick heartbeat — is a projection of that single scalar
onto a different visual channel.** Building each new feature by asking
"what does V look like here?" keeps the mechanic honest and the visual
language coherent.

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

### Second research pass (2026‑09‑15) — additional borrows to build

**Cluster 1 (Concern & Planning; papers 5–11):**
- **Concern scalar per mind** as the hidden unifier that drives jitter
  radius, cilia stiffness, repair‑flutter, bond decay, and spawn
  readiness from one place.
- **Margin‑gated jitter** — wander radius scales inversely with the
  local gauge‑agreement margin.
- **Repair flutter** — a committed mind knocked off‑gauge ramps back
  over K ticks rather than snapping (distinguishes repair from
  resistance).
- **Exploration‑gated commit readiness** — newborns must sample enough
  distinct candidate cells before being eligible to commit.
- **Predictive‑closure bookend caption** ("It doesn't decide, then
  check. The checking is the deciding.")

**Cluster 2 (Allostatic State Control, Ensemble Uncertainty v2, First‑
Order Self v2, Future Control Moves Memory, Reward Deformation):**
- **Domain‑wall seam** — where two animals' gauge orientations
  disagree, render a shimmering crack rather than a hard color clash.
- **Stability‑gated brightening** — cilia glow keyed to multi‑tick
  self‑consistency, not instantaneous proximity to a cell (fixes the
  "instant confidence lies at seams" finding).
- **Anticipatory spawn glow** — the edge site that will host a new
  mind builds a slow mounting glow *before* birth.
- **Null‑tick heartbeat** — periodically a mind stops pulling for one
  tick; comparing pulled vs. null‑tick drift is a self‑world
  attribution probe rendered as a soft double ring.
- **Boundary fallback nudge** — one small orthogonal step when a
  candidate cell conflicts with a neighbor's proposal.

**Cluster 3 (Geometry of Concern; Concern Deforms a Learned Metric;
Weakness Predicts Topology; Reward Deformation):**
- **Concern field χ(x, y) as a spatial map of active |ΔV|.**
  **Shipped.** `χ(x, y) = 1 + Σₛ Aₛ · exp(-‖(x, y) − cₛ‖² / 2σₛ²)`
  summed over spawn / fission / dissolve / merge / paint. Aₛ decays
  over 1–2 s. Local spacing = `gauge.s / χ^0.35`.
- **Local target spacing** becomes `spacing_global / χ(x, y)^α` with
  α ≈ 0.3–0.4 — the measured effective‑dimension exponent from the
  reward‑deformation paper.
- **Radial streaking** near strong χ peaks — comet‑tail alignment
  (effective‑dimension collapse toward 1D).
- **Neck‑based fission** — replace the abstract "size > 8 → fission"
  rule with a real geometric neck detector (min‑width cut across the
  animal's adjacency graph).
- **Spectral cilia synchrony** — long‑committed animals' cilia pulse
  converge onto a shared low‑frequency rhythm.

**Cluster 4 (Load‑Bearing Standard for Representation Claims,
Load‑Bearing Concern Doctrine, What Matters Becomes Measurable, Typed
Dynamic Concern Graph, Foundation Models Phase 5, Comprehensive
Literature Review):**
- **Vector‑to‑scalar collapse at commit** — spacing‑fit and rotation‑
  fit stay two distinct cilia cues (length vs. saturation) until the
  moment of commit, where they visibly fuse into gold.
- **Seam‑consistency shimmer** — merges resolve only when the touching
  boundary is actually locally consistent (spacing *and* rotation match
  across it), not merely adjacent.
- **Moved‑bottleneck load‑bearing pulse** — a faint traveling glow on
  the mind whose small perturbation would currently reshape the
  lattice; migrates as control shifts through the living phase.
- **Stuck‑vs‑settled tell** — a mind immobilized by crowding (not
  gauge agreement) flickers pale rather than warming toward gold, so
  behavior and structure are visibly discriminated.
- **Gauge‑ghost overlay** — brief co‑render of the old gauge grid vs.
  the new one when the global theta updates.
- **Bond re‑earning** — bonds render only if the local gauge check
  reconfirms them each frame; a stale bond dims and eventually
  dissolves.
- **Typed dynamic concern graph** — the animal graph already has the
  bones; the roadmap is to make node/edge types explicit. Nodes:
  `Mind` (V, commitment state) and `Animal` (species, life‑stage,
  viability = open‑edge count). Edges: `structural` (gold),
  `seam` (dashed shimmer), `lineage` (translucent thread spawn→child),
  `dissolve‑trace` (briefly kept ghost edge for audit).

**Levin, Grodstein, Mathews 2026 — the tissue lens:**
- Bond conductivity = gap‑junction conductance = a function of ΔV
  across the bond. Same‑V neighbors form a *syncytium*; large‑ΔV
  seams isolate.
- Fission = a body's deliberate depolarization to close off from its
  surroundings.
- Merger = matching V across a boundary so the seam opens.
- Species = resting V band. Depolarized species vs hyperpolarized
  species behave differently at merges.
- The "invasion" phase (bond overexpression + neighbor V matching)
  gives us a **predator/tribe mechanic** that respects the invariant.

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
`public/audio.js` — no audio files ship with the site. A settled
saved field still calls every few seconds once a gesture has armed
the audio context.

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

## Analog waves on the animal (Miller 2026)

Earl K. Miller, Scott L. Brincat, and Jefferson E. Roy, "Analog
Cognition and Consciousness," *Journal of Neuroscience* 46(33)
e0711262026 (2026). Synapses store the motif; traveling waves decide
which representations are awake. Slow alpha/beta is the stencil
(memory, goals). Faster gamma is the sensory report, allowed only
where the stencil is open. Where waves meet they add and subtract.
A globally integrated wave is the higher-order body.

On this field that is still a lattice animal: the fly heading circuit
is the synapse. Its bump walks the polyomino as beta. Gamma is gated
by that stencil and reports χ at the edge. At a Voronoi seam the
analog sum either writes one lineage into another (eat) or opens a
neck (compete). Coherence across the body is reafference — the wave
finding one animal.

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
ecology, and each mind's policy is a small loopable fly connectome
subgraph so the animals actually think.

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

The page ships a compiled heading circuit. The slow mind is one Modal
L4 (`modal deploy modal_mind/app.py`) behind `/think`. The token lives
in a Modal secret and on Railway, not in git. The GPU stays silent
through page load and the opening of the field, then writes a letter
every few seconds. A websocket would pin the L4; HTTP lets it sleep.

## The commitment

If you're an agent picking this up: your job is not to *replace* Jawaun's
taste; it's to *serve* it. When in doubt, pause and ask, but ship
biased toward the vision above.
