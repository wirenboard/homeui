# Project Rules — repo-wide

Cross-cutting, language-agnostic rules for the whole `wb-mqtt-homeui` repo (both
`frontend/` and `backend/`). This file is the **single source of truth** for the agent
workflow rules: it is imported into the root `CLAUDE.md` (via `@project-rules.md`) so it
loads in every session, and it is read directly by the `code-review-orchestrator` skill.

Code style is **per stack** and lives next to each codebase:

- `frontend/project-rules.md` — TS / React / MobX.
- `backend/project-rules.md` — Python (`wb.homeui_backend`).

## Agent Workflow Rules

- **No commits without approval** — never create a git commit without explicit user approval in the current conversation.
- **No editing existing tests without approval.**
- **No gratuitous renames** — do not rename existing identifiers (locals, params, functions, methods, classes, module-level constants, components) unless functionally required (old name became misleading after a behavior change, or a real name clash). Subjective "consistency"/"better naming" doesn't count; expanding a signature does not justify renaming.
- **No throwaway temp vars** — do not introduce a temporary local variable for 1–2 uses; only if used 3+ times or it materially improves readability.
- **No silencing tests or linters** — do not disable or skip tests; do not add lint/type suppressions without a concrete reason. This covers `eslint-disable` / `@ts-ignore` / `@ts-expect-error` (frontend) and `# pylint: disable` / `# noqa` / `# type: ignore` (backend). Fix the underlying issue. When a suppression is genuinely unavoidable, give a reason and scope it to a **single line or function**, never a whole file/module.
- **Never force-push a PR** — no `--force` / `--force-with-lease` to update a PR. Add new commits — reviewers need incremental changes.
- **No new private access from tests** — tests must not **add new** access to private members of production code (`_underscore` in Python; `private` / `#private` fields or module-internal symbols in TS). If a test can't be written against the public API, **stop and ask the user** — the fix usually means widening the API or rethinking the test. Pre-existing private access in untouched test code is tolerated debt.
