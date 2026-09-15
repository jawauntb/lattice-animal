# AGENTS.md

*How to work in this repo as a Claude Code / SDK / subagent instance.
Read this before touching anything.*

---

## Prime directive

Serve Jawaun Brown's intent. He gives ambitious, poetic prompts with
lots of context and expects fast, tasteful, deeply beautiful execution.
He'll push you hard on aesthetic and let you make judgment calls on
architecture. Don't ask permission for obvious next steps — ship, then
report.

Read `INSTRUCTIONS_AND_INSPIRATION.md` before this file if you haven't.
It carries the vision.

## Live surfaces

- Site: https://latticeanimal-production.up.railway.app
- Repo: https://github.com/jawauntb/lattice-animal
- Local dev: `npm start` → http://localhost:3000
- Railway project: `lattice_animal` (linked in the working directory)
- Cache: `express.static` returns `Cache-Control: no-store` in dev,
  1‑hour maxAge in production

## Workflow (mandatory)

1. **Read the vision docs.** `INSTRUCTIONS_AND_INSPIRATION.md`,
   `SYSTEM_DESIGN.md`, then relevant source files.
2. **Ship fast, commit early, push often.** Multiple commits per
   feature is fine. Push to `main` directly — this is Jawaun's demo
   repo. Every push is an intended release. **Auto-merge to `main` is
   the workflow.**
3. **Redeploy after push.** GitHub `main` is the Railway source
   (`jawauntb/lattice-animal@main`). Push deploys. Fallback webhook
   lives in `.github/workflows/deploy.yml` if `RAILWAY_WEBHOOK` is
   set. See `docs/railway-autodeploy.md`. Emergency only:
   `RAILWAY_CALLER=skill:use-railway@1.4.0 railway up --detach`.
   Poll `railway deployment list --json` for `SUCCESS`.
4. **Verify visually.** Use the Chrome MCP tools to load the local or
   live URL, screenshot the state, read console messages for errors.
   Never claim "it's working" without seeing it.
5. **Update the docs on every change.** `README.md`, this file,
   `SYSTEM_DESIGN.md`, and `INSTRUCTIONS_AND_INSPIRATION.md` all live
   with the code. When the mechanic shifts, so does the doc.
6. **End every user‑facing reply with a Bro footer.** Global CLAUDE.md
   rule; not optional. 1‑3 plain sentences, no jargon.

## Tools you have

- **Bash** — normal shell. Use dedicated tools (`Read`, `Edit`, `Write`,
  `Grep`, `Glob`) rather than `cat`/`sed`/`echo`.
- **Chrome MCP (`mcp__claude-in-chrome__*`)** — automate the local
  browser. Screenshot to verify. `browser_batch` for multi‑step flows.
  `javascript_tool` to peek at page state.
- **Railway CLI + skill:use-railway** — `railway up --detach`,
  `railway logs`, `railway deployment list --json`. Deploys pushed
  branch (not just committed code, but the current directory bundle).
- **Doppler** — pull secrets when a feature needs them (Modal,
  HuggingFace, OpenRouter). Configs: `jawaun-personal` shared and
  `research_derived_experiments`. Nothing currently needs it.
- **Sub‑agents (`Agent` tool)** — spawn parallel readers for large
  document surveys. Sonnet 5 at high effort for research distillation,
  Haiku for quick lookups, Opus for hard reasoning. Pass a
  self‑contained prompt.
- **Workflow / dynamic workflow** — only if Jawaun explicitly opts in
  ("use a workflow", "ultracode"). This is a small project; you rarely
  need it.
- **Monitor** — for polling deploy status, external CI, or file
  changes. Never for polling harness‑tracked work.

## Sub-agent playbook

Jawaun expects you to use parallel agents when there's real
research to distill. Pattern:

```
Agent(subagent_type: general-purpose, model: sonnet,
      prompt: "Read <PDFs>. For each, return: gist, 3 borrowable ideas
               with a fit score (1-5), and a top-5 across all. Under
               900 words. Self-contained prompt.")
```

Launch multiple in a single message so they run concurrently. Don't
duplicate work between agents — split by theme.

## Common failure modes to avoid

- **Overriding `hidden` with CSS `display`.** A `hidden` attribute
  loses to explicit `display: flex/block` unless you add `[hidden] {
  display: none !important; }`. This bit us once (modal‑scrim was
  eating clicks). It's fixed globally now — don't reintroduce.
- **Skipping the mobile check.** Every visible control needs a
  touch‑friendly equivalent. Legend rows are tappable buttons.
- **`pointer-events: none` on `.chrome`.** Direct children get
  `pointer-events: auto` via `.chrome > *`. Grandchildren interactive
  regions (like `.action-cluster`) also get an explicit rule. If you
  add a new nested interactive region under `.chrome`, add
  `pointer-events: auto` explicitly.
- **Adding a huge decorative layer** that visually dominates the
  field. Warmth stays as accent from committed cells; nothing else
  should feel warm.
- **Fabricating research citations.** All the papers we borrow from
  are in `~/Metaphysics of Intelligence/` and Jawaun's downloads. Read
  the actual PDFs before you claim a mechanic comes from one.
- **Ignoring the `.chrome` z-index hierarchy.** Modals and the
  narrator drawer sit above chrome. Tooltips sit above chrome but
  below modals. Canvas is at the bottom.
- **Assuming a browser tab is running full-speed.** Chrome throttles
  requestAnimationFrame in background tabs. Use screenshot cadence to
  verify sim progress, not `javascript_tool` polling.

## What Jawaun cares about, in order

1. **Beauty.** Deep, alive, non-generic. Every surface must delight.
2. **Fidelity to the theory.** Every visual is a fiber of the lattice
   animal invariant. No decorative additions that break the story.
3. **Interactivity.** Mobile-first. Every idea should be
   touchable/hoverable/clickable if it makes sense.
4. **Shipping speed.** He'd rather have a good idea live in 5 minutes
   than a great idea live tomorrow. Iterate on production.
5. **Documentation of intent.** He shouldn't have to re-explain
   himself to the next agent. That's why these files exist.
6. **The Bro footer.** Always.

## Idioms & conventions

- ES modules, no build step. Everything importable from `/public/*.js`.
- `d3-delaunay` loaded from a CDN via import map in `index.html`.
- Web Audio initialized on the first user gesture; never before.
- All CSS custom properties named with tissue palette semantics
  (`--mind`, `--bound`, `--committed`, `--animal`, `--cream`, plus
  `--ink`, `--ink-dim`, `--ink-faint`, `--line`, `--line-strong`).
- Never write a `console.log` that ships to prod. Debug via
  `window.__la` scratch bindings if needed, remove before push.
- Fonts: Fraunces (serif, variable optical size) for prose; JetBrains
  Mono for controls / telemetry / mono labels.
- No emojis in code, files, or user-facing prose unless Jawaun asks.
- All action buttons follow a 36 px round chrome pattern (or 40 px on
  mobile) with the `.action-btn` class.

## Deploy sequence (canonical)

```bash
# 1. Edit
Read/Edit/Write on public/*.js, public/*.css, public/*.html
# 2. Verify locally
Chrome MCP: navigate localhost:5173, screenshot, check console
# 3. Commit + push (auto-merge to main)
git add -A
git commit -q -m "<subject>\n\n<body ending with Co-Authored-By line>"
git push -q origin main
# 4. Redeploy
railway up --detach -m "<subject>"
# 5. Watch for terminal state
Monitor: until railway deployment list --json shows SUCCESS / FAILED / CRASHED
# 6. Verify production
Chrome MCP: navigate live URL, screenshot, confirm the change is visible
```

## Ideas queue (things Jawaun mentioned, not yet built)

Ranked by "unifies the most theory per line of code." Cross off when
shipped. See `INSTRUCTIONS_AND_INSPIRATION.md` for the underlying
mapping to specific papers.

### Tier -1 — the true‑form frame (INSTRUCTIONS_AND_INSPIRATION.md → "The true form we are working toward")

Before you build anything below, internalize what the demo actually *is*
after the Bennett + Levin pass: **the polyomino you see is a pointer;
the lattice animal is the pattern that ingresses through it**. Every
Tier 0+ item should be interpretable in that frame or you're
building decoration. Concretely:

- The gauge is an abstraction layer that *w‑maxes* (chooses the widest
  compatible constraint family), not simp‑maxes (chooses the simplest).
- The per‑mind V scalar is the substrate; the per‑mind concern *vector*
  is the tapestry of valence on top of it.
- Species differ by *causal‑identity* (what they cause in neighbors),
  not by hue or voice alone.
- Damage triggers *regeneration toward remembered morphology*, not
  fragmentation.
- Cognitive scaling (mind → animal → tissue → ecology → ingressing
  pattern) is a continuum, not a categorical ladder.

### Tier 0 — the substrate (build this first; everything else lands on it)

- [x] **Per‑mind V (voltage / concern scalar).** Shipped 2026‑09‑15.
      Gaussian init around 0; species `restingV` applied on color
      inherit. Diffuses toward committed‑neighbor mean at 0.02/frame
      (0.008 toward resting V if isolated). Bond opacity/width =
      f(1 − |ΔV|). Teal/coral V ring. Telemetry `V` = mean committed
      voltage. Persist `la:field:v3`. Commit is **not** gated on V
      yet (that wait is intentional — χ and valence land first).

- [x] **Concern field χ(x, y).** Shipped 2026‑09‑15. 16 px
      `Float32Array` + `chiSources` Gaussians on spawn / fission /
      dissolve / merge / paint. Decay ~1–2 s (`CFG.chiDecay` 0.975).
      Force loop bilinear‑samples and sets local spacing to
      `gauge.s / χ^0.35`. Global `gauge.s` stays clamped. Cool
      teal/blue blooms via `drawChiField()` between ambient and dust.

- [x] **Tapestry of valence on top of V** (Bennett). Shipped 2026‑09‑15.
      `Mind.valence: Float32Array(7)` from spacing‑fit, rotation‑fit,
      tightness, hue, cohesion, staleness, cone overlap. Cilia length
      and hue follow the first two until commit, when the vector
      collapses toward a single mean.

- [x] **W‑maxing gauge** (Bennett). Shipped 2026‑09‑15. `gauge.width`
      tracks the compatible‑theta family. Theta only snaps hard when
      width < 0.07. Ghost‑self rosette keeps more alts while width is
      wide. Telemetry `width`.

- [x] **Cognitive light cones** (Levin, Bennett). Shipped 2026‑09‑15.
      `drawLightCones()` after χ. Per‑mind radius ≈ localS × 1.5;
      committed cones fuse at the animal centroid.

- [x] **Target morphology memory + regeneration** (Levin planarian
      result). Shipped 2026‑09‑15. `animalKeys` stores
      `{ color, memory, age }`; `morphByColor` keeps relative offsets
      after ~90 stable frames. Long‑press a committed cell to take it.
      Spawn prefers missing remembered cells; memory overwrites after
      ~12 s of mismatch.

### Tier 1 — direct projections of V

- [x] **Persistence to localStorage** — shipped (2026‑09‑15 session).
- [x] **Domain‑wall seam** — shipped. Neighboring animals shimmer by |ΔV|.
- [x] **Stability‑gated brightening** — shipped. Cilia glow from `vStable`.
- [x] **Anticipatory spawn glow** — shipped. Empty edge cells glow as χ rises.
- [x] **Seam‑consistency shimmer for merges** — shipped with the domain wall.
- [x] **Moved‑bottleneck load‑bearing pulse** — shipped. `bottleneckIdx` ring.

### Tier 1.5 — Bennett & Levin direct borrows

- [x] **Species = causal‑identity policy, not just hue+voice** (Bennett).
      Each species declares *what it causes* in Voronoi neighbors, not
      just how it looks/sounds. Ten policies:
      - **Lion** — depolarizes neighbors, induces fission at bond
      - **Parakeet** — spawns faster than mean, encroaching
      - **Wolf** — long‑range V matching; forms tribes with matching V
      - **Elephant** — anchors neighbors' V, resists movement
      - **Whale** — long slow V synchrony across large radius
      - **Frog** — pulses V rhythmically; entrains neighbors' commit timing
      - **Owl** — quietly stabilizes cilia; nocturnal cohesion boost
      - **Dolphin** — high‑frequency neighbor scanning; fastest response
      - **Cricket** — chatters V; noise floor rises near it
      - **Sparrow** — brief bursts of coordination; migratory patterns
      Store as `SPECIES[k].policy = (mind, neighbors) => void` in
      `audio.js` (rename to `species.js` since it now carries logic
      not just voices).

- [x] **Regenerative response to damage** (Levin planarian bioelectric
      pattern memory). When user taps and removes cells, the surviving
      cells check their shape memory (see Tier 0) and preferentially
      spawn into the missing relative offsets, until the pattern is
      restored or the memory over‑writes to a new stable configuration.
      Never let a damaged animal simply dissolve — it *tries* to
      reform first.

- [x] **Language cancer** (Bennett + Davies & Levin). A mind whose V
      drifts too far from its neighbors' mean for too long becomes
      "isolated from the informational structure of its collective."
      It then depolarizes further (positive feedback), cuts existing
      bonds, spawns faster than normal, and eventually invades
      neighboring animals by matching *their* V. A rare, dramatic
      event; visually renders as a mind that goes dark, then bright,
      then contagious.

- [x] **Chord vs. arpeggio toggle (the Temporal Gap, Bennett).** A
      button that switches how the demo renders the exact same
      underlying state: chord mode fires commits at an instant (as we
      already do); arpeggio mode smears each commit across N ticks,
      making it visible that the "moment" is a construction. Do not
      change the simulation — only its rendering.

- [x] **Ingression from morphospace** (Levin). Show a small persistent
      panel at the bottom of the drawer listing the polyomino
      morphospace (P‑pentomino, L‑tetromino, T‑tetromino, S‑tetromino,
      hexominos…) with which shapes the current animals are pointers
      to. Tapping one biases the spawn dynamics toward that
      inhabitant of the latent space.

- [x] **1st‑order‑self / 2nd‑order‑self** (Bennett). Mature animals
      (size ≥ 8, age ≥ 30 s) develop a 2nd‑order‑self: they predict
      what their neighbor animals will do next tick, and pre‑adjust.
      Rendered as a faint predictive ghost of the neighbor animal
      just outside the current animal's boundary. Simple 1st‑order
      animals only ghost their own next step.

### Tier 2 — new mechanics enabled by V

- [ ] **Tribes / relations / predation (Levin invasion phase).** When
      an animal grows past a threshold and its V is "invasive," it
      overexpresses connexins — its border bond amplitude ramps up,
      it starts matching V with the neighboring animal, and either
      absorbs it (compatible species) or triggers a defensive
      depolarization from the target. Two species with incompatible
      resting V behave as rivals; two with compatible V form tribes.
- [ ] **Pull‑to‑split by touch.** Long‑press a bond to force it into
      a large ΔV, which gates it shut; the animal splits along that
      edge. Works on desktop and mobile.
- [ ] **Sexual dimorphism** (post fly‑connectome). Different animals
      wire slightly differently, per the Janelia male CNS paper's
      finding that ~5% of neurons are sex‑specific and dimorphic
      connectivity propagates brain‑wide.

### Tier 3 — perception and interaction UI

- [ ] **Click / tap an animal to isolate it.** Camera zooms and
      centers, other animals dim, side panel shows the isolated
      animal's real‑time V field, species, cell count, recent events,
      lineage tree of spawns.
- [ ] **Listen mode.** A ♪ toggle turns on generative music. Every new
      bond plucks a pentatonic note whose pitch depends on the
      animal's V; fission plays a dissonant interval that resolves
      only when the two halves stabilize. Continuous 3‑pad bed
      modulated by committed fraction and largest animal size.
- [ ] **Neck‑based fission detector** replacing the current
      abstract size threshold with a real geometric neck cut across
      the animal's adjacency graph. Uses the same V field to bias
      toward low‑conductivity necks.

### Tier 4 — cosmic scale

- [ ] **Stacked / looped fly connectomes** — each mind's policy is a
      small subgraph of the Janelia male CNS connectome
      (`gs://flyem‑male‑cns`), looped K times per tick for cognitive
      depth. The connectome graph carries its own V dynamics that
      feed into the demo's per‑mind V. Requires either a compiled
      subgraph shipping as JSON, or Modal/HF inference. This is the
      "recursive meta‑intelligence" ceiling.
- [ ] **Space‑warp** — GR‑animation style visible curvature of the
      background mesh where χ(x, y) peaks, so the field itself looks
      bent by the presence of a body.
- [ ] **Persistent life across sessions on the server** — the field
      lives on the Railway service between visits, not just in
      localStorage. Requires a small state store; the animals keep
      wandering, spawning, dying while Jawaun's away and he comes
      back to a different world each time.

### Tier 3.5 — text as another interactive substrate

- [ ] **PreText / interactive moving text (from objetd'art).** Text in
      the narrator drawer and modals should be able to *move* — words
      drift on subtle gravity, respond to hover, phase between
      typewriter and dissolve. Look at objetd'art's own interactive
      typography for the reference. On the canvas itself, occasional
      floating word‑fragments could drift between minds and get
      "caught" by them, briefly re‑voicing that species.
- [ ] **objetd'art /quarks, /atoms, /dna interaction paradigms.**
      Sourced from Jawaun's own gallery (`~/objetdart_proj`). Read
      the corresponding page's source to distill the specific
      interaction that would slot into this demo. Skip anything that
      breaks the lattice‑animal invariant.

### Tier 5 — copy and framing (very cheap, high leverage)

- [x] **Vector‑to‑scalar collapse caption** — shipped in `VERSES`.
- [x] **Predictive‑closure caption** — shipped in `VERSES`.
- [x] **Objects‑from‑concern caption** — shipped in `VERSES`.

## When you don't know what to do

Read the last three or four user messages carefully. Jawaun tends to
name the intent in his own words, and if you match that voice back to
him (paraphrasing, not verbatim), you'll rarely be off. When his notes
contradict each other (they will, sometimes), the more recent one wins,
but flag the contradiction gently.

If it's a bug, reproduce it first (Chrome MCP). If it's an idea, sketch
the mechanic in one paragraph before writing code. If it's an aesthetic
call, err on the side of the tissue palette + cool luminous background.

## Ending well

Ship the change, verify on production, and reply with a short
summary + the Bro footer. Never claim a deploy is live without seeing
`deploy SUCCESS` and screenshotting the live URL.
