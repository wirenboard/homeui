# Backend — Claude Code guidance

Python HTTP service (`wb.homeui_backend`) handling **authentication, sessions, users, TLS cert
checks, and dashboards** over a Unix socket — it is **not** the MQTT data path.

Repo-wide context (task workflow, deployment, the two codebases) is in the root `../CLAUDE.md`.

## Rules

- **Workflow rules** (repo-wide): `../project-rules.md` — loaded via the root `CLAUDE.md`.
- **Backend code style** (Python): @project-rules.md

## Architecture

Entry point `wb/homeui_backend/main.py` (`BaseHTTPRequestHandler`); synchronous, `threading` +
`queue` (not asyncio). Modules:

- `users_storage`, `sessions_storage`, `keys_storage` — user/session/key persistence.
- `rate_limiter` — login throttling.
- `security`, `cert` — security check + TLS certificate state.
- `dashboards` — owns `/etc/wb-webui.conf`: the lightweight index + lazy per-dashboard SVG
  endpoints (`GET/PUT /api/dashboards` for the collection, `GET /api/dashboards/<id>/svg` for the
  lazy markup, and `PUT`/`PATCH`/`DELETE /api/dashboards/<id>` for one dashboard's lifecycle),
  atomic writes, and board-config seeding + default reconciliation at startup.
- `board` — device-tree `of_machine_match` wrapper (board detection), shared with `cert`.
- `db` — SQLite at `/var/lib/wb-homeui/users.db`.
- `terminal/` — web terminal: listener `wb-terminal-server` plus a process per session
  (`wb-terminal-session`); `registry` holds the cross-version contract between them. Session code
  imports everything at module level: an upgrade replaces files under a running session. See
  `../docs/web-terminal-sessions.md`.
- `http_response`, `config_file` — response helpers and config parsing.

## Environment setup

Use a self-contained `.venv` built by the bootstrap script (idempotent — rerun to sync deps):

```sh
./scripts/bootstrap-venv.sh
```

It bundles a pinned Python inside `.venv/` and installs `requirements.txt` (runtime, incl.
`wb_common` from git) plus `requirements-dev.txt` (dev/test/lint tooling). Always run tools from
`.venv/bin/…`.

## Mandatory verification pipeline (after any backend code change)

Run all four from `backend/` and fix every failure before considering the change done / opening a
PR. All tools read their config from `backend/pyproject.toml`:

```sh
.venv/bin/isort --src .. wb tests   # import sorting — see --src note below
.venv/bin/black wb tests            # formatting
.venv/bin/pylint wb tests           # lint — must pass clean
.venv/bin/pytest                    # tests (tests/*_test.py) — all green
```

`tests/integration/` needs a stand (root, installed `wb-terminal-server`,
`WB_TERMINAL_INTEGRATION=1`) and skips itself otherwise; see `tests/integration/console.py`.

**Always pass `--src ..` to isort.** The config is only `profile = "black"`, so isort auto-detects
first-party packages from its source root. Run plainly from `backend/`, it sees `wb/` next to the
config and treats `wb.*` as **first-party** (separate import group, blank line before it). CI runs
isort from the repo root, where `wb/` is not directly present, so it treats `wb.*` as
**third-party** (no blank line) — the opposite result, failing the build. `--src ..` points the
source root at the repo root, reproducing CI's classification locally. Do **not** "fix" this by
editing `pyproject.toml`.

CI (`Jenkinsfile`) runs pylint ("angry") + coverage on the backend; the frontend is excluded from
the Python checks.

## Deploy

- `make install` installs binaries and configs (from `backend/configs/`) under `/usr/`.
- NGINX config ships at `/usr/share/wb-mqtt-homeui/nginx/default.conf` (do not edit directly); add
  overrides under `/etc/nginx/includes/default.wb.d/*.conf`.
