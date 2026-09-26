# Grok UI Reference

This directory is the current runnable UI reference for Personal Internet Watchtower.

## Purpose

Use it to preserve the current visual language and interaction direction while the production architecture is still being implemented.

Authoritative product/UI rules live one level up:

- [../UI_DESIGN.md](../UI_DESIGN.md)
- [../SPEC.md](../SPEC.md)
- [../PRODUCT_PRINCIPLES.md](../PRODUCT_PRINCIPLES.md)

If this prototype conflicts with those documents, the documents win.

## Current classification

- **和我有关**: replies / likes / @mentions only.
- **关注更新**: explicit watchpoint updates, including forum threads, followed uploads, and followed livestreams.
- **值得看看**: bounded, explainable surfacing inside already-added sources.

## Hygiene

This is a UI reference, not the production application architecture. Grok/App Builder workspace metadata, generated deployment output, project IDs, preview logs, and generator skills are intentionally excluded.

Do not add permanent manifesto/slogan/end-of-feed copy to the main dashboard.


## Provider-specific runtime support

Some Grok/App Builder support code is still kept only so the reference remains runnable, for example parts of:

- `src/lib/auth/`
- `src/lib/app-data/`
- `migrations/`
- `server/`
- `public/__grok/`
- build/startup scripts

Treat these as **reference-environment scaffolding**, not as requirements for the production Watchtower architecture. Do not copy them into Core unless an actual product requirement independently justifies them.
