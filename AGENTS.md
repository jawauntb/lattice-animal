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
3. **Redeploy after push.** `RAILWAY_CALLER=skill:use-railway@1.4.0
   RAILWAY_AGENT_SESSION="<session>" railway up --detach -m "<summary>"`.
   Follow with a `Monitor` loop polling `railway deployment list --json`
   for `SUCCESS`.
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

Add to this as ideas come in. Cross off when shipped.

- [ ] **Click / tap an animal to isolate it** — camera zooms, other
      animals dim, a side panel shows real-time stats and recent events
      filtered to just this animal
- [ ] **Listen mode** — a ♪ toggle that turns on generative music.
      Every new bond plucks a pentatonic note whose pitch depends on
      the animal's hue. Fission plays a dissonant interval that
      resolves.
- [ ] **Stacked / looped fly connectomes** — each mind's policy is a
      small subgraph of the Janelia male CNS connectome
      (`gs://flyem-male-cns`), looped K times per tick for cognitive
      depth. Substrate for "recursive meta-intelligence" per Buehler.
- [ ] **Sexual dimorphism** — after fly‑connectome integration, some
      animals become "male‑CNS wired" and others "female‑CNS wired,"
      with subtle behavior differences (courtship‑adjacent pursuit
      motion, aggression response, etc.). See the male CNS paper
      Jawaun linked (Cell, Sep 2026).
- [ ] **Space‑warp** — GR‑animation style curvature of a background
      mesh around each animal, so the shared field looks bent by the
      presence of a body.
- [ ] **Persistent life across sessions** — the animals live on the
      server even when Jawaun isn't on the site.
- [ ] **Tribes / relations / eat‑each‑other** — Conway‑adjacent
      predator‑prey dynamics between species (respecting the lattice
      invariant).
- [ ] **Pull‑to‑split by touch** — long‑press a bond to fracture the
      animal along that edge.
- [ ] **objetd'art /interference borrows** — patterns that emerge from
      overlapping wave interference; probably too visually loud for
      the current field but might fit a background layer.

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
