# Tickets & Blocking Map

> 本页是 GitHub Issues 的索引。真正的执行状态以 Issues 为准。  
> Spec: [SPEC.md](SPEC.md)

## Phase 0 — 先解阻塞

这些 tickets 可以优先并行：

- [#2 Connector / Watchpoint / Event contract](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/2)
- [#3 v0 Secrets / credentials](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/3)
- [#4 NGA feasibility](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/4)
- [#5 Bilibili feasibility](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/5)
- [#6 龙空 feasibility](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/6)
- [#8 Dashboard foundation decision](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/8) — **resolved: lightweight custom UI, Grok reference baseline**

## Phase 1 — Core

- [#9 SQLite persistence](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/9)  
  **Blocked by:** #2
- [#10 Scheduler / Connector runner](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/10)  
  **Blocked by:** #2, #9
- [#11 Event normalization / dedup / bounded filtering](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/11)  
  **Blocked by:** #2, #9

## Phase 1 — Initial Connectors

- [#12 NGA MVP Connector](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/12)  
  **Blocked by:** #2, #3, #4; integrates with #9/#10
- [#13 Bilibili MVP Connector](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/13)  
  **Blocked by:** #2, #3, #5; integrates with #9/#10
- [#14 龙空 MVP Connector](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/14)  
  **Blocked by:** #2, #6; #3 only if auth is needed; integrates with #9/#10

## Phase 1 — Product Surface

- [#15 Watchpoint add / pause / resume / remove](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/15)  
  **Blocked by:** #2, #9, #10; site options depend on #12/#13/#14
- [#16 Finite Dashboard](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/16)  
  **Blocked by:** #11; uses resolved UI baseline from #8 and needs fixtures or implementations from #12/#13/#14

## MVP Gate

- [#17 End-to-end acceptance & real-use trial](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/17)  
  **Hard blocked by:** #3, #9, #10, #11, #12, #13, #14, #15, #16

## Post-MVP Experiment

- [#18 Bilibili-local AI video growth discovery](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/18)  
  **Not an MVP blocker.**  
  **Blocked by:** #5, #9, #11, #13 and completion of #17.

---

## Dependency Graph

```text
                #2 Connector contract
                /       |        \
              #9       #10       #11
              |         ^         |
              |         |         +--------+
              |         |                  |
              +---------+                  v
                                         #16 Dashboard
#3 Secrets ----+                           ^
               |                           |
#4 NGA spike -> #12 NGA -------------------+
#5 Bili spike ->#13 Bilibili --------------+
#6 LK spike --->#14 龙空 -------------------+
                                             \
#8 UI baseline (resolved) -------------------->#16

#2 + #9 + #10 + Connectors -----------------> #15 Watchpoint UX

#3 + #9 + #10 + #11 + #12 + #13 + #14 + #15 + #16
                              |
                              v
                         #17 MVP Gate
                              |
                              v
                    #18 Bilibili discovery
```

## Critical Path

最可能的关键路径是：

```text
#2 Contract
  ↓
#9 Persistence
  ↓
#10 Runner + #11 Normalization
  ↓
#12/#13/#14 Connectors
  ↓
#15/#16 Product Surface
  ↓
#17 MVP Acceptance
```

同时，#4/#5/#6 三个站点 spike 会决定各 Connector 的真实范围；如果其中一个站点发现不可稳定实现，应**缩小该 Connector 的 v0 scope，而不是阻塞整个项目**。

## Blocker Policy

遇到技术阻塞时遵守以下规则：

1. **先缩小能力，不先扩大系统。**  
   例如 NGA 点赞事件不稳定，不应为了它引入重型浏览器自动化并拖慢整个 MVP。

2. **一个站点失败，不阻塞其他站点。**  
   Connector 必须可独立降级。

3. **实验能力不进入 MVP critical path。**  
   尤其 #18 的 AI discovery。

4. **产品边界优先于功能数量。**  
   如果某个方案会把 Watchtower 变成新的无限内容入口，应回到 `docs/PRODUCT_PRINCIPLES.md` 重新判断。

## Epic

- [#1 v0 MVP Epic](https://github.com/q956085398-netizen/Personal-Internet-Watchtower/issues/1)

> #7 是创建过程中产生的重复 Epic，已作为 duplicate 关闭。


## UI classification guardrails

For tickets touching presentation or normalized events:

- “和我有关” = 回复我 / 点赞我 / @我 only.
- “关注更新” = explicit watchpoint updates, including followed UP uploads and followed livestreams.
- “值得看看” = bounded, explainable surfacing inside existing sources.
- Do not add permanent product-philosophy or end-of-feed copy to the dashboard.
