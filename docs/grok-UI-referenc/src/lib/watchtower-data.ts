export type ConnectorId = "nga" | "bilibili" | "lkong" | "tieba" | "youtube" | "rss";

export type SectionId = "about-me" | "following" | "worth";

export type EventKind =
  | "account_reply"
  | "account_mention"
  | "account_like"
  | "live"
  | "following_upload"
  | "board_hot"
  | "board_latest"
  | "discover";

export type WatchStatus = "ok" | "error" | "stale";

export type ChildLink = {
  title: string;
  url: string;
  meta?: string;
};

export type Metric = {
  label: string;
  value: string;
};

export type Watchpoint = {
  id: string;
  connector: ConnectorId;
  name: string;
  detail: string;
  paused: boolean;
  status: WatchStatus;
  error?: string;
};

export type EventItem = {
  id: string;
  watchpointId: string;
  connector: ConnectorId;
  section: SectionId;
  kind: EventKind;
  title: string;
  reason: string;
  url: string;
  sourceLabel: string;
  minutesAgo: number;
  author?: string;
  summary?: string;
  metrics?: Metric[];
  children?: ChildLink[];
  live?: boolean;
};

export const CONNECTORS: Record<
  ConnectorId,
  { name: string; short: string; mark: string; blurb: string }
> = {
  nga: {
    name: "NGA",
    short: "NGA",
    mark: "N",
    blurb: "板块新帖、热帖，以及与你有关的回复。",
  },
  bilibili: {
    name: "Bilibili",
    short: "B站",
    mark: "B",
    blurb: "关注的人更新、开播；可选的站内发现。",
  },
  lkong: {
    name: "龙空",
    short: "龙空",
    mark: "龙",
    blurb: "指定板块的新讨论和升温帖。",
  },
  tieba: {
    name: "贴吧",
    short: "贴吧",
    mark: "贴",
    blurb: "常逛的吧有新帖或热议。",
  },
  youtube: {
    name: "YouTube",
    short: "YT",
    mark: "YT",
    blurb: "订阅频道的新视频。",
  },
  rss: {
    name: "RSS",
    short: "RSS",
    mark: "R",
    blurb: "博客或任何 RSS / Atom 源。",
  },
};

export const SECTIONS: Record<SectionId, { title: string; cap: number }> = {
  "about-me": {
    title: "和我有关",
    cap: 5,
  },
  following: {
    title: "关注更新",
    cap: 10,
  },
  worth: {
    title: "值得看看",
    cap: 5,
  },
};

export const SECTION_ORDER: SectionId[] = ["about-me", "following", "worth"];

export const SEED_WATCHPOINTS: Watchpoint[] = [
  {
    id: "nga-azeroth",
    connector: "nga",
    name: "艾泽拉斯议事厅",
    detail: "新帖与热帖",
    paused: false,
    status: "ok",
  },
  {
    id: "nga-me",
    connector: "nga",
    name: "与我有关",
    detail: "回复、点赞与 @",
    paused: false,
    status: "ok",
  },
  {
    id: "bili-follow",
    connector: "bilibili",
    name: "关注更新",
    detail: "关注的 UP 投稿",
    paused: false,
    status: "ok",
  },
  {
    id: "bili-live",
    connector: "bilibili",
    name: "关注直播",
    detail: "关注的主播开播",
    paused: false,
    status: "ok",
  },
  {
    id: "bili-ai",
    connector: "bilibili",
    name: "站内发现 · AI",
    detail: "仅 B 站内部，你主动开启的标签",
    paused: true,
    status: "ok",
  },
  {
    id: "lkong-general",
    connector: "lkong",
    name: "综合讨论",
    detail: "板块新讨论",
    paused: false,
    status: "error",
    error: "登录态失效。上次成功约 18 分钟前，快照仍来自那次检查。",
  },
  {
    id: "lkong-digital",
    connector: "lkong",
    name: "数码",
    detail: "板块新讨论",
    paused: false,
    status: "ok",
  },
];

export const SEED_EVENTS: EventItem[] = [
  {
    id: "e-live-lao",
    watchpointId: "bili-live",
    connector: "bilibili",
    section: "following",
    kind: "live",
    live: true,
    title: "老番茄 正在直播",
    author: "老番茄",
    summary: "只狼速通练习 · 不说话版",
    reason: "你关注的主播开播了。",
    url: "https://live.bilibili.com/115",
    sourceLabel: "B站 · 关注直播",
    minutesAgo: 4,
    metrics: [{ label: "人气", value: "3.2 万" }],
  },
  {
    id: "e-nga-reply",
    watchpointId: "nga-me",
    connector: "nga",
    section: "about-me",
    kind: "account_reply",
    title: "你的回复收到 2 条新回复",
    summary: "怀旧服现在入坑，会不会马上被丢下？",
    reason: "有人接上了你在帖子里的话。",
    url: "https://bbs.nga.cn/read.php?tid=38412011",
    sourceLabel: "NGA · 与我有关",
    minutesAgo: 12,
  },
  {
    id: "e-nga-mention",
    watchpointId: "nga-me",
    connector: "nga",
    section: "about-me",
    kind: "account_mention",
    title: "有人在帖子里 @ 了你",
    summary: "求一份你们当年用的插件列表",
    reason: "有人在帖子里 @ 了你。",
    url: "https://bbs.nga.cn/read.php?tid=38409802",
    sourceLabel: "NGA · 与我有关",
    minutesAgo: 26,
  },
  {
    id: "e-nga-like",
    watchpointId: "nga-me",
    connector: "nga",
    section: "about-me",
    kind: "account_like",
    title: "你的帖子收到 3 个赞",
    summary: "关于把插件配置从旧电脑迁出来的笔记",
    reason: "你发过的东西有了新反馈。",
    url: "https://bbs.nga.cn/read.php?tid=38399104",
    sourceLabel: "NGA · 与我有关",
    minutesAgo: 48,
  },
  {
    id: "e-bili-ysfj",
    watchpointId: "bili-follow",
    connector: "bilibili",
    section: "following",
    kind: "following_upload",
    title: "我们把 IMAX 胶片扫描进了电脑",
    summary: "影视飓风",
    reason: "你关注的 UP 更新了。",
    url: "https://www.bilibili.com/video/BV1ys411c7mD",
    sourceLabel: "B站 · 关注更新",
    author: "影视飓风",
    minutesAgo: 35,
    metrics: [
      { label: "时长", value: "18:24" },
      { label: "播放", value: "12.4 万" },
    ],
  },
  {
    id: "e-bili-he",
    watchpointId: "bili-follow",
    connector: "bilibili",
    section: "following",
    kind: "following_upload",
    title: "我把书桌的线藏进了桌子里",
    summary: "老师好我叫何同学",
    reason: "你关注的 UP 更新了。",
    url: "https://www.bilibili.com/video/BV1he411c7mD",
    sourceLabel: "B站 · 关注更新",
    author: "老师好我叫何同学",
    minutesAgo: 82,
    metrics: [
      { label: "时长", value: "11:07" },
      { label: "播放", value: "86.1 万" },
    ],
  },
  {
    id: "e-nga-hot-digest",
    watchpointId: "nga-azeroth",
    connector: "nga",
    section: "following",
    kind: "board_hot",
    title: "常看板块出现 3 个新热帖",
    reason: "你让我盯着的地方，这几条正在升温。",
    url: "https://bbs.nga.cn/thread.php?fid=-7",
    sourceLabel: "NGA · 艾泽拉斯议事厅",
    minutesAgo: 28,
    children: [
      {
        title: "国服新赛季第一周，你们的开荒进度呢",
        url: "https://bbs.nga.cn/read.php?tid=38413001",
        meta: "412 回复",
      },
      {
        title: "有没有已经弃坑的人回来看看",
        url: "https://bbs.nga.cn/read.php?tid=38412887",
        meta: "208 回复",
      },
      {
        title: "今年这个资料片的剧情，真的看完了吗",
        url: "https://bbs.nga.cn/read.php?tid=38411920",
        meta: "156 回复",
      },
    ],
  },
  {
    id: "e-lkong-digital",
    watchpointId: "lkong-digital",
    connector: "lkong",
    section: "following",
    kind: "board_latest",
    title: "数码板块出现 2 个新讨论",
    reason: "你常看的板块有了新帖。",
    url: "https://www.lkong.com/forum-digital",
    sourceLabel: "龙空 · 数码",
    minutesAgo: 41,
    children: [
      {
        title: "这代旗舰的影像，到底值不值得换",
        url: "https://www.lkong.com/thread-882911",
        meta: "67 回复",
      },
      {
        title: "折叠屏用了一年，我的真实感受",
        url: "https://www.lkong.com/thread-882874",
        meta: "31 回复",
      },
    ],
  },
  {
    id: "e-lkong-general",
    watchpointId: "lkong-general",
    connector: "lkong",
    section: "following",
    kind: "board_latest",
    title: "综合讨论出现 5 个新帖",
    reason: "上次成功检查时记下的快照，数据可能不是最新。",
    url: "https://www.lkong.com/forum-general",
    sourceLabel: "龙空 · 综合讨论",
    minutesAgo: 55,
    children: [
      {
        title: "最近大家都在读什么，推荐一下",
        url: "https://www.lkong.com/thread-771204",
        meta: "89 回复",
      },
      {
        title: "远程工作三年后，我决定回办公室",
        url: "https://www.lkong.com/thread-771188",
        meta: "44 回复",
      },
    ],
  },
  {
    id: "e-bili-john",
    watchpointId: "bili-follow",
    connector: "bilibili",
    section: "following",
    kind: "following_upload",
    title: "一首被写成历史脚注的军歌",
    summary: "小约翰可会唱",
    reason: "你关注的 UP 更新了。",
    url: "https://www.bilibili.com/video/BV1jo411c7mD",
    sourceLabel: "B站 · 关注更新",
    author: "小约翰可会唱",
    minutesAgo: 110,
    metrics: [{ label: "时长", value: "14:52" }],
  },
  {
    id: "e-nga-heat",
    watchpointId: "nga-azeroth",
    connector: "nga",
    section: "worth",
    kind: "board_hot",
    title: "插件配置从旧电脑迁出来，有没有更省事的办法？",
    summary: "过去 1 小时新增 90 条回复",
    reason: "回复增长明显加速",
    url: "https://bbs.nga.cn/read.php?tid=38412560",
    sourceLabel: "NGA · 艾泽拉斯议事厅",
    minutesAgo: 18,
    metrics: [
      { label: "1 小时", value: "+90 回复" },
      { label: "现在", value: "214 回复" },
    ],
  },
  {
    id: "e-ai-agent",
    watchpointId: "bili-ai",
    connector: "bilibili",
    section: "worth",
    kind: "discover",
    title: "我让本地模型自己在电脑上干活，失败了三次",
    summary: "本地 Agent 实测",
    author: "某个不上热门的 UP",
    reason: "匹配你开启的「AI」标签 · 过去 2 小时播放 2,100 → 15,400。",
    url: "https://www.bilibili.com/video/BV1ai411c7mD",
    sourceLabel: "B站 · 站内发现",
    minutesAgo: 22,
    metrics: [
      { label: "2 小时播放", value: "2.1k → 15.4k" },
      { label: "收藏率", value: "8.4%" },
    ],
  },
  {
    id: "e-ai-claude",
    watchpointId: "bili-ai",
    connector: "bilibili",
    section: "worth",
    kind: "discover",
    title: "把一周的会议纪要交给模型之后",
    summary: "会议纪要自动整理工作流",
    author: "少数派里的那类作者",
    reason: "匹配「AI」· 发布时间新 · 收藏率和评论比同段位视频更高。",
    url: "https://www.bilibili.com/video/BV1cl411c7mD",
    sourceLabel: "B站 · 站内发现",
    minutesAgo: 64,
    metrics: [
      { label: "播放", value: "4.8 万" },
      { label: "收藏率", value: "11.2%" },
    ],
  },
];

export type WatchTemplate = {
  watchpoint: Watchpoint;
  events: EventItem[];
};

export const ADDABLE_TEMPLATES: WatchTemplate[] = [
  {
    watchpoint: {
      id: "nga-game",
      connector: "nga",
      name: "游戏综合",
      detail: "新帖与热帖",
      paused: false,
      status: "ok",
    },
    events: [
      {
        id: "e-nga-game-1",
        watchpointId: "nga-game",
        connector: "nga",
        section: "following",
        kind: "board_latest",
        title: "今年还有哪款单机值得专门腾出周末",
        reason: "热帖",
        url: "https://bbs.nga.cn/read.php?tid=38414002",
        sourceLabel: "NGA · 游戏综合",
        minutesAgo: 16,
        metrics: [{ label: "回复", value: "173" }],
      },
    ],
  },
  {
    watchpoint: {
      id: "tieba-digital",
      connector: "tieba",
      name: "数码吧",
      detail: "新帖与热议",
      paused: false,
      status: "ok",
    },
    events: [
      {
        id: "e-tieba-1",
        watchpointId: "tieba-digital",
        connector: "tieba",
        section: "following",
        kind: "board_hot",
        title: "新笔记本的屏幕，纸感校准有没有意义",
        reason: "热帖",
        url: "https://tieba.baidu.com/p/9120001",
        sourceLabel: "贴吧 · 数码吧",
        minutesAgo: 9,
        metrics: [{ label: "回复", value: "240" }],
      },
    ],
  },
  {
    watchpoint: {
      id: "yt-subs",
      connector: "youtube",
      name: "订阅更新",
      detail: "订阅频道的新视频",
      paused: false,
      status: "ok",
    },
    events: [
      {
        id: "e-yt-1",
        watchpointId: "yt-subs",
        connector: "youtube",
        section: "following",
        kind: "following_upload",
        title: "The Most Boring Phone of the Year",
        summary: "MKBHD",
        reason: "你订阅的频道更新了。",
        url: "https://www.youtube.com/watch?v=dQw4w9wg",
        sourceLabel: "YouTube · 订阅",
        author: "Marques Brownlee",
        minutesAgo: 7,
        metrics: [{ label: "时长", value: "12:04" }],
      },
    ],
  },
  {
    watchpoint: {
      id: "rss-blog",
      connector: "rss",
      name: "独立博客",
      detail: "RSS / Atom",
      paused: false,
      status: "ok",
    },
    events: [
      {
        id: "e-rss-1",
        watchpointId: "rss-blog",
        connector: "rss",
        section: "following",
        kind: "board_latest",
        title: "一篇新文章",
        summary: "把工作电脑从推荐流里救回来",
        reason: "你订阅的源更新了。",
        url: "https://example.com/blog/save-attention",
        sourceLabel: "RSS · 独立博客",
        minutesAgo: 3,
      },
    ],
  },
];

export function mergeWatchpoints(
  pausedIds: string[],
  resumedIds: string[],
  removedIds: string[],
  extra: Watchpoint[],
): Watchpoint[] {
  const removed = new Set(removedIds);
  const paused = new Set(pausedIds);
  const resumed = new Set(resumedIds);
  const fromSeed = SEED_WATCHPOINTS.filter((w) => !removed.has(w.id)).map((w) => ({
    ...w,
    paused: paused.has(w.id) ? true : resumed.has(w.id) ? false : w.paused,
  }));
  const seen = new Set(fromSeed.map((w) => w.id));
  const fromExtra = extra
    .filter((w) => !removed.has(w.id) && !seen.has(w.id))
    .map((w) => ({
      ...w,
      paused: paused.has(w.id) ? true : resumed.has(w.id) ? false : w.paused,
    }));
  return [...fromSeed, ...fromExtra];
}

export function mergeEvents(
  extra: EventItem[],
  removedIds: string[],
): EventItem[] {
  const removed = new Set(removedIds);
  const seed = SEED_EVENTS.filter((e) => !removed.has(e.watchpointId));
  const extras = extra.filter((e) => !removed.has(e.watchpointId));
  const seen = new Set(seed.map((e) => e.id));
  return [...seed, ...extras.filter((e) => !seen.has(e.id))];
}
