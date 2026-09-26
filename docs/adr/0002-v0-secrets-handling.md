# ADR-0002: v0 本地凭据 / Secrets 处理

- 状态：已接受
- 日期：2026-09-26
- 关联工单：[#3](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/3)（本 ADR 是其交付物）
- 解锁：#12（NGA Connector）、#13（Bilibili Connector）的登录态实现；#15 的凭据配置 / 清理入口
- 依据：[SPEC §9](../../SPEC.md)、[ADR-0001 §1](0001-connector-watchpoint-event-contract.md)（凭据按 Connector 作用域存储）

## 决策概述

单用户自托管场景下，v0 选择**本地 Secret 文件（主存储、可读写）+ 环境变量覆盖（只读）**的组合，实现于 `src/secrets/`：

```text
data/secrets.json                    # 主存储：{ "<connector_id>": { "<field>": "<value>" } }
WATCHTOWER_SECRET_<CONNECTOR>__<FIELD>   # 环境变量覆盖，优先于文件
```

- 环境变量命名：connector id 大写、`-` 映射为 `_`，用**双下划线**与字段名分隔（如 `WATCHTOWER_SECRET_BILIBILI__SESSDATA`）。字段名解码时统一转小写。
- 文件缺失 = 尚未配置凭据；文件内容非法（坏 JSON、非字符串值、非法 scope 键）在创建 store 时**立即报错并带文件路径**——凭据文件坏了必须让自托管用户第一时间看到，而不是静默当作未配置。
- 写入是原子的（临时文件 + rename），POSIX 下以 `0600` 创建；空字符串值一律视为未配置，不会落盘。
- 环境变量优先于文件，使容器部署可以不挂载 secret 文件；同时 `set()` 只写文件，永远不会反向写入环境。

## 为什么不是别的方案

| 备选 | 不选的原因 |
|---|---|
| 只用环境变量 | 长 Cookie 在 shell 里的引号 / 转义非常痛苦；且无法通过 UI（#15）写回 |
| OS keychain（本地 secret storage） | 需要每个平台的原生依赖，v0 单用户自托管场景下收益不成比例 |
| SQLite 表 | 凭据会随数据库文件被复制 / 备份 / 打包；独立文件便于用户用既有工具（chmod、加密盘）管理，也便于 `gitignore` 排查 |
| 企业 Vault | SPEC §9 明确的非目标 |

## 与契约的衔接

- **作用域**：凭据永远以 Connector 为作用域（ADR-0001 §1 的 `CredentialsSpec`），Watchpoint schema 无凭据字段，不存在重复保存。
- **注入**：调度器的 `SchedulerOptions.resolveCredentials`（#10 预留的接缝）接 `secretsStore.get(connectorId)`；Connector 仍然只在 `PollContext.credentials` 里拿到已解析的凭据，感知不到存储方式。
- **缺失即明确报错**：kind 声明 `requires_credentials: true` 而凭据为空（null 或空 record）时，Core 不调用 Connector，直接记录 `auth_error` 失败（面向用户的消息含期望字段名）。这复用 ADR-0001 §3 的语义：停止自动调度，等待用户配置后手动重跑。
- **过期**：由 Connector 在 poll 时检测并返回 `auth_error`（ADR-0001 §3），Core 的处理路径与缺失一致。

## 浏览器边界

Dashboard / 任何浏览器侧代码永远拿不到凭据值。浏览器可见的只有 `describeCredentials()` 的状态视图：

```ts
{ connectorId: "bilibili", required: true, configured: false,
  fields: [{ name: "sessdata", label: "SESSDATA", present: false }] }
```

（SPEC §9："front-end never receives unnecessary raw credentials"。）

## 删除路径

- 删除 Watchpoint 不触碰凭据（ADR-0001 §2）。
- 删除某 Connector 最后一个 Watchpoint 后，`orphanedCredentialScopes()` 会列出"仍有凭据但无 Watchpoint"的 scope，供 #15 的 UI 提供**可选**清理（SPEC §9）。环境变量来源的凭据不在此列——它归部署环境管理，Core 不能删除。

## 明确延后

| 延后项 | 触发重新评估的条件 |
|---|---|
| 文件格式版本号 | 出现需要迁移的结构变更 |
| 加密静态存储 | 出现多用户或设备共享需求 |
| 凭据轮换提醒 | 站点 spike（#4/#5）验证 Cookie 生命周期之后 |

## 验收对照

- [x] Git 仓库中不存在真实凭据 —— 默认路径在 `data/`（已 gitignore），文档要求自检（docs/SECRETS.md）
- [x] 浏览器端拿不到不必要的原始 Cookie/Token —— 状态视图只暴露 presence
- [x] Connector 可按 connector scope 获取凭据 —— `resolveCredentials` → `PollContext.credentials`
- [x] 有明确的 credential missing / expired 错误 —— Core 侧缺失门（auth_error）+ Connector 侧过期（ADR-0001 §3）
- [x] 有最小配置文档 —— docs/SECRETS.md
