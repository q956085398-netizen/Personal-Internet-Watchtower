# 架构草案

> 本文档描述当前阶段的工程方向，不代表最终技术选型。

## 1. 核心对象

当前尽量只保留少量核心概念。

### Source / Watchpoint

用户主动添加、原本就会去检查的地方。

例如：

- NGA 某个板块；
- B站关注 UP；
- B站关注主播；
- 龙空某个板块；
- 未来的贴吧某个吧。

### Connector

负责“怎么从这个站点拿数据”。

实现手段可以是：

- 官方 API；
- RSS / Atom；
- RSSHub；
- 页面抓取；
- 登录 Session；
- Playwright；
- 其他方式。

这些差异不应该暴露给 Dashboard。

### Event / Item

Connector 输出统一的数据对象。

建议最小字段：

```text
id
source
source_type
event_type
title
summary
url
author
published_at
discovered_at
thumbnail
metrics
reason
```

其中 `reason` 用来说明“为什么这条内容出现在这里”，例如：

- 你关注的 UP 更新了；
- 你常看的板块新出现热帖；
- 你的回复收到新回复；
- 该视频过去 1 小时播放增长较快。

### Metric Snapshot

只在需要判断趋势时使用。

例如：

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

它不是阅读历史，而是系统为了判断“正在发生什么变化”保存的短期观察记录。

---

## 2. 数据流

```text
                    Internet
                       │
       ┌───────────────┼───────────────┐
       │               │               │
      NGA          Bilibili          龙空
       │               │               │
       └────── Connector / RSSHub ──────┘
                       │
                       ▼
                Normalized Event
                       │
                Filter / Ranking
                       │
             ┌─────────┴─────────┐
             │                   │
          当前状态           Metric Snapshot
             │                   │
             └─────────┬─────────┘
                       ▼
                    SQLite
                       │
                       ▼
                 Dashboard API
                       │
                       ▼
                 Dashboard UI
                       │
                       ▼
                  原始网站链接
```

---

## 3. Connector 的目标

主程序不应该直接写：

```text
if source == "nga" ...
if source == "bilibili" ...
if source == "lkong" ...
```

而应该让站点实现独立 Adapter。

示意：

```text
connectors/
├── bilibili/
├── nga/
├── lkong/
├── tieba/
└── generic-rss/
```

Connector 不需要实现相同功能。

例如：

| 能力 | B站 | NGA | 普通 RSS |
|---|---|---|---|
| latest | ✓ | ✓ | ✓ |
| hot | ✓ | ✓ | - |
| following | ✓ | - | - |
| live | ✓ | - | - |
| account events | 部分 | 待验证 | - |
| search | ✓ | 视情况 | - |
| metrics | ✓ | 视情况 | - |

重要的是：

> 主程序根据 Connector 能力工作，而不是强迫所有站点具有同一种数据模型。

---

## 4. 添加 / 删除数据源

用户层的操作应该简单。

### 添加

示例：

```text
+ 添加地方

NGA
Bilibili
龙空
贴吧
其他
```

进入某站点后，只配置真实需要的内容，例如：

```text
NGA
[✓] 版块 A
[✓] 版块 B
[✓] 与我有关
```

### 删除

删除一个 Source / Watchpoint 应做到：

1. 停止调度；
2. 不再展示；
3. 根据设置清理缓存；
4. 若整个 Connector 不再使用，可进一步清除登录凭据。

需要区分：

- 停止看某个板块；
- 完全移除某个站点。

---

## 5. 凭据设计

优先级：

```text
OAuth / Token
    ↓
Session / Cookie
    ↓
浏览器登录态
    ↓
用户名密码
```

原则：

- 尽量不保存明文密码；
- Cookie / Token 不进入 Git；
- 前端不直接持有敏感凭据；
- 单用户阶段可使用环境变量 / Secret 文件；
- 后续如有多人场景，再考虑独立凭据存储。

---

## 6. RSSHub 的位置

RSSHub 更适合作为 Connector 的底层能力之一，而不是整个产品的数据模型。

示例：

```text
NGA Connector
├── RSSHub route
└── Custom account-event logic

Bilibili Connector
├── RSSHub
├── Web API
└── metric collector
```

尽量避免 fork RSSHub。

优先：

- 直接使用已有 route；
- 向 RSSHub 增加通用 route；
- 或在 Watchtower 外层写薄 Adapter。

---

## 7. Dashboard 的位置

Dashboard 只关心统一事件。

它不需要知道：

- RSSHub route 是什么；
- 某站点 Cookie 怎么配；
- 哪条 API 返回哪些字段。

当前已选择**轻量自定义 Dashboard**作为 v0 UI 方向，视觉和交互基准见：

`docs/grok-UI-referenc/`

Dashboard 的职责只包含统一事件展示、有限分区、瞭望点管理与跳转原站。它不应该承担采集逻辑。

仍需保留以下边界：

> Dashboard 可以替换，Connector 和数据层不被绑死。

---

## 8. 存储

MVP 优先 SQLite。

用途：

- 当前已发现 Item；
- 最近一段时间的事件；
- Metric Snapshot；
- Source 配置；
- 简单去重和缓存。

当前不以以下需求为核心：

- 长期全文归档；
- 跨设备阅读进度；
- 大规模多用户；
- 复杂收藏体系。

如果未来真实需求出现，再评估 PostgreSQL / Miniflux 等方案。

---

## 9. 调度

不同 Watchpoint 可以使用不同频率。

示例：

- 直播状态：较高频；
- 账户通知：中高频；
- 板块新帖：中频；
- 热帖：中频；
- 视频指标增长：低至中频。

需要避免：

- 对站点造成过多请求；
- 被反爬；
- Cookie 频繁失效；
- 无意义的高频检查。

调度频率应该允许 Connector 提供建议值。

---

## 10. 当前最需要验证的工程问题

1. NGA 登录态下能否稳定获取：
   - 我的回复；
   - @；
   - 点赞；
   - 关注帖子更新。

2. B站：
   - 关注 UP 更新；
   - 主播直播状态；
   - 视频指标是否可以稳定采样。

3. 龙空：
   - 板块和帖子更新稳定性。

4. 各站点 Cookie 的生命周期。

5. RSSHub 已覆盖能力与 Custom Connector 的边界。

这些验证结果决定后续实现细节。
