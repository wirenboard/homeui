# Backend Project Rules — code style (Python)

Code-style rules for `backend/` (the `wb.homeui_backend` auth/session service). The
repo-wide **agent workflow rules** live in the root `../project-rules.md` (loaded via the
root `CLAUDE.md`) — they are not repeated here. The `code-review-orchestrator` skill reads
this file for backend changes.

## Code Style & Notes

- **Style/lint config** — Wiren Board codestyle in `backend/pyproject.toml` (black, isort, and the
  pylint ruleset; all parameters live in that file). Format and check before done with the
  `.venv/bin/` tools — see the verification pipeline in `CLAUDE.md` (`isort` → `black` → `pylint`
  → `pytest`). CI additionally enforces pylint ("angry") + coverage (see `Jenkinsfile`).
- **Synchronous, threaded I/O** — the service is a synchronous `BaseHTTPRequestHandler`
  with `threading` + `queue`, **not** asyncio. Match that model; do not introduce
  `async`/`await` or an event loop.
- **Test base** — `unittest.TestCase` (one class per handler/unit) plus `pytest` where
  parametrization helps (`@pytest.mark.parametrize`). Files named `*_test.py` under
  `tests/`. Mock collaborators with `unittest.mock` (`MagicMock(spec=...)`).
- **Docstrings on non-trivial tests** — start the test with a short docstring describing
  the scenario (what's set up, what's exercised, what's expected). Trivial one-assertion
  tests don't need it; anything with multi-step setup or non-obvious expectations does.
- **Enums over string/int constants** — already the practice (`CertificateState`,
  `UserType`); keep it. When a value has a small fixed set of options, model it with
  `enum.Enum`. Plain `Enum` by default; reach for `IntEnum`/`StrEnum`/`Flag` only with a
  concrete reason (interop, bitwise ops).
- **Dataclasses over dict/tuple soup when the shape is known** — already the practice
  (`Session`, response records, rate-limiter state). Declare a `@dataclass` (frozen for
  immutable records, mutable for in-place state) instead of passing loose dicts/tuples or
  several parallel dicts keyed by the same value. Type aliases (`UserId = str`) are cheap
  and document intent in signatures.
- **Scope pylint disables** — `# pylint: disable=...` goes on the single line or function
  it applies to (as the existing code does, e.g. on `do_GET` / `except ...` lines), never a
  whole module, and only with a concrete reason.

### Class method ordering

Within every class body, group methods in this order, with `# --- ... ---` dividers between
groups (omit empty groups and their dividers):

1. `__init__` and other dunder methods.
2. Public methods and `@property`s — the class's external API.
3. `# --- Hooks for subclasses ---` — methods intended to be overridden.
4. `# --- Private ---` — internal helpers not intended for subclasses to override.

Within each group, order by relevance / call sequence, not alphabetical.
