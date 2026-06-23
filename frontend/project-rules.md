# Frontend Project Rules — code style (TS / React / MobX)

Code-style rules for `frontend/`. The repo-wide **agent workflow rules** live in the root
`../project-rules.md` (loaded via the root `CLAUDE.md`) — they are not repeated here. The
`code-review-orchestrator` skill reads this file for frontend changes.

> **Loose by design.** TypeScript `strict` is **off** (no `strictNullChecks` /
> `noImplicitAny`) and the existing code is intentionally loose. The rules below are
> **preferences for new/changed code**, not a mandate to refactor untouched files. Match
> the surrounding style first.

## Code Style & Notes

- **Types live in `types.ts`** — each component / store / page-feature directory keeps **all** its
  `interface` / `type` / `enum` declarations in a co-located `types.ts`, imported via `./types`
  (the established pattern across the codebase). This includes component `*Props` and types used
  only within the directory — not just exported ones. Public types are re-exported from the
  directory's `index.ts` (`export type { Foo } from './types'`). Don't declare types inline in
  `.tsx` or store files.
- **Enums / unions over bare literals** — when a value has a small, fixed set of options
  (status, kind, mode, action), model it with a TS `enum` or a string-literal union type
  rather than loose `string` / `number` literals scattered across the code.
- **Typed shapes over loose objects when the shape is known** — if you know the keys and
  types, declare an `interface` / `type` and use it, instead of `Record<string, any>` or
  untyped object soup. Soft rule given the loose baseline; apply where it documents intent
  (props, store state, RPC payloads).
- **Test descriptions on non-trivial tests** — vitest `describe`/`it` titles should state
  the scenario (what's set up, what's exercised, what's expected). Trivial one-liners
  (single assertion against a pure function) don't need it; anything with multi-step setup
  or non-obvious expectations does. Co-locate tests as `*.test.ts(x)`.
- **Class member ordering in MobX stores** — within a store class, group members in this
  order with `// --- ... ---` dividers (omit empty groups):
  1. `constructor` and other dunder-like setup (`makeAutoObservable`, etc.).
  2. Public observables, `@computed` getters, and actions — the store's external API.
  3. `// --- Private ---` — internal helpers (typically `_`-prefixed).

  Within each group, order by relevance / call sequence, not alphabetically.
