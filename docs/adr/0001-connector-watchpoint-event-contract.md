# ADR-0001: Connector / Watchpoint / Event 最小契约

- 状态：已接受
- 日期：2026-09-26
- 关联工单：[#2](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/2)（本 ADR 是其交付物）
- 解锁：#9（SQLite schema）、#10（Scheduler/runner）、#11（normalization）、#12/#13/#14（生产 Connector）、#15（Watchpoint UX）

## 决策概述

定义 Core 与站点 Connector 之间的最小稳定契约，目标是：**新增一个论坛站点主要发生在 `connectors/<site>/` 内部，而不是修改 Core。**

三条设计底线：

1. **能力封闭枚举。** Dashboard 和调度器要依赖稳定的能力语义，因此 capability 是封闭集合；新增能力必须改契约并提升 `contract_version`，不允许 Connector 自造字符串。
2. **Connector 无自有持久化。** 所有跨 poll 状态（watermark、配置）由 Core 持有并在调用时透传；Connector 本身是无状态函数集合。
3. **失败是返回值，不是异常。** 预期内的失败（凭据失效、限流、临时错误）必须返回结构化失败，让 Core 决定重试策略；未捕获异常由 Core 兜底为临时失败。

## 0. 记法

- 字段名用 **snake_case**，与 `SPEC.md` 及未来 SQLite 列名一致；绑定 TypeScript 实现时用 camelCase 转换。
- 本 ADR **修订并细化** SPEC 的两处草案：§5.3 的 Event 最小字段（`connector` → `connector_id`、`thumbnail` → `thumbnail_url`，新增 `external_id` 与 `metadata`；SPEC.md §5.3 已同步）与 §12 的概念契约（`metadata()` 方法 → 扁平 `metadata` 字段）。
- 类型记法是 TypeScript 风格草案，语义优先于语法。
- 契约版本：`contract_version: 1`。Core 拒绝加载版本不匹配的 Connector。

## 1. Connector 接口

```ts
interface Connector {
  metadata: ConnectorMetadata;
  capabilities(): readonly Capability[];
  watchpointKinds(): readonly WatchpointKind[];
  validateCredentials?(creds: ConnectorCredentials): Promise<CredentialStatus>;
  listWatchpointOptions?(kind: string, creds: ConnectorCredentials | null): Promise<WatchpointOption[]>;
  poll(watchpoint: Watchpoint, ctx: PollContext): Promise<PollResult>;
}

interface ConnectorMetadata {
  id: string;                 // 全局唯一、小写："nga" / "bilibili" / "lkong"
  display_name: string;
  home_url: string;
  contract_version: 1;
  credentials?: CredentialsSpec;   // 无需登录的 Connector 省略此字段
}

interface CredentialsSpec {
  kind: "cookie" | "token";   // v0 只支持这两种
  fields: { name: string; label: string }[];
}

type Capability =
  | "latest"             // 按时间序获取最新内容
  | "hot"                // 能识别热帖 / 升温信号
  | "following_updates"  // 关注对象的更新
  | "live_status"        // 直播状态
  | "account_events"     // 与账户有关的事件
  | "search"             // 站内搜索（v0 无 Connector 实现，UI 不暴露）
  | "metrics";           // 数值指标可采样
```

凭据按 **Connector 作用域**存储（SPEC §9）：`ConnectorCredentials` 是 `Record<string, string>`，键为 `CredentialsSpec.fields[].name`，由 Core 从 secrets 存储解析后注入，永远不落 Connector 代码。

### WatchpointKind

```ts
interface WatchpointKind {
  kind: string;                 // Connector 内唯一，snake_case，如 "board"
  display_name: string;         // 如 "板块新帖"
  exercises: Capability;        // 主能力，用于 Dashboard 分区推导
  default_interval_seconds: number;
  requires_credentials: boolean;
  params: ParamField[];         // 空数组 = 无需用户参数
}

interface ParamField {
  name: string;                 // snake_case
  label: string;
  type: "text" | "number" | "select" | "boolean";
  required: boolean;
  options?: { value: string; label: string }[];   // type="select" 时必填
}
```

- `capabilities()` 描述 Connector 的**数据获取能力**；`WatchpointKind.exercises` 只声明该类 Watchpoint 的**主能力**；`Event.event_type` 才是 Dashboard 展示层的分类键。一个 kind 可以产出多种 event_type（如 `board` 同时产出 `new_item` 与 `hot_item`）。
- `params` 是封闭的：添加 Watchpoint 的 UI（#15）只渲染声明过的字段，内容校验由 Connector 负责。v0 的 ParamField 是刻意最小集，富表单 DSL 明确延后（见 §6）。
- `listWatchpointOptions(kind, creds)` 仅当某 kind 需要动态候选（如 NGA 板块列表、B站关注列表）时实现；静态候选直接用 `ParamField.options`。返回：

```ts
interface WatchpointOption {
  value: string;   // 写入 params 的值，如板块 fid
  label: string;   // 展示名
}
```

## 2. Watchpoint schema

```ts
interface Watchpoint {
  id: string;                  // Core 分配
  connector_id: string;
  kind: string;                // 必须是 Connector 声明过的 kind
  display_name: string;        // 用户可读，如 "NGA · 舰col板块"
  params: Record<string, string | number | boolean>;
  status: "active" | "paused";
  interval_seconds: number;    // 默认取 kind.default_interval_seconds，用户可覆盖
  created_at: string;          // ISO 8601
}
```

对 #9（schema 最终化）重要的两点：

- **运行时状态不属于 Watchpoint 配置。** `last_poll_at`、连续失败计数、watermark 存在 Core 的独立状态表中，不在本 schema 内。
- Watchpoint **没有 credentials 字段**：凭据在 Connector 作用域共享（SPEC §9：删除 Watchpoint 不删凭据）。
- Core 不解释 `params` 内容，只透传给 Connector。

## 3. poll 输入输出与失败模型

```ts
interface PollContext {
  now: Date;                                  // Core 注入时钟，便于测试
  credentials: ConnectorCredentials | null;   // kind.requires_credentials 时由 Core 解析注入
  state: string | null;                       // 上次成功 poll 保存的不透明字符串
}

type PollResult = PollSuccess | PollFailure;

interface PollSuccess {
  ok: true;
  events: Event[];                  // Core 截断到 MAX_EVENTS_PER_POLL=50；Connector 应 ≤ 30
  state?: string;                   // 不透明 watermark：Core 原样持久化，下次原样回传
  next_poll_hint_seconds?: number;  // 调度器会 clamp 到 [MIN_INTERVAL=60, MAX_INTERVAL=86400]
}

type PollFailureReason =
  | "auth_error"          // 凭据失效
  | "rate_limited"        // 被限流 / 反爬
  | "temporary_failure"   // 网络错误 / 5xx / 解析失败
  | "permanent_failure";  // 目标已消失（板块被删等）

interface PollFailure {
  ok: false;
  reason: PollFailureReason;
  message: string;                // 面向用户的状态文案
  retry_after_seconds?: number;   // rate_limited 时应提供
}
```

Core 对各 failure reason 的行为：

| reason | 典型来源 | Core 行为 |
|---|---|---|
| `auth_error` | Cookie 过期、401、校验页 | 停止重试，状态 UI 提示更新凭据 |
| `rate_limited` | 429、反爬触发 | 不早于 `retry_after_seconds` 再试 |
| `temporary_failure` | 网络错误、5xx、页面改版 | 指数退避重试，失败在状态 UI 可见 |
| `permanent_failure` | 板块/帖子不存在 | 停止调度，提示用户删除或修改 Watchpoint |

补充约定：

- **至少一次语义**：Core 崩溃恢复可能重复 poll；Connector 必须容忍重复调用（靠 `state` 自身去重 + Core 端 dedup 兜底）。
- `validateCredentials` 返回 `CredentialStatus = { ok: true } | { ok: false, reason: "auth_error" | "temporary_failure", message: string }`。
- 调度默认频率的钳制与重叠防护是 #10 的职责；契约只提供 `default_interval_seconds` 与 `next_poll_hint_seconds` 两个输入。

## 4. Event schema

```ts
type EventType =
  | "new_item"        // latest：新帖 / 新视频 / 新动态
  | "hot_item"        // hot：热帖、快速升温
  | "item_update"     // 已知条目有新变化：新回复、指标增长（后者主要用于 #18）
  | "live_started"
  | "live_ended"      // v0 Dashboard 可选择不展示
  | "account_event";  // 回复 / @ / 点赞 / 关注帖更新

interface Event {
  // —— 身份（Core 完成/校验）——
  id: string;                   // Core 分配
  connector_id: string;         // Connector 填 metadata.id，Core 校验一致
  watchpoint_id: string;

  // —— Connector 必填 ——
  event_type: EventType;
  discovered_at: string;        // ISO 8601，poll 时刻；Core 校验格式
  title: string;
  url: string;                  // 绝对地址，必须指向原站（SPEC §4 R4：点击离开 Watchtower）
  reason: string;               // 面向用户的一句中文："你关注的 UP 更新了"
  external_id: string | null;   // 源站原生 id；dedup 主输入

  // —— Connector 可选 ——
  summary?: string;
  author?: string;
  published_at?: string;        // 源站提供时填，ISO 8601
  thumbnail_url?: string;
  metrics?: Record<MetricKey, number>;      // 发现时刻的快照，不是阅读历史
  metadata?: Record<string, unknown>;       // 站点特有，≤ 4KB，Dashboard 不得依赖
}

type MetricKey =
  | "view" | "like" | "favorite" | "coin" | "reply" | "share" | "danmaku";

// danmaku 是 Bilibili 扩展键，SPEC §5.4 的快照示例未列出
```

统一 vs 站点特有：

| 层 | 字段 |
|---|---|
| 必须统一 | `event_type`、`url`、`title`、`reason`、`discovered_at`、`external_id`、metric 键名 |
| 可选统一 | `summary`、`author`、`published_at`、`thumbnail_url`、`metrics` |
| 站点特有 | `metadata`（如 B站动态类型、NGA 板块名、龙空精华标记） |

- **dedup 键**（#11 实现，契约只定输入）：`(watchpoint_id, event_type, external_id)`。`external_id` 缺失时 Core 用规范化 URL 哈希兜底。
- **分区推导**（Core 规则，不给 Event 加字段）：
  1. `event_type == "account_event"` → 和我有关；
  2. Watchpoint kind 的 `exercises ∈ { following_updates, live_status }` → 关注更新；
  3. 其余 → 值得看看。
- `reason` 是展示文案，不是分类键。
- 单次 poll 返回有界（≤ 50），Core 侧查询结果同样有界——支撑产品原则五"页面必须有尽头"。

## 5. 三站点映射示例

以下均为**草案示意**，实际字段值以各 spike（#4/#5/#6）验证结果为准；若某能力不可行，从 `capabilities()` 数组中移除即可，契约结构不变。

### 5.1 NGA

```json
{
  "metadata": {
    "id": "nga",
    "display_name": "NGA",
    "home_url": "https://bbs.nga.cn",
    "contract_version": 1,
    "credentials": { "kind": "cookie", "fields": [{ "name": "cookie", "label": "NGA Cookie" }] }
  },
  "capabilities": ["latest", "hot", "account_events"],
  "watchpointKinds": [
    {
      "kind": "board", "display_name": "板块新帖/热帖", "exercises": "latest",
      "default_interval_seconds": 600, "requires_credentials": false,
      "params": [{ "name": "fid", "label": "板块 fid", "type": "select", "required": true }]
    },
    {
      "kind": "account_events", "display_name": "与我有关（回复/引用/点赞）", "exercises": "account_events",
      "default_interval_seconds": 300, "requires_credentials": true, "params": []
    }
  ]
}
```

示例 Watchpoint 与产出：

```json
{ "connector_id": "nga", "kind": "board", "params": { "fid": "650" }, "status": "active", "interval_seconds": 600 }
```

```json
{ "event_type": "hot_item", "title": "……", "url": "https://bbs.nga.cn/read.php?tid=…",
  "reason": "你常看的板块出现新热帖", "external_id": "tid-…",
  "metadata": { "board_name": "…", "replies": 87 } }
```

- 账户事件能力（`account_events`）取决于 #4 spike；不可行则从 `capabilities()` 移除，`board` 不受影响。板块读取是否需要登录同样以 #4 结论为准，若需要则把 `board.requires_credentials` 改为 `true`。
- 失败映射：登录态失效 → `auth_error`；触发反爬 → `rate_limited`。

### 5.2 Bilibili

```json
{
  "metadata": {
    "id": "bilibili",
    "display_name": "Bilibili",
    "home_url": "https://www.bilibili.com",
    "contract_version": 1,
    "credentials": { "kind": "cookie", "fields": [{ "name": "sessdata", "label": "SESSDATA" }] }
  },
  "capabilities": ["following_updates", "live_status", "metrics"],
  "watchpointKinds": [
    { "kind": "following_updates", "display_name": "关注 UP 更新", "exercises": "following_updates",
      "default_interval_seconds": 300, "requires_credentials": true, "params": [] },
    { "kind": "live_status", "display_name": "关注主播直播", "exercises": "live_status",
      "default_interval_seconds": 120, "requires_credentials": true, "params": [] },
    { "kind": "video_metrics", "display_name": "视频指标采样（实验，属 #18）", "exercises": "metrics",
      "default_interval_seconds": 900, "requires_credentials": false,
      "params": [{ "name": "bvid_list", "label": "视频 BV 号列表", "type": "text", "required": true }] }
  ]
}
```

示例产出：

```json
{ "event_type": "new_item", "title": "……", "url": "https://www.bilibili.com/video/…",
  "reason": "你关注的 UP 更新了", "external_id": "BV-…",
  "author": "…", "published_at": "…", "metrics": { "view": 1234, "like": 56 } }
```

```json
{ "event_type": "live_started", "title": "……", "url": "https://live.bilibili.com/…",
  "reason": "你关注的主播开播了", "external_id": "room-…" }
```

- `following_updates` / `live_status` 的候选来自用户关注列表，通过 `listWatchpointOptions` 拉取，无需用户手填 id。
- `video_metrics` 属于 #18 延后实验，v0 不实现；列出仅为说明契约能容纳它而不需要结构变更。

### 5.3 龙空

```json
{
  "metadata": {
    "id": "lkong",
    "display_name": "龙空",
    "home_url": "https://www.lkong.com",
    "contract_version": 1
  },
  "capabilities": ["latest", "hot"],
  "watchpointKinds": [
    {
      "kind": "forum", "display_name": "版块新帖/热帖", "exercises": "latest",
      "default_interval_seconds": 600, "requires_credentials": false,
      "params": [{ "name": "forum_id", "label": "版块", "type": "select", "required": true }]
    }
  ]
}
```

示例 Watchpoint 与产出：

```json
{ "connector_id": "lkong", "kind": "forum", "params": { "forum_id": "…" }, "status": "active", "interval_seconds": 600 }
```

```json
{ "event_type": "new_item", "title": "……", "url": "https://www.lkong.com/thread/…",
  "reason": "你常看的版块出现新帖", "external_id": "thread-…",
  "metadata": { "forum_name": "…", "is_digest": false } }
```

- 暂假设无需登录（以 #6 结论为准）；若需要，增加 `credentials` 字段即可，Watchpoint schema 不变。
- `forum` watchpoint 在 poll 之间对比同一帖子的回复数，已见过的帖子回复增长产出 `item_update` 事件——即"帖子更新"通过板块轮询附带实现，不需要独立 capability。
- 若 #6 显示必须支持**单帖级** Watchpoint 且现有能力无法表达，按"封闭枚举演进"规则提议 `thread_updates` capability 并提升 `contract_version`，而不是让 Core 出现站点判断。

## 6. 明确延后的抽象

以下内容**有意不做**，避免过度设计。每个都注明重新评估的触发条件：

| 延后项 | v0 做法 | 何时重新评估 |
|---|---|---|
| 插件市场 / 动态加载 Connector | Connector 编译进主程序 | 出现第三方 Connector 需求 |
| 富表单 / 通用参数 DSL | `ParamField` 四种基础类型 | 某站点添加流程确实无法表达 |
| 跨 Connector 搜索 | 枚举保留 `search`，无实现 | v0 验收后按 SPEC §3 非目标重新评估 |
| Push / webhook 推送 | 仅轮询 | 单机自用场景不构成需求 |
| 多账户 per Connector | 一个 Connector 一份凭据 | 多用户支持被提上日程时 |
| Watchpoint 级凭据 | 明确拒绝（SPEC §9） | 不再评估 |
| 通用热帖/增长规则引擎 | 规则内聚在各 Connector 内 | #18 实验定义出稳定形状后 |
| reason 文案 i18n | 仅 zh-CN | 出现第二语言用户 |
| 分布式调度 / 多实例 | 单进程单实例 | 单机自用不构成需求 |
| 原始响应长期归档 | `metadata` ≤ 4KB，可被清理 | 出现真实回溯需求（当前被产品边界排除） |

## 7. 验收对照

- [x] 明确 Connector interface —— §1
- [x] 明确 Watchpoint schema —— §2
- [x] 明确 Event schema —— §4
- [x] 明确 capability/error model —— §1、§3
- [x] 给出 3 个站点映射示例 —— §5
- [x] 文档说明哪些抽象明确延后 —— §6

## 后果

- #9 的 SQLite schema 直接落为本契约的 snake_case 字段；Watchpoint 配置表与运行时状态表必须分开建。
- #10 调度器以 `default_interval_seconds` / `next_poll_hint_seconds` / `retry_after_seconds` 为唯一频率输入，并实现钳制与重叠防护。
- #11 以 `(watchpoint_id, event_type, external_id)` 为 dedup 键，并负责分区推导与结果截断。
- Core 中禁止出现 `"nga"` / `"bilibili"` / `"lkong"` 字符串判断；一切分支基于 Connector 注册表声明的 capability 与 kind。
