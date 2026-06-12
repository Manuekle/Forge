# Forge — Performance Audit

Date: 2026-06-12 · Scope: full codebase (104 source files, Next.js 15 App Router, React 19, Drizzle/Postgres on Supabase pooler, Azure OpenAI orchestration)

# Executive Summary

**Overall Performance Score: 52/100**

The app is architecturally clean for a demo but has the classic "SPA inside Next.js" anti-pattern: every page is a `"use client"` shell that fetches data after hydration, so the server rendering capability of Next.js is unused. The two most expensive problems are (1) a **synchronous multi-minute orchestration request** that will be killed by any serverless platform and blocks a server connection for its full duration, and (2) **unbounded polling payloads** — the project page polls the full runs table (all events, traces, citations, plans as JSONB) every 1.5 s, and a global notification poller pulls up to 50 full runs every 5 s on every page, forever, even when the tab is hidden. The database has **zero secondary indexes**. Fonts ship 11 weights across 3 families. `logo.png` is 1.3 MB.

Perceived performance is actually decent (good skeletons, optimistic toasts, motion polish), but real network and CPU cost grows linearly with usage and will degrade hard after a few runs per project.

Estimated achievable improvement: **~60–80 % reduction in steady-state network traffic, ~40 % faster first contentful paint on app pages, and run execution that actually survives production deployment.**

---

# Critical Issues

### C1. Orchestration runs synchronously inside the POST request
- **Severity:** Critical
- **Impact:** Interaction latency, reliability (run death), server resource consumption
- **Location:** `src/app/api/projects/[id]/runs/route.ts:86` (`await runAgentOrchestration(...)` inside `POST`), no `export const maxDuration`
- **Root cause:** A run makes 8–15 sequential LLM calls (planner + N agents + checkpoints + consensus + 5–7 artifacts at concurrency 3). Total wall time is 2–5+ minutes inside one HTTP request. Other long routes set `maxDuration` (`code/route.ts:6` = 300) — this one doesn't, so on Vercel it inherits the default and the run is killed mid-flight; the row stays `running` until the 15-min stale sweep marks it failed. The client even ignores the response (`page-client.tsx:205` treats 500 as "handled by poll") because the request is known-unreliable.
- **Fix:** Move execution out of the request: trigger + immediate 202 response, run in a background job (Vercel `waitUntil`, a queue, or at minimum `export const maxDuration = 800` on a fluid-compute runtime). The polling UI already supports this model perfectly — the POST handler just needs to return after `createRun`.
- **Estimated gain:** Runs survive production; "New run" button responds in <300 ms instead of holding a connection for minutes.

### C2. Run polling returns every run with full JSONB payload every 1.5 s
- **Severity:** Critical
- **Impact:** Network overhead, DB load, rendering performance, memory
- **Location:** `src/app/projects/[id]/page-client.tsx:157-181` (poll) → `GET /api/projects/[id]/runs` → `store.getRuns` (`src/lib/store.ts:869-876`, `select()` with no projection)
- **Root cause:** Each poll fetches **all** runs for the project, each including `events` (grows ~6 events per agent per run, easily hundreds of objects), `trace`, `citations`, `plan`, `votes`. A project with 10 historical runs ships megabytes of JSON every 1.5 s. The UI only needs the latest run's status/progress/events delta.
- **Fix:** Add `GET /api/projects/[id]/runs/[runId]` returning a single run, optionally with `?since=<event index>` for incremental events; poll that. Keep the full list fetch for the one-time history load (and strip `events`/`trace` from the list response). Long-term: replace polling with SSE from the run executor.
- **Estimated gain:** ~95 % less polling bandwidth; poll handler latency from O(total project history) to O(1).

### C3. Global notification poller: 5 s interval, 50 full runs, never pauses
- **Severity:** Critical
- **Impact:** Network overhead, DB load, battery/CPU
- **Location:** `src/components/ui/notification-center.tsx:43-47` → `api/notifications/route.ts` → `getAllRuns` (`src/lib/store.ts:878-891`, `select()` joined, `limit(50)`, all JSONB columns)
- **Root cause:** Mounted in the Navbar on every authenticated page. Polls every 5 s regardless of whether the popover is open, the tab is visible, or anything is running. Payload includes full `events`/`trace`/`citations` for up to 50 runs.
- **Fix:** (1) Select only the columns the panel renders (`id, projectId, projectName, status, progress, duration, createdAt`, plus the failure detail). (2) Pause on `document.visibilityState === "hidden"`. (3) Back off to 30–60 s when no run is `running`. The dropped JSONB columns alone cut the payload ~98 %.
- **Estimated gain:** From ~17 K requests/day/idle-tab moving MBs to a few hundred requests moving KBs.

### C4. Zero secondary indexes in the schema
- **Severity:** Critical (becomes visible with data growth; Supabase pooler makes every seq-scan worse)
- **Impact:** All API latency
- **Location:** `src/db/schema.ts` — no `index()` anywhere
- **Root cause:** Every list query filters/sorts on un-indexed columns: `projects.user_id` + `updated_at`, `runs.project_id` + `created_at`, `decisions.project_id`, `artifacts.project_id (+type)`, `tasks.project_id (+order)`, `activities.project_id (+created_at)`, `code_files.project_id`, `sessions.user_id`, `accounts.user_id`. The C2/C3 pollers execute these scans continuously.
- **Fix:** Add composite indexes:
  ```ts
  index("projects_user_updated_idx").on(t.userId, t.updatedAt.desc())
  index("runs_project_created_idx").on(t.projectId, t.createdAt.desc())
  index("decisions_project_idx").on(t.projectId)
  index("artifacts_project_type_idx").on(t.projectId, t.type)
  index("tasks_project_order_idx").on(t.projectId, t.order)
  index("activities_project_created_idx").on(t.projectId, t.createdAt.desc())
  index("code_files_project_idx").on(t.projectId)
  ```
- **Estimated gain:** Query times flat instead of linear in table size; essential before any real multi-user load.

---

# High Priority Fixes

### H1. Entire app is client-rendered; server components are empty shells
- **Severity:** High · **Impact:** Initial page load, navigation speed, SEO of app pages
- **Location:** `src/app/dashboard/page.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`, `agents/page.tsx`, `settings/page.tsx` — all just `return <PageClient />`
- **Root cause:** Every page mounts, shows a skeleton, then fires `fetch()` from the browser. Cost: full RTT for HTML → JS parse → hydrate → API RTT (which itself does JWT decode + DB). Data could be fetched server-side in the same pass (`store.getProjects(userId)` is already isomorphic).
- **Fix:** Fetch in the server component and pass as initial props (keep client polling for liveness): `const projects = await store.getProjects(userId)` in `page.tsx`, render `<DashboardPage initialProjects={projects} />`. Add `loading.tsx` per route for streaming.
- **Estimated gain:** First meaningful content 300–800 ms earlier per navigation; removes the skeleton flash on every page.

### H2. Project page fires 4 parallel requests that each re-authenticate and re-fetch the project
- **Severity:** High · **Impact:** Navigation speed, DB load
- **Location:** `src/app/projects/[id]/page-client.tsx:111-117` (`load()`), `src/lib/api-auth.ts:36-46`
- **Root cause:** `/projects/[id]`, `/decisions`, `/artifacts`, `/runs` each call `requireProjectAccess` → `auth()` + `SELECT project`. That's 4 JWT decodes and 4 identical project SELECTs per page load (and the artifacts fetch repeats after every run completion).
- **Fix:** Single `GET /api/projects/[id]/workspace` returning `{project, decisions, artifacts, runs}` via one auth check and `Promise.all` of three scoped queries — or do it server-side per H1.
- **Estimated gain:** 4 round-trips → 1; ~75 % less auth/DB overhead on the hottest page.

### H3. Duplicate `/api/projects` fetches — no client-side request dedupe/cache
- **Severity:** High · **Impact:** Network overhead, perceived speed
- **Location:** `src/components/layout/sidebar.tsx:171-178` + `src/app/dashboard/page-client.tsx:62` + `src/app/projects/page-client.tsx:47`
- **Root cause:** Sidebar and page both independently fetch the project list on every navigation; nothing caches between routes. No SWR/React Query/`router.prefetch` of data.
- **Fix:** Adopt SWR (or a tiny shared context) for `projects` with `dedupingInterval`; or lift the fetch to a server layout. Navigating dashboard → projects should issue zero project-list requests.
- **Estimated gain:** Halves API chatter per navigation; instant back/forward navigation from cache.

### H4. Project page re-renders its entire tree every poll tick and every second
- **Severity:** High · **Impact:** Rendering performance, CPU during runs
- **Location:** `page-client.tsx:149` (1 s elapsed ticker), `:157` (1.5 s poll → `setRuns`), `:359-381` (`mappedDecisions`, `deriveLiveView` computed inline), plus dozens of `motion.*` children
- **Root cause:** `runElapsed` and `setRuns` live at the top of `ProjectPageInner`. Each tick re-renders tabs, kanban, monaco wrapper, right panel, and recomputes `deriveLiveView` (O(events)) and `mappedDecisions` (with `toLocaleDateString` per decision) without memoization. During a live run that's ~2.6 renders/sec of a ~1000-line tree.
- **Fix:** (1) Move the elapsed ticker into the status-strip component. (2) `useMemo` `deriveLiveView(viewRun)` keyed on `viewRun.id + events.length + status`, and `mappedDecisions` on `decisions`. (3) In the poll, skip `setRuns` when nothing changed (compare latest run's `status + events.length + progress`). (4) `React.memo` `OrchestrationGraph`, `RunTimeline`, `HandoffFeed`, `KanbanBoard`.
- **Estimated gain:** ~80 % fewer wasted renders during runs; smoother animations on mid-tier hardware.

### H5. Decision debate POST is also synchronous (3 sequential LLM calls)
- **Severity:** High · **Impact:** Interaction latency, timeout risk
- **Location:** `src/app/api/projects/[id]/decisions/route.ts:63-85` — `for (const agent of DEBATE_AGENTS) { await complete(...) }`, no `maxDuration`
- **Root cause:** Sequential is intentional (each agent sees prior responses), but the request takes 30–90 s with no streaming and no `maxDuration`; UI shows a static "usually takes under a minute" card.
- **Fix:** Same as C1 (background + poll, or SSE streaming entries as they arrive — the UI already renders per-agent entries). At minimum add `export const maxDuration = 120`.
- **Estimated gain:** Survives deployment; perceived latency drops because entries appear incrementally.

### H6. `reorderTasks` issues one UPDATE per task, sequentially
- **Severity:** High (UX-visible: drag-drop lag) · **Impact:** Interaction latency
- **Location:** `src/lib/store.ts:862-867`
- **Root cause:** `for` loop of `await db.update(...)` — N round trips through the Supabase pooler (~30–80 ms each ⇒ 0.5–2 s for a 20-task board).
- **Fix:** Single statement: `UPDATE tasks SET "order" = v.ord FROM (VALUES ...) AS v(id, ord) WHERE tasks.id = v.id::uuid`, or `Promise.all` as a stopgap.
- **Estimated gain:** Reorder persistence 10–20× faster.

### H7. Font payload: 3 families, 11 weights
- **Severity:** High · **Impact:** Initial page load, CLS
- **Location:** `src/app/layout.tsx:6-22` — Syne 400/500/600/700/800, Inter Tight 400/500/600/700, JetBrains Mono 400/500
- **Root cause:** Syne is used only for a handful of headings (grep shows `font-syne` in ~6 places) yet ships 5 weights. ~150–250 KB of font data on first paint.
- **Fix:** Syne → `weight: ["700"]` (or 600+700), Inter Tight → drop 500 or 600, JetBrains Mono → 400 only. Or use `display: "swap"` explicitly and `adjustFontFallback` (default on) — but weight pruning is the real win.
- **Estimated gain:** ~100–150 KB less render-blocking font transfer; faster LCP on the landing page.

---

# Medium Priority Fixes

### M1. `addDecisionEntry` does read-modify-write on JSONB + 2 extra queries
- **Impact:** API latency during debates · **Location:** `src/lib/store.ts:732-747`
- 4 sequential queries per entry (select decision, update entries, select project, insert activity). Use `entries = entries || $1::jsonb` (like `appendRunEvent` already does, `store.ts:906-912`) and skip the project select by passing the name through. **Gain:** ~4× fewer round trips per debate entry.

### M2. `getProjectProgress` runs 3 COUNT queries
- **Location:** `src/lib/store.ts:955-969`. One query with `count(*) FILTER (WHERE status='consensus')` + a lateral artifact count, or `Promise.all`. Called after every run + 3× in seed. **Gain:** minor latency, fewer pooler slots.

### M3. Activity `timestamp` computed server-side as a string ("3m ago")
- **Location:** `src/lib/store.ts:937-953`, consumed in dashboard/notifications
- Relative times freeze at fetch time and break client caching; dashboard "new" metric string-matches `"just now"` (`dashboard/page-client.tsx:122`). Return ISO `createdAt`, format client-side (`getRelativeTime` already exists). **Gain:** correctness + cacheability.

### M4. `params` promise unwrapped via `useEffect`
- **Location:** `projects/[id]/page-client.tsx:75-84` — renders `null` for a frame, then mounts the real tree. Use `React.use(paramsPromise)` (React 19) or pass `id` from the server `page.tsx`. **Gain:** removes a blank first frame + an extra mount cycle.

### M5. Landing page top-level interval re-renders the whole 759-line tree every 4 s
- **Location:** `src/app/page-client.tsx:312-321` — `headlineIdx` state lives in `LandingPage`; every rotation re-renders Nav, hero, sims, FAQ, footer. Extract `<RotatingHeadline />`. Also `workflow-cards.tsx:33` + `:266` run two more intervals (scoped, fine — but they don't pause off-screen; wrap with `IntersectionObserver`). **Gain:** landing idle CPU near zero.

### M6. Compositor-heavy landing effects
- **Location:** `globals.css` — `.aurora` (animated, blurred radial gradients), `.bubble` (`filter: blur(10px)` × N, infinite), `.neon-card` (animated conic `@property`), plus full-viewport `.bg-noise` fixed overlays on every page (`page-client.tsx` and all app pages render `<div className="fixed inset-0 bg-noise" />`)
- Reduced-motion is respected (good), but on low-end GPUs the landing hero paints continuously. Add `will-change: transform` to bubbles, pause animations off-viewport, and consider one shared noise layer in the layout instead of one per page. **Gain:** lower paint cost, cooler laptops.

### M7. No virtualization for run timeline / events
- **Location:** `RunTimeline` rendering `view.timeline` (all events) and trace list `page-client.tsx:861-869`
- Hundreds of motion-wrapped rows after long runs. Cap visible rows ("show last 50 / expand") or virtualize. **Gain:** keeps the orchestration tab snappy on big runs.

### M8. `createArtifact` count-then-insert race + extra query
- **Location:** `src/lib/store.ts:765-777`. Version via `coalesce(max(version),0)+1` in the insert's subquery, single statement. **Gain:** one fewer round trip per artifact, no duplicate-version race.

### M9. Monaco theme redefined on every editor mount; `monaco-editor` is a dead dependency
- **Location:** `page-client.tsx:738-750` (`beforeMount` defines theme each time — cheap but redundant); `package.json:36` ships `monaco-editor@0.55` while `@monaco-editor/react` loads from CDN at runtime — the npm package is never imported. Remove it (install-time bloat only) or, better, configure `loader.config({ monaco })` to self-host instead of pulling ~5 MB from jsdelivr at runtime (external CDN dependency = slow/flaky editor open). **Gain:** deterministic editor load; smaller `node_modules`.

### M10. Toasts on long fetches but several handlers `await` without disabling state promptly
- `handleApprove`/`handleReopen` (`page-client.tsx:222-250`) have no pending state — double-click fires twice. Minor optimistic-update gap: status could flip immediately and roll back on error. **Gain:** snappier feel, no dup requests.

---

# Quick Wins (<30 minutes)

| # | Fix | Where |
|---|-----|-------|
| 1 | Add the 7 composite indexes (C4) | `src/db/schema.ts` + `db:generate` |
| 2 | `export const maxDuration = 800/120` on runs & decisions routes (stopgap for C1/H5) | both route files |
| 3 | Column projection on `getAllRuns` for notifications (C3) | `store.ts:878` |
| 4 | Pause notification poll when `document.hidden`; 30 s idle interval | `notification-center.tsx:43` |
| 5 | Skip `setRuns` when poll payload unchanged (H4) | `page-client.tsx:160` |
| 6 | Prune font weights to 4–5 total (H7) | `layout.tsx` |
| 7 | Compress `logo.png` (1.3 MB → ~10 KB webp/png-8; it renders at 26–40 px) and `og-image.png` 412 KB → <200 KB, `og-hero.png` 636 KB → <250 KB | `public/` |
| 8 | `useMemo` on `deriveLiveView` + `mappedDecisions` | `page-client.tsx:359-381` |
| 9 | `Promise.all` in `reorderTasks` (full fix H6 later) | `store.ts:862` |
| 10 | Remove unused `monaco-editor` dependency | `package.json` |

---

# Bundle Analysis

- **Heavy deps handled correctly:** `mermaid` (~1.5 MB) and `@monaco-editor/react` are dynamically imported ✅ (`mermaid-diagram.tsx:173`, `page-client.tsx:63`, `workspace.tsx:18`).
- **framer-motion in 25 files** including the landing page and every app page — it's in the shared chunk (~35 KB gz). Acceptable for the motion language used, but `MotionConfig` + `AnimatePresence` on trivial fades could move to CSS for the landing to shrink its critical JS.
- **@hugeicons/react + core-free-icons:** named imports are tree-shakeable; verify with `next build` output. Add `experimental.optimizePackageImports: ["@hugeicons/core-free-icons"]` in `next.config.ts` as cheap insurance.
- **`next.config.ts` is empty** — no `images.formats`, no `compress` tuning, no bundle analyzer wired. Add `@next/bundle-analyzer` to CI once.
- **Dead dep:** `monaco-editor` (M9). `@auth/core` is also pinned directly alongside `next-auth` beta — check for version skew producing duplicate auth code in the server bundle.
- **Custom markdown renderer** (`ui/markdown.tsx`) instead of react-markdown+remark: good call, saves ~50 KB.

# Render Analysis

- No `React.memo` anywhere; only `toast.tsx` uses `useCallback`. Most components are small, so the main offenders are the project page (H4) and landing (M5).
- `Markdown` is memoized on `content` ✅ but `renderInline`'s global `_key` counter (`markdown.tsx:6-7`) generates new keys every render → full reconciliation of every inline node whenever the memo misses. Use positional keys.
- Mermaid re-renders on theme flip re-parse every diagram (acceptable; renders are async-guarded ✅).
- Skeletons exist on all pages ✅ — but they appear *after* hydration (H1), so users see: white → shell → skeleton → content. Server-render to cut two stages.
- `suppressHydrationWarning` on `<body>` (`layout.tsx:94`) masks rather than fixes hydration mismatches — audit what triggers it (likely theme class; `next-themes` already handles `<html>`).

# Network Analysis

- **Polling totals (worst case, project page open during a run):** runs poll (1.5 s) + notifications (5 s) + elapsed ticks = ~52 requests/min, payload dominated by redundant JSONB (C2/C3).
- **No cache headers** on any GET; all are auth-scoped dynamic (fine), but `/api/projects` could send `Cache-Control: private, max-age=15, stale-while-revalidate=60`.
- **Waterfalls:** page → JS → 4 API calls (H2); sidebar duplicates one of them (H3).
- **First-visit seed:** `GET /api/projects` runs the whole demo seed inline (`projects/route.ts:11-14`) — dozens of inserts + 3 LLM-free progress recomputes; first dashboard load after signup takes seconds. Move seeding to the sign-in/registration event.
- **`fetch` calls don't pass `AbortSignal`** — navigating away mid-poll leaks in-flight requests (and `load()` can resolve after unmount → setState on unmounted tree; React 19 tolerates it, but the work is wasted).

# Database Analysis

- No indexes (C4). No `EXPLAIN` traps yet because data is small — fix before it isn't.
- JSONB columns (`events`, `trace`, `citations`, `plan`) are written incrementally (atomic `||` append ✅ `store.ts:906`) but read in full constantly (C2/C3). Consider an `events` side table or at least projected list endpoints.
- Sequential per-row writes: run completion path does `setRunPlan` → `completeRun` → `getProjectProgress` (3 counts) → `updateProject`, plus per-decision-entry loops (M1) and per-artifact insert+count (M8) — ~20+ sequential round trips at run end. Batch with `Promise.all` where independent.
- `postgres` driver with `prepare: false` (pooler requirement) makes every query re-plan — one more reason indexes matter.
- Auth uses JWT sessions ✅ (no DB hit per request beyond what handlers do); the Drizzle adapter is only used at sign-in. Good.

# UX Analysis

**Good:** skeletons everywhere, optimistic toast on debate start, live run strip with elapsed timer and event count, run replay when idle, `aria-live` on status strips, reduced-motion respected.

**Gaps:**
- "New run" → first visible event depends on poll phase (up to 1.5 s) — fine; but if the POST dies (C1) the user watches a spinner until the 15-min stale sweep. Surface a "run lost contact" state after ~30 s of no event growth.
- Debate card promises "under a minute" with no progress signal for 30–90 s (H5) — stream entries.
- Approve/Re-open buttons give no pending feedback (M10).
- Kanban drag persists via N sequential updates (H6) — visible lag between drop and settled state on slow links.
- Deliverable tab click resets `selectedVersion` to 1 (`page-client.tsx:676`) — but artifacts display newest by fallback only when v1 missing; selecting an older doc after a new run is one click from confusion. Default to latest version.
- Sidebar shows hardcoded "Jane Doe / Forge Pro" (`sidebar.tsx:126-129`) regardless of session user — not perf, but breaks trust in a polished product.

# Monitoring / Logging

- No web-vitals reporting, no server timing, no error tracker. Add `reportWebVitals` → console/endpoint, and wrap `complete()` (`foundry-iq.ts`) with duration logging per call (it already has timeout/429 retry ✅). One `console.warn` per mermaid failure is the only client logging.

---

# Estimated Performance Improvement

| Area | Now | After P0+P1 |
|------|-----|-------------|
| Steady-state network (project page, run active) | ~2–10 MB/min | <100 KB/min |
| Idle network (any page) | ~12 req/min, full runs payload | ~1–2 req/min, slim payload |
| Project page time-to-content | ~1.2–2.5 s (skeleton → 4 fetches) | ~0.4–0.9 s (SSR + 1 fetch) |
| Run reliability in prod | killed by platform timeout | completes |
| Renders/sec during run | ~2.6 full-tree | ~0.7 scoped |
| Font transfer | ~200 KB | ~80 KB |
| First-load JS (app pages) | unmeasured (no analyzer) | wire analyzer, then cut framer/landing chunks |

# Implementation Status (2026-06-12)

Done in this pass:
- **C1** — orchestration moved to `after()` background execution; POST returns 202 immediately; `maxDuration = 800` on runs route, `120` on decisions route.
- **C2 (partial)** — `GET /runs` now strips `events`/`trace`/`citations` from all runs except the latest and the replay run.
- **C3** — `getAllRuns` projects slim columns (no events/citations/plan/votes); notification poller pauses when tab hidden, polls 5 s only while a run is active, 30 s when idle, refreshes on tab focus.
- **C4** — 7 composite indexes added to schema; migration generated (`drizzle/0010_faulty_valkyrie.sql`). **NOT yet applied — run `npm run db:migrate`** (apply was blocked pending explicit approval; live DB).
- **H4 (partial)** — poll skips `setRuns` when the latest run is unchanged; `deriveLiveView` and `mappedDecisions` memoized.
- **H6** — `reorderTasks` is now a single `UPDATE … FROM (VALUES …)` statement.
- **H7** — Syne pruned to weights 500/600/700 (was 400–800).
- **M1** — `addDecisionEntry` uses atomic jsonb append + projected project lookup.
- **M2** — `getProjectProgress` is 2 parallel queries with `count(*) FILTER`.
- **M4** — project page unwraps `params` with `React.use()` (no null first frame).
- **M5** — landing headline rotator extracted to `<RotatingHeadline />`.
- **M9 (partial)** — dead `monaco-editor` dependency removed from package.json.
- **M10** — approve/re-open buttons have pending state, double-click guarded.
- **Markdown keys** — `renderInline` keys are per-call, not module-global (no full inline remount per render).
- **Assets** — `logo.png` 1.27 MB → 8.4 KB (256px palette), `og-image.png` 412 KB → 58 KB, `og-hero.png` 636 KB → 81 KB.

Second pass (same day):
- **C4 applied** — 7 indexes live in Postgres (applied directly with `CREATE INDEX IF NOT EXISTS`; `db:migrate` unusable — migrations table empty because schema history used `db:push`; `db:push` itself crashes on a drizzle-kit 0.31 CHECK-constraint introspection bug → upgrade drizzle-kit before next schema change). Verified via `pg_indexes` + `EXPLAIN` (runs query uses `runs_project_created_idx`).
- **H2** — `GET /api/projects/[id]/workspace` returns `{project, decisions, artifacts, runs}` in one auth check / one round trip; project page `load()` uses it (was 4 requests × 4 auth checks).
- **H3** — `src/lib/use-projects.ts`: module-level cached `useProjects()` hook with 15 s TTL + in-flight dedupe + cross-consumer listeners; used by sidebar, dashboard, projects page; `invalidateProjects()` on create/delete.
- **SEO** — `robots: { index: false }` meta on all auth-gated pages (dashboard, projects, projects/[id], agents, settings) and signin (robots.txt disallow alone doesn't prevent indexing of linked URLs); Organization JSON-LD added to landing (alongside existing SoftwareApplication + FAQPage); `viewport.themeColor` for dark/light; sitemap/robots/canonicals verified correct.

Still open: H1 (SSR data), H5 (debate streaming), M3 (ISO activity timestamps), M6–M8, monitoring.

# Implementation Roadmap (by ROI)

1. **P0 — survival (1 day):** Quick wins 1–4 (indexes, maxDuration, notification projection + visibility pause), then C1 properly (background run execution returning 202).
2. **P1 — network sanity (1–2 days):** C2 single-run/incremental poll endpoint; H2 workspace endpoint or SSR; H3 SWR-style dedupe; M3 ISO timestamps.
3. **P2 — render & feel (1 day):** H4 memoization + scoped ticker; M4 `React.use(params)`; M5 landing rotator extraction; M10 pending states; H6 batched reorder.
4. **P3 — payload & polish (half day):** H7 fonts; asset compression (logo/og images); M1/M2/M8 store query batching; M9 remove dead dep + self-host monaco.
5. **P4 — durability (ongoing):** SSE for runs/debates; events side-table; web-vitals + LLM-call telemetry; bundle analyzer in CI; virtualized timeline.
