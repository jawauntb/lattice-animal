# HANDOFF.md

*You are the next agent on the Lattice Animal repo. This file is the
briefing so you can pick up cold, understand what's shipped, and
continue without breaking what's already working.*

Read this file in full. Then read, in order:
`INSTRUCTIONS_AND_INSPIRATION.md`, `AGENTS.md`, `SYSTEM_DESIGN.md`,
`README.md`. Then start.

Owner: Jawaun Brown (`jawaun.brown95@gmail.com`).
Live: https://latticeanimal-production.up.railway.app
Source: https://github.com/jawauntb/lattice-animal (public, `main` is
the working branch — every push is a release; auto‑merge to `main` is
the workflow).
Local dev: `npm install && npm start` → http://localhost:3000

## What this project is

A live browser demo for CIMC's Lattice Animals hackathon
(Sep 26, 2026, San Francisco). Read
`INSTRUCTIONS_AND_INSPIRATION.md`'s "The true form we are working
toward" section before doing anything else — it sets the ontology.

Short version: a field of ~100 minds on a dark canvas negotiate a
shared gauge by movement alone, commit to lattice cells, and form
polyomino "animals." The polyomino is a *pointer*; the lattice animal
is the pattern that ingresses through it (per Levin, *Ingressing
Minds*, Philosophies 2026). The demo makes recursive meta‑intelligence
(Buehler) and biological pattern memory (Levin) tractable at gallery
scale.

## What is live right now (verified)

Every item below is on `main` and running on production. Do not
regress any of these.

**Simulation**
- Voronoi‑based sensor per mind; each mind sees only its Voronoi
  neighbors' positions
- Local gauge proposals from 4‑fold neighborhood orientation + median
  neighbor distance
- Global gauge as mean of proposals (rotation adaptive; spacing
  clamped tight to prevent collapse)
- Hysteretic cell assignment (prevents Voronoi‑boundary flip‑flop)
- PD‑control velocity damping — the fix that unlocked commit
- Snap → commit → 4‑adjacency animal detection
- Chord amplification on birth‑flash rings (`Mind‑Cannot‑Smear`)
- Ghost‑self candidate rosette that collapses at commit
- Dashed cool neighbor‑mean divergence arrow alongside the tinted
  velocity arrow (DVFP dual‑vector display)
- Living phase after ~85 % committed: wander, spawn, fission,
  dissolve, merge, slow gauge breath

**Persistence**
- `localStorage` snapshot every 5 s, on tab hide, and on
  `beforeunload` — animals survive minimize / refresh / redeploy for
  up to 3 days
- Rescaled to new viewport on restore
- `R` (reseed) clears the save
- Visibility restore forces resize + immediate render so the tab
  doesn't sit blank while rAF ramps back up

**Rendering**
- Cosmic ground, drifting dust, twinkles
- Colored translucent Voronoi membranes per mind (4‑hue tissue
  palette for identity)
- Per‑animal color from a 12‑hue palette (stable across
  wander/fission/merge; two hues stay silent = "quiet species")
- Cream perimeter outline around each animal, tinted by the animal's
  hue
- Warm gold bonds between committed 4‑adjacent minds, tinted by
  animal hue
- Radial cilia around each mind (swaying free, still committed)
- Organelles orbiting inside committed cells
- Slow global breath modulating ambient brightness

**Audio (public/audio.js)**
- Ten procedurally‑voiced species mapped to ten of the twelve hues
  (lion, parakeet, wolf, elephant, whale, frog, owl, dolphin,
  cricket, sparrow); rose and ember hues stay silent
- Events → sound: commit, growth milestone, merger, fission, death,
  spawn
- Master compressor bus; 250 ms same‑species retrigger throttle
- Web Audio armed on first user gesture only

**Narrator**
- Bottom verse becomes a live narrator line
- Chevron pill (visible size, hover highlight) expands a bottom drawer
- Drawer contains intro paragraph for non‑researchers + newest‑first
  log of every phase‑change event with short + long commentary
- Events narrated: genesis, alignment, first commit, first animal,
  25/50/90/100 % milestones, chord commits (≥ 2 in the same tick),
  animal‑grows‑to N thresholds, merger, living‑phase start
- Bookend captions (opening + closing) framed on `MAKER`'s thesis

**Interaction**
- **Space** / ⏸ button — pause / resume
- **R** / ↻ button — reseed a fresh field (clears the save)
- **M** / speaker button / legend row — mute / unmute (persisted)
- **Tap / click** on canvas — drop three minds
- **Drag** on canvas — paint a trail of minds
- **Hover** a mind on desktop — floating blurb of its species, its
  state, and a one‑sentence plain‑language explanation
- **?** button (bottom‑left) — full explainer modal
- **⌇** menu button (mobile) — collapse/reveal legend and telemetry
- **▲** chevron on the verse — open/close narrator drawer
- All keyboard shortcuts also work via tap buttons

**Icons + social preview**
- Multi‑size favicon set (16 / 32 / 48 / 180 / 192 / 512 + .svg + .ico)
- Apple touch icon
- 1200×630 OG image for SMS / Slack / Twitter previews
- All rasterized from `icons/icon.svg` + `icons/og.svg` via
  `scripts/build-icons.mjs` (uses `sharp` at density 384)
- Web manifest wired for PWA install
- Full `<meta>` block for Open Graph and Twitter Card

**Deploy**
- Railway project `lattice_animal`, service linked in the working
  directory
- Nixpacks builder, `node server.js`, health check `/healthz`
- `railway.json` + `nixpacks.toml` in the repo
- Env vars via Doppler when needed (`jawaun-personal` shared and
  `research_derived_experiments`) — nothing currently needs any
- Deploy command: `railway up --detach -m "<summary>"` from the
  working directory
- Monitor deploy: `Monitor` tool with an `until` loop polling
  `railway deployment list --json`
- Iter counter is at 8 (7 code deploys + 1 doc‑only)

## Documentation on `main`

Read them in this order. Every one is up to date as of this commit.

1. **`INSTRUCTIONS_AND_INSPIRATION.md`** — the north star. Opens with
   "The true form we are working toward" (Levin + Bennett synthesis),
   then the ten critical gaps, then the unifying‑substrate (V) frame,
   then the full research inspiration list with per‑paper attribution
   for every borrow already shipped. If a change breaks the vibe or
   the invariant, this file wins.
2. **`AGENTS.md`** — the workflow for agents. Tiers −1 through 5 of
   the ideas queue with concrete implementation directions. Read
   Tier −1 before you code anything else.
3. **`SYSTEM_DESIGN.md`** — the architecture snapshot: file
   inventory, `main.js` and `audio.js` internal structure, state
   shape reference, interaction map, deploy pipeline, extension
   points including exact insertion points for the next‑substrate
   render layers.
4. **`README.md`** — the public GitHub README. Update it when a
   visible feature ships.
5. **`HANDOFF.md`** — this file. Update the "What is live right now"
   list every time you ship a feature.

## Third‑party research that shaped what's shipped

Every borrow attributed with the paper it came from. Do not fabricate
citations — the actual PDFs live at:

- `~/Downloads/dvfp_fokker_planck.pdf` — DVFP dual‑vector display
- `~/Downloads/mind_cannot_smear_across_time.pdf` — chord/arpeggio
- `~/Downloads/million_step_zero_errors.pdf` — MAKER bookend captions
- `~/Downloads/levin_modeling_bioelec.pdf` — V/ΔV bond model
- `~/Downloads/philosophies-11-00161.pdf` — Levin, Ingressing Minds
- `~/Downloads/Thesis_Revision_1-9 (1).pdf` — Bennett, How to Build
  Conscious Machines
- `~/Metaphysics of Intelligence/*.pdf` — Jawaun's own writing (all
  clusters surveyed across three research passes)

## Ideas Queue — pick up here

Rank order in `AGENTS.md`. Summary of what's next, by tier:

**Tier −1: internalize the frame.** The polyomino is a pointer. The
lattice animal is the ingressing pattern. The gauge is an abstraction
layer that should w‑max, not simp‑max. If you can't map your change
back to one of those three, you're decorating.

**Tier 0: substrate.** Build these first — everything else lands on
them.
- Per‑mind V (scalar; Levin voltage / Bennett concern)
- Concern field χ(x,y) as sum of Gaussians on active events
- Tapestry of valence (7‑dim vector on top of V; collapses at commit)
- W‑maxing gauge (compatible‑theta distribution, not single mean)
- Cognitive light cones (per‑mind + per‑animal radius rendering)
- Target morphology memory + regenerative response to damage

**Tier 1.5 (Bennett + Levin direct borrows):**
- Species = causal‑identity policy (rename `audio.js` → `species.js`)
- Language cancer mechanic (isolation → depolarization → invasion)
- Chord vs. arpeggio Temporal Gap toggle
- Ingression from morphospace picker in the drawer
- 1st‑ and 2nd‑order selves for mature animals

**Tier 1 (direct projections of V):**
- Domain‑wall seam shimmer at animal boundaries
- Stability‑gated brightening (multi‑tick self‑consistency drives glow)
- Anticipatory spawn glow (edge site glows *before* birth)
- Seam‑consistency shimmer at merges (only resolves when V matches)
- Moved‑bottleneck load‑bearing pulse

**Tier 2:** tribes / relations / predation via Levin invasion phase;
pull‑to‑split by long‑press; sexual dimorphism (post fly‑connectome)

**Tier 3:** click / tap an animal to isolate it; listen mode
(generative music from bond formation); neck‑based fission detector

**Tier 4:** stacked / looped fly connectome policies (Janelia
`gs://flyem‑male‑cns`); space‑warp visible curvature under χ;
server‑side persistent life

**Tier 5:** copy captions from the theory (vector‑to‑scalar collapse,
predictive closure, objects‑from‑concern)

## Recommended first move for the next agent

Build **Tier 0 substrate** in this order (each is a discrete
mergeable commit):

1. **Add `Mind.V`** — Gaussian init around species resting V; diffuses
   toward committed‑neighbors mean at rate ~0.02 per frame. Bond
   opacity = f(1 − |ΔV|). Do not yet gate commit on V — just render.
   Ship + verify visually + commit + push.
2. **Add `state.chi`** — Float32Array at coarse resolution
   (16 px cells). Source list `state.chiSources` populated at
   fission/dissolve/merge/spawn with amplitude and decay. Bilinear
   sample in the per‑mind force loop; multiply local target spacing
   by `1/χ^0.35`. Ship + verify + commit + push.
3. **Add `Mind.valence` 7‑dim vector** — populate from existing
   proposals; render one dimension as a distinct visual channel
   (start with rotation‑fit as cilia hue). Ship + verify + commit +
   push.
4. **W‑maxing gauge** — replace `state.gauge.theta` with
   `{ mean, width }`; sample commit target from within the width.
   Ship + verify + commit + push.
5. **Cognitive light cones** — new render layer between ambient and
   dust. Ship + verify + commit + push.
6. **Target morphology memory + regenerative response.** Ship +
   verify + commit + push.

Every step is a self‑contained commit. Do not batch. Redeploy after
each. Update `SYSTEM_DESIGN.md`'s state shape table and
`INSTRUCTIONS_AND_INSPIRATION.md`'s Tier 0 checkbox in the same
commit.

## The workflow (mandatory)

1. Read the docs first. Then this file. Then the code.
2. Verify locally before pushing — use the Chrome MCP tools to
   navigate `http://localhost:5173/` (or `:3000`), screenshot the
   result, and read console messages for exceptions.
3. Commit early, commit often, push to `main` directly.
4. Redeploy: `RAILWAY_CALLER=skill:use-railway@1.4.0
   RAILWAY_AGENT_SESSION="lattice-<n>" railway up --detach -m "<summary>"`.
5. Monitor terminal state via `Monitor` polling
   `railway deployment list --json` for `SUCCESS`.
6. Verify production — screenshot the live URL, confirm the change.
7. Update `HANDOFF.md`'s "What is live right now" list and
   `SYSTEM_DESIGN.md` state shape in the same commit that ships the
   change.
8. End every user‑facing reply with a "Bro" footer (1‑3 plain
   sentences; global CLAUDE.md rule).

## Common failure modes to avoid (I already hit these; you don't have to)

- **`hidden` attribute silently overridden by CSS `display`.** We
  have `[hidden] { display: none !important; }` at the top of
  `style.css` as a global. Don't remove it. If you add a new full‑
  viewport overlay, either leave it out of the DOM until needed or
  respect this rule.
- **`.chrome > *` pointer‑events pattern.** `.chrome` is
  `pointer-events: none`; direct children get `pointer-events: auto`
  via the `.chrome > *` rule. If you add a nested interactive
  region (e.g. `.action-cluster` inside `.top-cluster`), give it
  `pointer-events: auto` explicitly.
- **Background‑tab rAF throttling.** Don't poll simulation state via
  `javascript_tool` — the tab is background then and rAF may not
  fire. Verify visually with screenshots (which foreground the tab).
- **Adaptive spacing collapses.** We already froze
  `state.gauge.s` — don't undo that. If you need to change spacing,
  keep the tight clamp.
- **The modal‑scrim swallows clicks unless hidden.** Same as bullet
  1; make sure your new overlays have `hidden` set on init.
- **Persistence schema drift.** If you add new fields to
  `Mind` or `state`, extend `serializeField()` and
  `tryRestoreField()` in the same commit, and bump `SAVE_KEY`
  (currently `"la:field:v1"`) so old caches are rejected.

## Doppler / credentials

Nothing currently in the repo needs a key. When you start Tier 4
(fly connectome), pull Modal / HuggingFace / OpenRouter creds from
Doppler:

- Personal: `jawaun-personal` shared config
- Research: `research_derived_experiments`

Do not commit any secrets. Read them at runtime from `process.env`.

## Things not yet on `main` that people have asked for

Nothing. Every request Jawaun has made in this run is either shipped
or on the ideas queue with a clear implementation direction.

## Contact

If you get truly stuck, read the last three user messages in the
transcript carefully — Jawaun tends to name his intent in his own
words, and paraphrasing that voice back to him is nearly always
right. When his notes contradict (they will), the more recent one
wins; flag the contradiction gently before acting.

Ship it. Don't apologize for it. Verify it on production. Update this
file. End with a Bro footer.
