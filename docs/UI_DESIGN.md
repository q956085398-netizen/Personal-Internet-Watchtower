# UI Design Rules

> Status: **Current design baseline**
>
> Primary reference: [`docs/grok-UI-referenc/`](grok-UI-referenc/)
>
> The Grok reference is now the visual baseline. This document records the rules that must remain true when that reference is implemented or evolved. If a screenshot/source file conflicts with a hard rule below, this document wins.

---

## 1. Role of the UI

The dashboard exists to help the user quickly judge whether anything in a small set of familiar places is worth opening.

It is not a Reader, an infinite feed, or a place to restate the product philosophy.

The interface should prioritize:

- concrete content;
- source/state;
- enough metadata to decide whether to click;
- watchpoint status and controls.

---

## 2. Visual direction

Use the Grok reference as the seed:

- warm paper / off-white background;
- dark ink text;
- restrained blue-gray / horizon accent;
- serif display typography for section hierarchy;
- sans-serif for controls and body text;
- soft, low-contrast surfaces;
- subtle 1px borders / very light shadows;
- calm editorial feeling rather than “tech dashboard” styling.

Avoid reintroducing:

- full-screen blue tint;
- strong glow;
- glassmorphism / neumorphism;
- excessive card elevation;
- decorative wallpaper;
- explanation sidebars;
- large slogan blocks;
- busy status decoration.

The UI should feel like a quiet briefing sheet.

---

## 3. Product philosophy belongs in docs, not permanent chrome

The following kinds of copy are **not** persistent dashboard UI:

- “替你去你常去的地方看一眼。有事再进来，没事就关掉。”
- “这个页面不是用来刷的。看完就可以关掉。”
- “有限，有尽头。只回答一件事……”
- “以上就是这次巡逻的全部。没有下一页，没有推荐流……”
- similar slogans, philosophy explanations, or end-of-list speeches.

These ideas remain valid product principles, but belong in README / docs / onboarding if needed.

On the main UI:

- normal content should simply end;
- empty state should be short, e.g. “暂无新内容”;
- patrol completion may simply say “巡逻完成”.

---

## 4. Information architecture

The main dashboard has three sections:

```text
和我有关
关注更新
值得看看
```

These are semantic buckets, not source buckets.

### 4.1 和我有关

Strictly direct account interactions:

- 回复我
- 点赞我
- @我

Possible sources include NGA, Bilibili comments, or future connectors.

Must not include:

- followed streamer live;
- followed UP upload;
- ordinary forum threads;
- hot threads;
- local discovery.

A live event is important, but it is not “about me”.

### 4.2 关注更新

Everything that changed in a place/object the user explicitly asked Watchtower to watch.

Examples:

- NGA / 龙空 board thread;
- followed UP published a new video;
- followed streamer went live;
- subscribed channel/blog updated.

This is where followed livestream notifications belong.

### 4.3 值得看看

Bounded, explainable surfacing inside sources already added by the user.

Examples:

- one concrete watched-forum thread is rapidly gaining replies;
- one concrete Bilibili video matches an explicitly enabled AI rule and is growing fast.

This section never creates a new source.

---

## 5. Show concrete content, not aggregate announcements

The user should be able to decide from the Watchtower itself whether opening the original site is worthwhile.

### Forum

Prefer one visible item per thread.

Show:

- original thread title;
- source + board;
- reply count;
- time;
- optional new/hot/rising signal;
- direct original link.

Avoid making the primary card only:

- “出现 3 个热帖”
- “综合讨论出现 5 个新帖”

If a grouped representation is temporarily used in a prototype, all actual thread titles and reply counts must be visible without another click, and production UI should prefer individual rows.

### Video

Show the actual candidate:

- thumbnail when available;
- original title;
- creator;
- publish time / live status;
- useful metric such as views or current audience;
- direct original link.

For discovery, add only concise explanation such as:

> 匹配 AI 规则 · 近 2 小时增长较快

Do not make “AI 视频正在增长” itself the content card.

### Live

Show:

- streamer;
- live title/topic;
- live badge/state;
- current audience if available;
- direct live-room link.

Live belongs to **关注更新**.

---

## 6. Sidebar

The current Grok layout uses the sidebar for:

- product mark/name;
- last patrol / health;
- current watchpoints grouped by source;
- pause/resume/remove;
- add watchpoint.

Keep it functional.

Do not add permanent:

- product manifesto;
- slogan;
- decorative illustration;
- “read this and close the page” reminders.

A short error/health status is useful because it changes user action.

---

## 7. Section headers

Keep section headers compact:

- section name;
- bounded count;
- optional dismiss/acknowledge action if useful.

Avoid explanatory kicker text that merely restates what the section means. The user learns the semantics once; content deserves the space afterward.

---

## 8. Cards

Card hierarchy:

1. exact content/event title;
2. source + relevant context;
3. concrete excerpt or subject;
4. useful metrics/status;
5. direct-link affordance;
6. optional concise reason.

Reason text must explain a real signal, not repeat philosophy.

Good:

- “你关注的主播开播”
- “过去 1 小时 +90 回复”
- “匹配 AI 规则 · 近 2 小时增长较快”

Bad:

- “不是广场噪音”
- “这是你主动加入的世界”
- “看完就可以关掉”

---

## 9. Motion

Motion stays subtle.

Allowed:

- gentle initial fade/rise;
- live-dot pulse;
- small hover state.

Avoid:

- card floating;
- scale-up;
- glow;
- large parallax;
- attention-seeking looping animation.

Respect `prefers-reduced-motion`.

---

## 10. Add-watchpoint flow

Adding or removing a familiar place must remain simple.

The user should not need to see:

- RSSHub route;
- XPath;
- CSS selector;
- scraping implementation;
- Playwright configuration.

The add dialog may explain the immediate operation, but should not repeat the full product philosophy.

---

## 11. Empty/error states

### Empty

Keep it minimal:

> 暂无新内容

No speech, slogan, or moral framing.

### Connector error

This is actionable and should be visible:

- which source/watchpoint failed;
- whether cached data is stale;
- re-auth / retry action when available.

A broken connector must not hide healthy sources.

---

## 12. Reference implementation hygiene

`docs/grok-UI-referenc/` is a **UI reference**, not the production architecture.

Keep:

- the watchtower UI source;
- styles/tokens;
- enough project files to inspect or run the reference.

Screenshots may be regenerated from the corrected source, but outdated screenshots must not remain as design authority.

Do not treat Grok/App Builder infrastructure as product requirements.

Generated/provider-specific artifacts such as `.grok/`, `.vercel/output/`, project IDs, preview logs, or unrelated generator skills should not guide the product and should not be committed when they are not needed to run/reference the UI.

---

## 13. Design review checklist

Before accepting a UI change:

- [ ] Is “和我有关” limited to replies / likes / @mentions?
- [ ] Are followed uploads and followed livestreams in “关注更新”?
- [ ] Are forum items concrete titles with reply counts rather than only aggregate announcements?
- [ ] Are video/discovery items concrete titles/thumbnails rather than vague summary cards?
- [ ] Does the UI still only use sources the user explicitly added?
- [ ] Is the result bounded?
- [ ] Is there persistent slogan/philosophy/end-of-feed copy? If yes, remove it.
- [ ] Are errors/status shown only when actionable?
- [ ] Does visual styling still follow the warm, restrained Grok baseline?
- [ ] Can the user decide whether to open the original site within a few seconds?

