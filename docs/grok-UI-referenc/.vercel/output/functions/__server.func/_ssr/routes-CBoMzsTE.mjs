import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as RefreshCw, c as Menu, d as ArrowUpRight, i as RotateCcw, l as CircleAlert, o as Plus, r as Trash2, s as Pause, t as X, u as Check } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, c as DialogTrigger$1, f as Slot, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as formatDistanceToNowStrict, t as zhCN } from "../_libs/date-fns.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/@radix-ui/react-switch+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CBoMzsTE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-horizon text-horizon-fg hover:bg-horizon/90",
			outline: "bg-paper-raised text-ink shadow-card hover:shadow-card-hover",
			ghost: "text-ink hover:bg-paper-sunken",
			silent: "text-ink-muted hover:bg-paper-sunken hover:text-ink",
			danger: "text-live hover:bg-live/10"
		},
		size: {
			default: "h-11 rounded-md px-4 text-sm",
			sm: "h-9 rounded-sm px-3 text-sm",
			lg: "h-12 rounded-md px-5 text-sm",
			icon: "size-11 rounded-md",
			"icon-sm": "size-9 rounded-sm"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function TowerMark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className: cn("text-horizon", className),
		fill: "none",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				className: "tower-beam",
				d: "M16.5 9.2 L27 5.5 M16.5 9.2 L27 13",
				stroke: "currentColor",
				strokeWidth: "0.9",
				opacity: "0.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M4 24 H28",
				stroke: "currentColor",
				strokeWidth: "1"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M16 11 V24",
				stroke: "currentColor",
				strokeWidth: "1.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M13.5 7.2 L16 5.4 L18.5 7.2 V11.2 H13.5 Z",
				fill: "currentColor"
			})
		]
	});
}
function HorizonRule({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 240 24",
		className: cn("text-horizon", className),
		fill: "none",
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M0 18 H108",
				stroke: "currentColor",
				strokeWidth: "1",
				opacity: "0.35"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M120 9 V18",
				stroke: "currentColor",
				strokeWidth: "1.4"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M114.5 6.2 L120 4.2 L125.5 6.2 V10.2 H114.5 Z",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M132 18 H240",
				stroke: "currentColor",
				strokeWidth: "1",
				opacity: "0.35"
			})
		]
	});
}
function SourceMark({ label, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-paper-sunken font-mono text-[10px] font-medium tracking-tight text-horizon", className),
		"aria-hidden": "true",
		children: label
	});
}
function TimeAgo({ minutesAgo }) {
	const [label, setLabel] = (0, import_react.useState)("刚刚");
	(0, import_react.useEffect)(() => {
		const stamp = Date.now() - minutesAgo * 6e4;
		setLabel(formatDistanceToNowStrict(stamp, {
			locale: zhCN,
			addSuffix: true
		}));
	}, [minutesAgo]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
		className: "tabular-nums",
		children: label
	});
}
var CONNECTORS = {
	nga: {
		name: "NGA",
		short: "NGA",
		mark: "N",
		blurb: "板块新帖、热帖，以及与你有关的回复。"
	},
	bilibili: {
		name: "Bilibili",
		short: "B站",
		mark: "B",
		blurb: "关注的人更新、开播；可选的站内发现。"
	},
	lkong: {
		name: "龙空",
		short: "龙空",
		mark: "龙",
		blurb: "指定板块的新讨论和升温帖。"
	},
	tieba: {
		name: "贴吧",
		short: "贴吧",
		mark: "贴",
		blurb: "常逛的吧有新帖或热议。"
	},
	youtube: {
		name: "YouTube",
		short: "YT",
		mark: "YT",
		blurb: "订阅频道的新视频。"
	},
	rss: {
		name: "RSS",
		short: "RSS",
		mark: "R",
		blurb: "博客或任何 RSS / Atom 源。"
	}
};
var SECTIONS = {
	"about-me": {
		title: "和我有关",
		kicker: "真正发生在你身上的事",
		cap: 5
	},
	following: {
		title: "关注更新",
		kicker: "你常去的地方，有没有新东西",
		cap: 10
	},
	worth: {
		title: "值得看看",
		kicker: "只在你已添加的来源里，且你主动开启",
		cap: 5
	}
};
var SECTION_ORDER = [
	"about-me",
	"following",
	"worth"
];
var SEED_WATCHPOINTS = [
	{
		id: "nga-azeroth",
		connector: "nga",
		name: "艾泽拉斯议事厅",
		detail: "新帖与热帖",
		paused: false,
		status: "ok"
	},
	{
		id: "nga-me",
		connector: "nga",
		name: "与我有关",
		detail: "回复、点赞与 @",
		paused: false,
		status: "ok"
	},
	{
		id: "bili-follow",
		connector: "bilibili",
		name: "关注更新",
		detail: "关注的 UP 投稿",
		paused: false,
		status: "ok"
	},
	{
		id: "bili-live",
		connector: "bilibili",
		name: "关注直播",
		detail: "关注的主播开播",
		paused: false,
		status: "ok"
	},
	{
		id: "bili-ai",
		connector: "bilibili",
		name: "站内发现 · AI",
		detail: "仅 B 站内部，你主动开启的标签",
		paused: true,
		status: "ok"
	},
	{
		id: "lkong-general",
		connector: "lkong",
		name: "综合讨论",
		detail: "板块新讨论",
		paused: false,
		status: "error",
		error: "登录态失效。上次成功约 18 分钟前，快照仍来自那次检查。"
	},
	{
		id: "lkong-digital",
		connector: "lkong",
		name: "数码",
		detail: "板块新讨论",
		paused: false,
		status: "ok"
	}
];
var SEED_EVENTS = [
	{
		id: "e-live-lao",
		watchpointId: "bili-live",
		connector: "bilibili",
		section: "about-me",
		kind: "live",
		live: true,
		title: "老番茄 正在直播",
		author: "老番茄",
		summary: "只狼速通练习 · 不说话版",
		reason: "你关注的主播开播了。点进去就是直播间。",
		url: "https://live.bilibili.com/115",
		sourceLabel: "B站 · 关注直播",
		minutesAgo: 4,
		metrics: [{
			label: "人气",
			value: "3.2 万"
		}]
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
		minutesAgo: 12
	},
	{
		id: "e-nga-mention",
		watchpointId: "nga-me",
		connector: "nga",
		section: "about-me",
		kind: "account_mention",
		title: "有人在帖子里 @ 了你",
		summary: "求一份你们当年用的插件列表",
		reason: "需要你本人看到的提问，不是广场噪音。",
		url: "https://bbs.nga.cn/read.php?tid=38409802",
		sourceLabel: "NGA · 与我有关",
		minutesAgo: 26
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
		minutesAgo: 48
	},
	{
		id: "e-bili-ysfj",
		watchpointId: "bili-follow",
		connector: "bilibili",
		section: "following",
		kind: "following_upload",
		title: "影视飓风 更新了视频",
		summary: "我们把 IMAX 胶片扫描进了电脑",
		reason: "你关注的 UP 更新了。",
		url: "https://www.bilibili.com/video/BV1ys411c7mD",
		sourceLabel: "B站 · 关注更新",
		author: "影视飓风",
		minutesAgo: 35,
		metrics: [{
			label: "时长",
			value: "18:24"
		}, {
			label: "播放",
			value: "12.4 万"
		}]
	},
	{
		id: "e-bili-he",
		watchpointId: "bili-follow",
		connector: "bilibili",
		section: "following",
		kind: "following_upload",
		title: "老师好我叫何同学 更新了视频",
		summary: "我把书桌的线藏进了桌子里",
		reason: "你关注的 UP 更新了。",
		url: "https://www.bilibili.com/video/BV1he411c7mD",
		sourceLabel: "B站 · 关注更新",
		author: "老师好我叫何同学",
		minutesAgo: 82,
		metrics: [{
			label: "时长",
			value: "11:07"
		}, {
			label: "播放",
			value: "86.1 万"
		}]
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
				meta: "412 回复"
			},
			{
				title: "有没有已经弃坑的人回来看看",
				url: "https://bbs.nga.cn/read.php?tid=38412887",
				meta: "208 回复"
			},
			{
				title: "今年这个资料片的剧情，真的看完了吗",
				url: "https://bbs.nga.cn/read.php?tid=38411920",
				meta: "156 回复"
			}
		]
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
		children: [{
			title: "这代旗舰的影像，到底值不值得换",
			url: "https://www.lkong.com/thread-882911",
			meta: "67 回复"
		}, {
			title: "折叠屏用了一年，我的真实感受",
			url: "https://www.lkong.com/thread-882874",
			meta: "31 回复"
		}]
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
		children: [{
			title: "最近大家都在读什么，推荐一下",
			url: "https://www.lkong.com/thread-771204",
			meta: "89 回复"
		}, {
			title: "远程工作三年后，我决定回办公室",
			url: "https://www.lkong.com/thread-771188",
			meta: "44 回复"
		}]
	},
	{
		id: "e-bili-john",
		watchpointId: "bili-follow",
		connector: "bilibili",
		section: "following",
		kind: "following_upload",
		title: "小约翰可会唱 更新了视频",
		summary: "一首被写成历史脚注的军歌",
		reason: "你关注的 UP 更新了。",
		url: "https://www.bilibili.com/video/BV1jo411c7mD",
		sourceLabel: "B站 · 关注更新",
		author: "小约翰可会唱",
		minutesAgo: 110,
		metrics: [{
			label: "时长",
			value: "14:52"
		}]
	},
	{
		id: "e-nga-heat",
		watchpointId: "nga-azeroth",
		connector: "nga",
		section: "worth",
		kind: "board_hot",
		title: "有帖子在短时间内快速升温",
		summary: "那个关于插件配置迁移的帖，一小时内多了 90 层楼",
		reason: "回复在过去 1 小时明显加速，不是慢慢堆起来的老帖。",
		url: "https://bbs.nga.cn/read.php?tid=38412560",
		sourceLabel: "NGA · 艾泽拉斯议事厅",
		minutesAgo: 18,
		metrics: [{
			label: "1 小时",
			value: "+90 回复"
		}, {
			label: "现在",
			value: "214 回复"
		}]
	},
	{
		id: "e-ai-agent",
		watchpointId: "bili-ai",
		connector: "bilibili",
		section: "worth",
		kind: "discover",
		title: "一个 AI 相关视频正在快速增长",
		summary: "我让本地模型自己在电脑上干活，失败了三次",
		author: "某个不上热门的 UP",
		reason: "匹配你开启的「AI」标签 · 过去 2 小时播放 2,100 → 15,400。",
		url: "https://www.bilibili.com/video/BV1ai411c7mD",
		sourceLabel: "B站 · 站内发现",
		minutesAgo: 22,
		metrics: [{
			label: "2 小时播放",
			value: "2.1k → 15.4k"
		}, {
			label: "收藏率",
			value: "8.4%"
		}]
	},
	{
		id: "e-ai-claude",
		watchpointId: "bili-ai",
		connector: "bilibili",
		section: "worth",
		kind: "discover",
		title: "另一条 AI 视频互动偏高",
		summary: "把一周的会议纪要交给模型之后",
		author: "少数派里的那类作者",
		reason: "匹配「AI」· 发布时间新 · 收藏率和评论比同段位视频更高。",
		url: "https://www.bilibili.com/video/BV1cl411c7mD",
		sourceLabel: "B站 · 站内发现",
		minutesAgo: 64,
		metrics: [{
			label: "播放",
			value: "4.8 万"
		}, {
			label: "收藏率",
			value: "11.2%"
		}]
	}
];
var ADDABLE_TEMPLATES = [
	{
		watchpoint: {
			id: "nga-game",
			connector: "nga",
			name: "游戏综合",
			detail: "新帖与热帖",
			paused: false,
			status: "ok"
		},
		events: [{
			id: "e-nga-game-1",
			watchpointId: "nga-game",
			connector: "nga",
			section: "following",
			kind: "board_latest",
			title: "游戏综合出现 2 个新热帖",
			reason: "你刚刚加进来的板块，已经有值得扫一眼的讨论。",
			url: "https://bbs.nga.cn/thread.php?fid=414",
			sourceLabel: "NGA · 游戏综合",
			minutesAgo: 16,
			children: [{
				title: "今年还有哪款单机值得专门腾出周末",
				url: "https://bbs.nga.cn/read.php?tid=38414002",
				meta: "173 回复"
			}, {
				title: "你们现在还在用实体收藏吗",
				url: "https://bbs.nga.cn/read.php?tid=38413955",
				meta: "88 回复"
			}]
		}]
	},
	{
		watchpoint: {
			id: "tieba-digital",
			connector: "tieba",
			name: "数码吧",
			detail: "新帖与热议",
			paused: false,
			status: "ok"
		},
		events: [{
			id: "e-tieba-1",
			watchpointId: "tieba-digital",
			connector: "tieba",
			section: "following",
			kind: "board_hot",
			title: "数码吧出现 3 个热帖",
			reason: "这是你主动加进来的地方，不是系统替你找的。",
			url: "https://tieba.baidu.com/f?kw=%E6%95%B0%E7%A0%81",
			sourceLabel: "贴吧 · 数码吧",
			minutesAgo: 9,
			children: [{
				title: "新笔记本的屏幕，纸感校准有没有意义",
				url: "https://tieba.baidu.com/p/9120001",
				meta: "240 回复"
			}]
		}]
	},
	{
		watchpoint: {
			id: "yt-subs",
			connector: "youtube",
			name: "订阅更新",
			detail: "订阅频道的新视频",
			paused: false,
			status: "ok"
		},
		events: [{
			id: "e-yt-1",
			watchpointId: "yt-subs",
			connector: "youtube",
			section: "following",
			kind: "following_upload",
			title: "MKBHD 更新了视频",
			summary: "The Most Boring Phone of the Year",
			reason: "你订阅的频道更新了。",
			url: "https://www.youtube.com/watch?v=dQw4w9wg",
			sourceLabel: "YouTube · 订阅",
			author: "Marques Brownlee",
			minutesAgo: 7,
			metrics: [{
				label: "时长",
				value: "12:04"
			}]
		}]
	},
	{
		watchpoint: {
			id: "rss-blog",
			connector: "rss",
			name: "独立博客",
			detail: "RSS / Atom",
			paused: false,
			status: "ok"
		},
		events: [{
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
			minutesAgo: 3
		}]
	}
];
function mergeWatchpoints(pausedIds, resumedIds, removedIds, extra) {
	const removed = new Set(removedIds);
	const paused = new Set(pausedIds);
	const resumed = new Set(resumedIds);
	const fromSeed = SEED_WATCHPOINTS.filter((w) => !removed.has(w.id)).map((w) => ({
		...w,
		paused: paused.has(w.id) ? true : resumed.has(w.id) ? false : w.paused
	}));
	const seen = new Set(fromSeed.map((w) => w.id));
	const fromExtra = extra.filter((w) => !removed.has(w.id) && !seen.has(w.id)).map((w) => ({
		...w,
		paused: paused.has(w.id) ? true : resumed.has(w.id) ? false : w.paused
	}));
	return [...fromSeed, ...fromExtra];
}
function mergeEvents(extra, removedIds) {
	const removed = new Set(removedIds);
	const seed = SEED_EVENTS.filter((e) => !removed.has(e.watchpointId));
	const extras = extra.filter((e) => !removed.has(e.watchpointId));
	const seen = new Set(seed.map((e) => e.id));
	return [...seed, ...extras.filter((e) => !seen.has(e.id))];
}
function EventCard({ event, index, onDismiss }) {
	const mark = CONNECTORS[event.connector].mark;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "briefing-card group relative rounded-xl bg-paper-raised p-4 shadow-card transition-[box-shadow,transform] duration-150 ease-out hover:shadow-card-hover",
		style: { ["--i"]: index },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: event.url,
			target: "_blank",
			rel: "noreferrer",
			className: "absolute inset-0 rounded-xl",
			"aria-label": `在原站打开：${event.title}`
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceMark, {
				label: mark,
				className: "mt-0.5"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-baseline justify-between gap-3 text-xs text-ink-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate",
							children: event.sourceLabel
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimeAgo, { minutesAgo: event.minutesAgo })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-1.5 font-medium leading-snug text-ink",
						children: event.title
					}),
					event.summary ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm leading-relaxed text-ink-muted",
						children: event.summary
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm leading-relaxed text-ink",
						children: event.reason
					}),
					event.metrics && event.metrics.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
						className: "mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted",
						children: event.metrics.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: m.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "tabular-nums text-ink",
								children: m.value
							})]
						}, m.label))
					}) : null,
					event.children && event.children.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "relative z-10 mt-3 divide-y divide-line border-t border-line",
						children: event.children.map((child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: child.url,
							target: "_blank",
							rel: "noreferrer",
							className: "flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-horizon",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "min-w-0 truncate",
								children: child.title
							}), child.meta ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "shrink-0 tabular-nums text-xs text-ink-muted",
								children: child.meta
							}) : null]
						}) }, child.url))
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative z-10 mt-3 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("inline-flex items-center gap-1.5 text-xs font-medium", event.live ? "text-live" : "text-ink-faint"),
							children: event.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "live-dot size-1.5 rounded-full bg-live" }), "直播中"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1",
								children: ["打开原站", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5" })]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							variant: "silent",
							size: "sm",
							className: "min-h-11 px-3",
							onClick: (e) => {
								e.preventDefault();
								e.stopPropagation();
								onDismiss();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-3.5" }), "知道了"]
						})]
					})
				]
			})]
		})]
	});
}
var empty = {
	pausedIds: [],
	resumedIds: [],
	removedIds: [],
	extraWatchpoints: [],
	extraEvents: [],
	dismissedIds: [],
	lastPatrolAt: null,
	patrolling: false
};
var useWatchtower = create()(persist((set, get) => ({
	...empty,
	hydrated: false,
	setHydrated: () => set({ hydrated: true }),
	pause: (id) => set((s) => ({
		pausedIds: s.pausedIds.includes(id) ? s.pausedIds : [...s.pausedIds, id],
		resumedIds: s.resumedIds.filter((x) => x !== id)
	})),
	resume: (id) => set((s) => ({
		resumedIds: s.resumedIds.includes(id) ? s.resumedIds : [...s.resumedIds, id],
		pausedIds: s.pausedIds.filter((x) => x !== id)
	})),
	remove: (id) => set((s) => ({
		removedIds: s.removedIds.includes(id) ? s.removedIds : [...s.removedIds, id],
		extraWatchpoints: s.extraWatchpoints.filter((w) => w.id !== id),
		extraEvents: s.extraEvents.filter((e) => e.watchpointId !== id)
	})),
	dismiss: (id) => set((s) => ({ dismissedIds: s.dismissedIds.includes(id) ? s.dismissedIds : [...s.dismissedIds, id] })),
	dismissSection: (eventIds) => set((s) => ({ dismissedIds: [.../* @__PURE__ */ new Set([...s.dismissedIds, ...eventIds])] })),
	addTemplate: (watchpointId) => {
		const template = ADDABLE_TEMPLATES.find((t) => t.watchpoint.id === watchpointId);
		if (!template) return false;
		const s = get();
		if (mergeWatchpoints(s.pausedIds, s.resumedIds, s.removedIds, s.extraWatchpoints).some((w) => w.id === watchpointId)) return false;
		set({
			extraWatchpoints: [...s.extraWatchpoints, template.watchpoint],
			extraEvents: [...s.extraEvents, ...template.events],
			removedIds: s.removedIds.filter((id) => id !== watchpointId)
		});
		return true;
	},
	patrol: async () => {
		if (get().patrolling) return;
		set({ patrolling: true });
		await new Promise((r) => setTimeout(r, 900));
		set({
			patrolling: false,
			lastPatrolAt: Date.now()
		});
	},
	reset: () => set({
		...empty,
		hydrated: true,
		lastPatrolAt: Date.now()
	})
}), {
	name: "watchtower-preview-v1",
	partialize: (s) => ({
		pausedIds: s.pausedIds,
		resumedIds: s.resumedIds,
		removedIds: s.removedIds,
		extraWatchpoints: s.extraWatchpoints,
		extraEvents: s.extraEvents,
		dismissedIds: s.dismissedIds
	}),
	onRehydrateStorage: () => () => {
		useWatchtower.getState().setHydrated();
	}
}));
function selectView(s) {
	const watchpoints = mergeWatchpoints(s.pausedIds, s.resumedIds, s.removedIds, s.extraWatchpoints);
	const allEvents = mergeEvents(s.extraEvents, s.removedIds);
	const dismissed = new Set(s.dismissedIds);
	const byId = new Map(watchpoints.map((w) => [w.id, w]));
	return {
		watchpoints,
		events: allEvents.filter((e) => {
			if (dismissed.has(e.id)) return false;
			const wp = byId.get(e.watchpointId);
			if (!wp || wp.paused) return false;
			return true;
		})
	};
}
function eventsInSection(events, section, cap) {
	return events.filter((e) => e.section === section).sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, cap);
}
function Briefing({ events, onDismiss, onDismissSection }) {
	const groups = SECTION_ORDER.map((id) => ({
		id,
		...SECTIONS[id],
		items: eventsInSection(events, id, SECTIONS[id].cap)
	})).filter((g) => g.items.length > 0);
	if (groups.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AllClear, {});
	let running = 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-[0.18em] text-ink-faint uppercase",
					children: "本次快照"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl",
					children: "有限，有尽头。"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-md text-sm leading-relaxed text-ink-muted",
					children: "只回答一件事：你平时会看的这几个地方，现在有没有值得点进去的东西。"
				})
			] }),
			groups.map((group) => {
				const start = running;
				running += group.items.length;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionBlock, {
					id: group.id,
					title: group.title,
					kicker: group.kicker,
					items: group.items,
					startIndex: start,
					onDismiss,
					onDismissAll: () => onDismissSection(group.items.map((e) => e.id))
				}, group.id);
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndNote, {})
		]
	});
}
function SectionBlock({ id, title, kicker, items, startIndex, onDismiss, onDismissAll }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		"aria-labelledby": `sec-${id}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-end justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-ink-faint",
				children: kicker
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				id: `sec-${id}`,
				className: "mt-1 font-display text-2xl tracking-tight text-ink",
				children: [title, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "ml-2 font-sans text-sm font-medium tabular-nums text-ink-faint",
					children: items.length
				})]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "silent",
				size: "sm",
				onClick: onDismissAll,
				children: "这一栏知道了"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex flex-col gap-3",
			children: items.map((event, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventCard, {
				event,
				index: startIndex + i,
				onDismiss: () => onDismiss(event.id)
			}, event.id))
		})]
	});
}
function AllClear() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizonRule, { className: "h-8 w-56" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-8 font-display text-4xl tracking-tight text-ink sm:text-5xl",
				children: "海面平静"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-sm text-base leading-relaxed text-ink-muted",
				children: "现在没有值得你知道的新事情。可以关掉这个页面，回去做你正在做的事。"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-sm text-clear",
				children: "这就是瞭望塔该有的结果。"
			})
		]
	});
}
function EndNote() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "flex flex-col items-center pb-8 pt-4 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HorizonRule, { className: "h-6 w-48" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 font-display text-lg tracking-tight text-ink",
				children: "以上就是这次巡逻的全部。"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-sm text-sm leading-relaxed text-ink-muted",
				children: "没有下一页，没有推荐流。没有值得看的东西，本身就是答案。"
			})
		]
	});
}
var Dialog = Dialog$1;
var DialogTrigger = DialogTrigger$1;
var DialogPortal = DialogPortal$1;
function DialogOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
		className: cn("fixed inset-0 z-50 bg-ink/40", className),
		...props
	});
}
function DialogContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
		className: cn("fixed top-1/2 left-1/2 z-50 h-fit w-dialog -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-paper-raised p-5 shadow-card-hover", className),
		...props,
		children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
			className: "absolute top-3 right-3 flex size-11 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-paper-sunken hover:text-ink",
			"aria-label": "关闭",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
		})]
	})] });
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("pr-10", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
		className: cn("font-display text-xl font-medium tracking-tight text-ink", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
		className: cn("mt-1 text-sm leading-relaxed text-ink-muted", className),
		...props
	});
}
function AddWatchpoint({ watchpoints, compact = false }) {
	const addTemplate = useWatchtower((s) => s.addTemplate);
	const [open, setOpen] = (0, import_react.useState)(false);
	const existing = (0, import_react.useMemo)(() => new Set(watchpoints.map((w) => w.id)), [watchpoints]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: compact ? "ghost" : "outline",
				size: compact ? "icon" : "default",
				className: "w-full",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), compact ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: "添加瞭望点"
				}) : "添加瞭望点"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "最近也开始逛这个地方？" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "只加入你自己会去检查的站点。系统不会替你扩大世界。" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-5 flex flex-col gap-2",
			children: ADDABLE_TEMPLATES.map((t) => {
				const added = existing.has(t.watchpoint.id);
				const c = CONNECTORS[t.watchpoint.connector];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-3 rounded-lg bg-paper p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourceMark, { label: c.mark }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-medium text-ink",
								children: [
									c.short,
									" · ",
									t.watchpoint.name
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-ink-muted",
								children: t.watchpoint.detail
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: added ? "ghost" : "default",
							disabled: added,
							onClick: () => {
								if (addTemplate(t.watchpoint.id)) {
									toast("已加入瞭望塔", { description: `开始检查 ${c.short} · ${t.watchpoint.name}` });
									setOpen(false);
								}
							},
							children: added ? "已在看" : "添加"
						})
					]
				}, t.watchpoint.id);
			})
		})] })]
	});
}
function Switch({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
		className: cn("peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line transition-colors", "data-[state=checked]:border-horizon data-[state=checked]:bg-horizon data-[state=unchecked]:bg-paper-sunken", "focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40", className),
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-paper-raised shadow-card transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:bg-ink-muted" })
	});
}
var CONNECTOR_ORDER = [
	"nga",
	"bilibili",
	"lkong",
	"tieba",
	"youtube",
	"rss"
];
function Sidebar({ watchpoints, lastPatrolLabel, patrolling, onPatrol }) {
	const pause = useWatchtower((s) => s.pause);
	const resume = useWatchtower((s) => s.resume);
	const remove = useWatchtower((s) => s.remove);
	const reset = useWatchtower((s) => s.reset);
	const grouped = CONNECTOR_ORDER.map((id) => ({
		id,
		items: watchpoints.filter((w) => w.connector === id)
	})).filter((g) => g.items.length > 0);
	const watching = watchpoints.filter((w) => !w.paused).length;
	const pausedCount = watchpoints.filter((w) => w.paused).length;
	const errors = watchpoints.filter((w) => w.status === "error");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "px-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TowerMark, { className: "size-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-2xl leading-none tracking-tight text-ink",
						children: "瞭望塔"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-[11px] tracking-[0.18em] text-ink-faint uppercase",
						children: "Watchtower"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-sm leading-relaxed text-ink-muted",
					children: "替你去你常去的地方看一眼。有事再进来，没事就关掉。"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 rounded-xl bg-paper-raised p-4 shadow-card",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-wide text-ink-faint",
						children: "上次巡逻"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-medium text-ink",
						children: lastPatrolLabel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-ink-muted",
						children: [
							watching,
							" 处正在看",
							pausedCount ? ` · ${pausedCount} 处暂停` : ""
						]
					}),
					errors.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 flex items-start gap-1.5 text-sm text-caution",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "mt-0.5 size-3.5 shrink-0" }),
							errors.length,
							" 处检查失败，其余不受影响"
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-clear",
						children: "各处海面可见"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4 w-full",
						onClick: onPatrol,
						disabled: patrolling,
						children: patrolling ? "正在巡逻…" : "立刻巡逻"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 min-h-0 flex-1 overflow-y-auto pr-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-baseline justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xs tracking-wide text-ink-faint",
							children: "瞭望点"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-ink-faint",
							children: watchpoints.length
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-col gap-5",
						children: grouped.map((group) => {
							const meta = CONNECTORS[group.id];
							const groupError = group.items.some((w) => w.status === "error");
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-2 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium text-ink",
									children: meta.short
								}), groupError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-caution",
									children: "检查失败"
								}) : null]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex flex-col gap-1",
								children: group.items.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WatchRow, {
									watchpoint: w,
									onToggle: (on) => {
										if (on) {
											resume(w.id);
											toast("已恢复检查", { description: w.name });
										} else {
											pause(w.id);
											toast("已暂停", { description: `${w.name} 仍保留，只是先不看` });
										}
									},
									onRemove: () => {
										remove(w.id);
										toast("已移出瞭望塔", { description: w.name });
									}
								}, w.id))
							})] }, group.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AddWatchpoint, { watchpoints })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "mt-6 border-t border-line pt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs leading-relaxed text-ink-faint",
					children: "这个页面不是用来刷的。看完就可以关掉。"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "silent",
					size: "sm",
					className: "mt-2 h-9 px-2 text-xs",
					onClick: () => {
						reset();
						toast("已恢复示例数据");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" }), "恢复示例"]
				})]
			})
		]
	});
}
function WatchRow({ watchpoint, onToggle, onRemove }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: cn("rounded-lg px-2 py-1.5 transition-colors", watchpoint.paused && "opacity-60"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm text-ink",
							children: watchpoint.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[11px] text-ink-faint",
							children: watchpoint.detail
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: !watchpoint.paused,
						onCheckedChange: onToggle,
						"aria-label": watchpoint.paused ? `恢复 ${watchpoint.name}` : `暂停 ${watchpoint.name}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon-sm",
						className: "size-9 text-ink-faint hover:text-live",
						"aria-label": `移除 ${watchpoint.name}`,
						onClick: onRemove,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-3.5" })
					})
				]
			}),
			watchpoint.status === "error" && watchpoint.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 flex items-start gap-1 text-[11px] leading-relaxed text-caution",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "mt-0.5 size-3 shrink-0" }), watchpoint.error]
			}) : null,
			watchpoint.paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 flex items-center gap-1 text-[11px] text-ink-faint",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, { className: "size-3" }), "已暂停"]
			}) : null
		]
	});
}
function AppShell() {
	const store = useWatchtower();
	const { watchpoints, events } = (0, import_react.useMemo)(() => selectView(store), [store]);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [now, setNow] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!useWatchtower.persist.hasHydrated()) return useWatchtower.persist.onFinishHydration(() => {
			useWatchtower.getState().setHydrated();
		});
		useWatchtower.getState().setHydrated();
	}, []);
	(0, import_react.useEffect)(() => {
		setNow(Date.now());
		if (!useWatchtower.getState().lastPatrolAt) useWatchtower.setState({ lastPatrolAt: Date.now() });
	}, []);
	const lastPatrolLabel = (0, import_react.useMemo)(() => {
		if (!now || !store.lastPatrolAt) return "刚刚";
		if (store.patrolling) return "正在巡逻";
		return formatDistanceToNowStrict(store.lastPatrolAt, {
			locale: zhCN,
			addSuffix: true
		});
	}, [
		now,
		store.lastPatrolAt,
		store.patrolling
	]);
	async function onPatrol() {
		await store.patrol();
		toast("巡逻完成", { description: "没有更多页。这就是当前快照。" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-paper text-ink",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex min-h-dvh max-w-[1120px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "sticky top-0 hidden h-dvh w-80 shrink-0 border-r border-line bg-paper-sunken/60 px-5 py-8 lg:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {
					watchpoints,
					lastPatrolLabel,
					patrolling: store.patrolling,
					onPatrol
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 lg:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TowerMark, { className: "size-8" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg leading-none text-ink",
							children: "瞭望塔"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-[11px] text-ink-faint",
							children: lastPatrolLabel
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "立刻巡逻",
							onClick: onPatrol,
							disabled: store.patrolling,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-4", store.patrolling && "animate-spin") })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "瞭望点",
							onClick: () => setMenuOpen(true),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-4" })
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "flex-1 px-4 py-8 sm:px-8 lg:px-10 lg:py-12",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Briefing, {
						events,
						onDismiss: store.dismiss,
						onDismissSection: store.dismissSection
					})
				})]
			})]
		}), menuOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "fixed inset-0 z-40 lg:hidden",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "absolute inset-0 bg-ink/40",
				"aria-label": "关闭瞭望点",
				onClick: () => setMenuOpen(false)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-y-0 left-0 flex h-full w-80 max-w-[calc(100%-2.5rem)] flex-col overflow-hidden bg-paper-sunken px-5 py-6 shadow-card-hover",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-2 flex shrink-0 justify-end",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "关闭",
						onClick: () => setMenuOpen(false),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" })
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-h-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {
						watchpoints,
						lastPatrolLabel,
						patrolling: store.patrolling,
						onPatrol
					})
				})]
			})]
		}) : null]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {});
}
//#endregion
export { Home as component };
