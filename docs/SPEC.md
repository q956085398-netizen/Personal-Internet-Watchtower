# v0 Product & Engineering Spec

> Status: Draft  
> Target: single-user, self-hosted MVP  
> North star: **不是帮我找到更多互联网，而是让我少去检查互联网。**

## 1. Problem

The user repeatedly interrupts ongoing work to check a small set of familiar places:

- whether frequently visited forum boards have new or hot threads;
- whether replies, mentions, likes, or other account-related events happened;
- whether followed creators uploaded;
- whether followed streamers are live;
- whether a familiar community has a discussion worth opening.

The larger cost is not reading time, but **checking behavior**:

```text
open app → refresh → maybe nothing important → get pulled into feed → repeat elsewhere
```

Watchtower should perform the checking on the user's behalf.

## 2. Product Goal

The product should answer one question quickly:

> **“我平时会看的这几个地方，现在有没有值得我点进去看的东西？”**

Expected interaction:

```text
Open Watchtower
      │
      ├── something matters → click → original website
      │
      └── nothing matters   → close Watchtower
```

Watchtower is a finite dashboard, not a destination for content consumption.

## 3. Non-goals

Out of scope for v0:

- global / cross-web search;
- automatic discovery of new websites;
- recommendation of new information sources;
- infinite scrolling;
- social features;
- comments or replies inside Watchtower;
- full article/video consumption inside Watchtower;
- cross-device reading progress;
- heavy reading history;
- long-term full-content archiving;
- black-box “猜你喜欢” recommendation;
- engagement optimization;
- multi-user support.

## 4. Core Product Rules

### R1 — Sources are explicitly user-selected

Only fetch from places the user explicitly added.

If the user added NGA, Bilibili and 龙空, the system must not silently search YouTube, Reddit, Tieba or elsewhere.

### R2 — Discovery is local to an existing source

Optional discovery may exist **inside** a source already added by the user.

Example: Bilibili is already configured → user explicitly enables an “AI” rule → Watchtower may surface fast-growing AI videos from Bilibili.

This must not create new external sources.

### R3 — The dashboard has an end

No endless feed. The dashboard must return bounded results and stop naturally.

When there is nothing new, use a minimal empty state. Do not use persistent philosophy/slogan/end-of-feed copy to explain this principle.

### R4 — Clicking leaves Watchtower

Cards link to the original site. Watchtower does not replace the original reading / viewing experience.

### R5 — A watched place must be easy to enter and leave

Adding, pausing and removing a watchpoint are core flows.

## 5. Core Concepts

### 5.1 Connector

Site-specific adapter responsible for acquiring data.

Possible implementations:

- official/web API;
- RSS/Atom;
- RSSHub;
- authenticated HTTP requests;
- HTML parsing;
- browser automation only where unavoidable.

Core must not care which mechanism is used.

### 5.2 Watchpoint

A concrete place/rule the user wants Watchtower to check.

Examples:

- NGA board X;
- 龙空 forum Y;
- Bilibili followed creators;
- Bilibili followed live streamers.

A Watchpoint belongs to a Connector and has its own enabled/paused state and polling configuration.

### 5.3 Event / Item

Normalized output shown to the dashboard.

Minimum shape:

```text
id
connector
watchpoint_id
event_type
title
summary?
url
author?
published_at?
discovered_at
thumbnail?
metrics?
reason
```

`reason` explains why the item is shown, e.g.:

- 你关注的 UP 更新了
- 你常看的板块出现新热帖
- 你的回复收到新回复
- 该视频过去 1 小时播放增长较快

### 5.4 Metric Snapshot

Optional short-term observation used only when trend/growth matters.

Example:

```text
item_id
captured_at
view
like
favorite
coin
reply
share
```

This is **not reading history**.

## 6. MVP Functional Scope

### 6.1 NGA

Target:

- configured board latest threads;
- configured board hot/active threads where feasible;
- account-related events: reply / @ / like / followed-thread update where technically feasible.

Important: account-event availability is a feasibility blocker and must be validated before committing to implementation.

### 6.2 Bilibili

Target:

- updates from followed creators;
- live status for followed streamers;
- optionally followed dynamics if stable enough;
- direct link to original video/live page.

### 6.3 龙空

Target:

- configured forum latest threads;
- hot/active discussions if a stable signal exists;
- configured thread updates if easy to support.

## 7. Dashboard Behavior

The dashboard is intentionally small and follows the current UI baseline in `docs/grok-UI-referenc/`.

### 7.1 Fixed information architecture

```text
和我有关
关注更新
值得看看
```

**和我有关** contains only direct account interactions:

- reply to me;
- like on my content;
- @mention.

It must **not** contain followed livestreams, followed creator uploads, forum latest/hot threads, or discovery items.

**关注更新** contains changes from explicit watchpoints:

- concrete forum threads from boards the user watches;
- followed creator uploads;
- followed streamer live status;
- other explicit subscription/watchpoint updates.

**值得看看** contains bounded, explainable surfacing inside already-added sources:

- a specific thread whose reply activity is accelerating;
- a specific Bilibili video matching an explicitly enabled local tag/rule;
- similar source-local discovery.

### 7.2 Content presentation

Do not replace concrete content with vague summaries.

For forum content, show individual thread title + reply count.  
For video content, show the actual title and thumbnail when available.  
For live content, show the actual streamer/live title and live status.

Examples of content to avoid:

- “出现 3 个热帖”
- “有一个帖子热度上升”
- “AI 相关视频正在快速增长”

Instead, list the actual candidate items that caused those signals.

### 7.3 Visual behavior

- bounded card counts;
- no infinite scroll or next page;
- every actionable card links to the original site;
- source/status/reason stay concise;
- no persistent product-philosophy copy in header/sidebar/footer;
- empty state is minimal;
- one broken Connector must not break the whole page.

The design rules in `docs/UI_DESIGN.md` and the current Grok reference override older mockups.

## 8. Watchpoint Management

The user must be able to:

- add a supported place;
- configure the minimal site-specific scope;
- pause it without deleting credentials;
- resume it;
- remove it;
- optionally clear its local cache/history.

Product UI should not require users to understand RSSHub routes, XPath, CSS selectors or Playwright.

## 9. Credentials & Security

Preference order:

```text
OAuth/token → session/cookie → browser session → username/password
```

Requirements:

- no credentials committed to Git;
- front-end never receives unnecessary raw credentials;
- local/self-hosted v0 may use env/secret files;
- credentials are scoped to a Connector, not duplicated per Watchpoint;
- removing a Watchpoint must not automatically delete shared Connector credentials;
- removing the final use of a Connector may offer credential cleanup.

## 10. Polling & Failure Behavior

Different capabilities may poll at different frequencies.

Requirements:

- Connector can define sensible default intervals;
- scheduler prevents overlapping runs for the same Watchpoint;
- failures are isolated per Watchpoint/Connector;
- repeated errors become visible in status UI/logs;
- respect rate limits and avoid aggressive scraping;
- stale data should be distinguishable from fresh data.

## 11. Storage

Use SQLite for v0 unless a blocker appears.

Store only what is needed for:

- Watchpoint configuration;
- normalized current/recent items;
- deduplication;
- last-success/last-error state;
- optional metric snapshots;
- lightweight caches.

Do not build a long-term reading archive.

## 12. Connector Contract

A minimal conceptual contract:

```text
Connector
  metadata()
  capabilities()
  validate_credentials?()
  list_watchpoint_options?()
  poll(watchpoint) -> Event[]
```

Optional capabilities can exist, but the core must not assume every Connector supports:

- hot ranking;
- account events;
- search;
- metrics;
- live state.

The concrete interface is finalized in a dedicated architecture ticket.

## 13. Phase-0 Blockers

These unknowns block implementation choices and must be resolved first.

### B1 — NGA authenticated capabilities

Need to determine whether these can be obtained reliably:

- replies to me;
- mentions;
- likes;
- followed-thread updates;
- session lifetime and anti-bot behavior.

**Unblocks:** NGA account-event implementation and final NGA MVP scope.

### B2 — Bilibili authenticated/following capabilities

Need to validate:

- followed creator updates;
- followed live status;
- stable APIs/routes;
- session lifetime;
- request/rate-limit behavior.

**Unblocks:** Bilibili Connector implementation.

### B3 — 龙空 stability

Need to validate:

- board feed stability;
- hot/active signal;
- thread update detection;
- whether login is needed for target use cases.

**Unblocks:** 龙空 Connector implementation.

### B4 — UI foundation — resolved

Decision: use a lightweight custom UI. The current runnable reference lives in:

`docs/grok-UI-referenc/`

The reference establishes layout, typography, color/surface direction, watchpoint controls, and card language. `docs/UI_DESIGN.md` records the intentional deviations and hard information-architecture rules.

This is no longer an implementation blocker.

### B5 — Connector contract

Need the smallest stable contract between site-specific adapters and core.

**Unblocks:** all production Connector work, scheduler integration and normalized persistence.

## 14. MVP Acceptance Criteria

The MVP is considered usable when:

1. NGA, Bilibili and 龙空 each have at least one stable configured Watchpoint.
2. The system polls them automatically without manual refresh of the original apps.
3. Results are normalized into one finite dashboard.
4. Every card explains its source/reason and opens the original site.
5. Watchpoints can be added, paused, resumed and removed.
6. One Connector failure does not break the rest of the dashboard.
7. Credentials are not stored in the repository or exposed unnecessarily to the browser.
8. The page can legitimately show “nothing worth checking right now.”
9. “和我有关” contains only direct interactions; followed uploads/live events appear under “关注更新”.
10. Forum/video/live cards expose concrete candidate content rather than only aggregate summaries.
11. The user can use Watchtower for a trial period and reduce routine “just checking” visits to the original apps.

## 15. Deferred Experiment — Bilibili Local Discovery

Not required for MVP.

After the basic Watchtower is useful, an opt-in Bilibili-only experiment may use:

- explicit user keyword/tag, e.g. AI;
- publish time;
- play count;
- play-count growth;
- favorite/like/coin/reply ratios;
- creator baseline if available.

Requirements:

- source must already be Bilibili;
- user explicitly enables it;
- ranking is explainable;
- bounded number of results;
- no cross-web expansion.

## 16. Success Metric

Do **not** optimize for:

- time-on-site;
- cards viewed;
- recommendation impressions;
- session depth.

The useful question is:

> **Did Watchtower reduce how often the user opened several apps merely to check whether something happened?**
