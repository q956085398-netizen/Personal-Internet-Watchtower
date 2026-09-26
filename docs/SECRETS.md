# 凭据配置（v0）

需要登录态的 Connector（如 Bilibili、NGA 的账户能力）通过本地凭据获取登录态。凭据按 **Connector 作用域**保存：同一站点的所有 Watchpoint 共享一份，删除 Watchpoint 不会删除凭据。

设计决策见 [ADR-0002](adr/0002-v0-secrets-handling.md)；实现位于 `src/secrets/`。

## 两种配置方式

### 方式一：Secret 文件（推荐交互使用）

编辑 `data/secrets.json`（目录不存在会自动创建）：

```json
{
  "bilibili": {
    "sessdata": "从浏览器复制的 SESSDATA"
  },
  "nga": {
    "cookie": "从浏览器复制的完整 Cookie"
  }
}
```

- 顶层键是 connector id（小写），内层键是该 Connector 声明的凭据字段名（见各 Connector 文档）。
- 文件权限：POSIX 下程序以 `0600` 原子写入；Windows 下请确保该目录不与他人共享。
- **不要提交到 Git**：`data/` 已在 `.gitignore`；若把文件放到别处，请自行加入 `.gitignore`。

### 方式二：环境变量（推荐容器部署）

```bash
WATCHTOWER_SECRET_BILIBILI__SESSDATA="..."
WATCHTOWER_SECRET_NGA__COOKIE="..."
```

命名规则：`WATCHTOWER_SECRET_` + connector id（大写，`-` → `_`）+ `__`（双下划线）+ 字段名（大写）。

环境变量**优先于**文件中的同名字段，且为只读来源：程序内保存凭据不会写回环境变量。

## 凭据缺失 / 过期会怎样

- 某类 Watchpoint 声明需要凭据而凭据未配置时，调度器**不会发起请求**，而是把该 Watchpoint 记为 `auth_error`（消息中会列出期望的字段名）。配置好凭据后手动重跑即可恢复。
- 凭据过期由 Connector 检测，同样记为 `auth_error` 并停止自动重试——这是提醒你更新凭据，不是站点故障。

## Dashboard 能看到什么

界面只能看到**是否已配置**（字段 presence），永远看不到也不需要看到凭据内容本身。

## 自检

```bash
git check-ignore -v data/secrets.json   # 应输出匹配规则
grep -r "SESSDATA" --include="*.ts" src/ # 应无结果
```
