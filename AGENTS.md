# Personal Internet Watchtower

Agent working notes for this repo. Human-facing docs live in [`README.md`](README.md) and [`docs/`](docs/).

## Agent skills

### Issue tracker

Issues live as GitHub issues on this repo; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to the default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.


### UI baseline

The current UI reference is `docs/grok-UI-referenc/`. Before changing product-facing UI, read `docs/UI_DESIGN.md`.

Hard classification rules:
- “和我有关” = replies / likes / @mentions only.
- “关注更新” = updates from explicit watchpoints, including forum threads, followed uploads, and followed live streams.
- “值得看看” = bounded, explainable surfacing inside already-added sources.
- Do not add persistent philosophy/slogan/end-of-feed copy to the main dashboard.
