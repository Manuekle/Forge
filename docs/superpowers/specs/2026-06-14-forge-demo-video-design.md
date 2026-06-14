# Forge — 30s Product Demo Video (Remotion)

**Date:** 2026-06-14
**Status:** Approved (build authorized)

## Goal

A ~30s landscape product-demo video that replicates the Forge app UI in React
(Remotion), driven by a simulated cursor — the founder's live customer
walkthrough, rebuilt as a deterministic, frame-accurate render. Plain,
to-the-point on-screen copy. Highlights guided by the marketing homepage.

## Locked decisions

| Decision | Value |
|---|---|
| Brand on screen | **Forge** (matches codebase) |
| Format | 1920×1080, 30fps, 900 frames (30s) |
| Treatment | Faithful React replica + simulated cursor (Approach A) |
| Audio | On-screen text + music; `MUSIC` constant defaults `null` (silent), drop `public/music.mp3` to enable |
| Arc | Idea → Run → Deliverables → CTA (5 scenes) |
| Demo idea | P2P food marketplace ("HomePlate") for home cooks; checkout scope; consensus 0.87 |
| Theme | Dark (`#09090B` canvas, brand `#E85002`) |
| Project location | **Separate package** at `remotion/` (isolated from Next deps) |
| Scene 4 | Real PRD doc body (headings + user stories), not just chips |

## Design system reuse

Tokens, utility classes (`lift-1`, `ring-hair`, `glass`, `btn-brand`,
`icon-chip`, `bg-noise`, `gradient-text`, `aurora`, `bg-grid-soft`…) copied from
`src/app/globals.css` into `remotion/src/styles.css`. Tailwind v4 via
`@remotion/tailwind-v4` so real component `className` strings are reused verbatim.
Fonts: Syne (display), Inter Tight (sans), JetBrains Mono (mono) via
`@remotion/google-fonts`. Icons: same `@hugeicons/react` + `@hugeicons/core-free-icons`.

Agent roster + colors from `src/lib/constants.ts` (orchestrator `#E85002`, PM
`#F97316`, UX `#FB923C`, Architect `#FCD34D`, QA `#A78BFA`, Scrum `#2ED47A`,
Business `#4A9FF9`).

## Architecture

```
remotion/
  package.json            # separate package, own deps
  tsconfig.json
  remotion.config.ts      # enableTailwind override
  src/
    index.ts              # registerRoot
    Root.tsx              # <Composition id="ForgeDemo" 1920x1080 30fps 900f>
    styles.css            # design tokens + utilities (from globals.css)
    fonts.ts              # @remotion/google-fonts loaders
    data.ts               # demo content: idea text, agent feed, PRD body, artifacts
    components/
      AppShell.tsx        # 240px sidebar + main canvas + bg-noise + aurora
      Sidebar.tsx         # logo, nav, projects/AI-team, Jane Doe / Forge Pro
      Cursor.tsx          # spring waypoint cursor + click pulse
      Caption.tsx         # kinetic per-scene caption (Syne)
      Modal.tsx           # replica modal chrome
      Button.tsx, Badge.tsx, Card.tsx, Progress.tsx, Window.tsx (helpers)
    scenes/
      S1Dashboard.tsx     # New-project modal, cursor types name+desc, Create
      S2ProjectRun.tsx    # project view, New run, run-context brief, Start run
      S3LiveRun.tsx       # ported LiveOrchestration (frame-driven)
      S4Deliverables.tsx  # deliverables tabs + PRD doc body + artifact chips
      S5CTA.tsx           # logo, tagline, Start free, brand glow
    lib/
      anim.ts             # interpolate/spring helpers, typewriter, easing
```

## Timeline (30fps)

| Scene | Frames | Time | Beats | Caption |
|---|---|---|---|---|
| S1 Dashboard | 0–150 | 0–5s | cursor → "New project"; modal opens; type name "HomePlate" + desc; click **Create** | "Describe your idea." |
| S2 Project + Run | 150–270 | 5–9s | project opens; AI Team sidebar; click **New run**; brief textarea fills; **Start run** | "Your AI product team takes it." |
| S3 Live run (hero) | 270–600 | 9–20s | orchestrator + 6 orbs; edges pulse; mono trace feed; debate → vote (5 yes·1 revise) → **Consensus 0.87** count-up; 7 artifacts check in | "Six agents debate, vote, decide." |
| S4 Deliverables | 600–810 | 20–27s | Deliverables tab; PRD/Backlog/Architecture pills; PRD doc body scrolls; artifact chips ✓ | "A full product plan — in minutes." |
| S5 CTA | 810–900 | 27–30s | logo, "From idea to backlog in under 3 minutes", **Start free**, brand glow | — |

Scene transitions: short cross-fades (`@remotion/transitions` or opacity
interpolation across a ~8-frame overlap).

## Cursor

Single `<Cursor>` reads a per-scene waypoint list `[{frame, x, y, click?}]`,
interpolates position with spring easing, renders a small arrow + an expanding
click-pulse ring on click frames. All movement is `frame`-derived (deterministic).

## Demo content (data.ts)

- **Idea / brief:** "A peer-to-peer marketplace for home cooks to sell meals
  locally — discovery, checkout, ratings, payouts."
- **Project:** name "HomePlate", status active.
- **Trace feed** (reuse landing sim): `iq.intent.parse · marketplace/food/p2p`,
  `iq.knowledge.retrieve · 3 sources · grounded`, `pm.analyze · PRD scope:
  checkout`, `ux.flows · guest checkout journey`, `architect.validate · schema:
  payments`, `qa.scan · 3 risks found`, `scrum.plan · 2 sprints · 21 pts`,
  `business.case · LTV/CAC 3.4`, `debate.open · buyer authentication`,
  `vote.tally · 5 yes · 1 revise`, `consensus.emit · confidence 0.87`,
  `artifacts.write · 7 files · versioned`.
- **Consensus:** "Auth required · one-tap OAuth at checkout" — 0.87.
- **Artifacts (7):** PRD, Backlog, Architecture, UX, QA, Roadmap, Business (v1).
- **PRD body (markdown-ish, rendered as styled blocks):** Overview, Goals,
  User stories (3–4 with acceptance criteria), Out of scope.

## Render

`cd remotion && npx remotion render ForgeDemo out/forge-demo.mp4`
Preview: `npx remotion studio`.

## Out of scope (YAGNI)

Light theme, vertical/social cuts, real voiceover/TTS, Playwright capture,
importing live Next components directly, real API/data — all content is static
in `data.ts`.

## Risks

- `@remotion/tailwind-v4` version must match `remotion` version → install together.
- Custom `@theme` utilities from globals.css must be present in `styles.css` or
  classes silently no-op → copy the needed utilities verbatim.
- `bg-noise`/`aurora` are heavy; fine for offline render.
