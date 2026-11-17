# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`homeui` is the Wiren Board web interface — a React SPA (`frontend/`) talking to a Wiren Board
controller over MQTT, plus a small Python auth/session backend (`backend/`). The two are deployed
together as the `wb-mqtt-homeui` Debian package but are otherwise **independent codebases**, each
with its own stack, verification pipeline, and conventions.

## Codebases

Each codebase has its own `CLAUDE.md` (loaded automatically when you work in that directory) — go
there for commands, architecture, and code style:

- **`frontend/`** — React 18 + TypeScript + Vite + MobX. Almost all application work happens here.
  See `frontend/CLAUDE.md`.
- **`backend/`** — Python HTTP service (`wb.homeui_backend`) for auth, sessions, users, TLS cert
  checks. See `backend/CLAUDE.md`.

## Agent tooling (Claude Code plugins)

Skills and subagents come from the shared marketplace
[`wirenboard/wb-agent-tools`](https://github.com/wirenboard/wb-agent-tools) — not vendored here.
Install once (run as slash commands; `/reload-plugins` after):

```
/plugin marketplace add wirenboard/wb-agent-tools
/plugin install wb-core@wb         # baseline kit (see Task workflow below)
/plugin install wb-webui-test@wb   # opt-in browser testing for frontend/UI work
```

Full docs (deps, `uv` requirement, updates, opt-out) live in the marketplace `README.md`.

## Task workflow

Non-trivial changes follow **plan → implement → review**, powered by the `wb-development` plugin:

- **Plan** with the `plan-feature` skill (optionally `design-review` for architecture variants).
- **Implement** via the `coder` subagent against the relevant codebase, then run its
  verification pipeline (see that codebase's `CLAUDE.md`).
- **Review** with the `code-review-orchestrator` skill before merging — it produces one in-chat
  report with severity ratings and a merge verdict (writes no file).
- **PR** with the `pr-prep` subagent (squash + clean PR; never touches git until you approve).

## Rules & code style

Repo-wide **agent workflow rules** (commits, renames, tests, force-push, lint suppression)
live in @project-rules.md — the single source of truth, imported here so it loads every
session, and read directly by the `code-review-orchestrator` skill.

Because the two codebases differ, **code style is per stack** and loads contextually:

- `frontend/CLAUDE.md` + `frontend/project-rules.md` — TS / React / MobX.
- `backend/CLAUDE.md` + `backend/project-rules.md` — Python.

Both ship together in the `wb-mqtt-homeui` Debian package (`debian/`); packaging/deploy
details live with each codebase.
