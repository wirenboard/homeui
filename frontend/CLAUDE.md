# Frontend — Claude Code guidance

React 18 + TypeScript + Vite + MobX. This is where almost all application work happens.

Repo-wide context (task workflow, deployment, the two codebases) is in the root `../CLAUDE.md`.

## Rules

- **Workflow rules** (repo-wide): `../project-rules.md` — loaded via the root `CLAUDE.md`.
- **Frontend code style** (TS/React/MobX): @project-rules.md

## Commands (run from `frontend/`)

```sh
npm install
npm run dev          # Vite dev server on :8080, opens browser
npm run build        # production build to dist/
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch mode
npm run check:types  # tsc --noEmit
npm run lint         # eslint (cached)
npm run lint:fix     # eslint --fix
```

Run a single test file or pattern:

```sh
npx vitest run src/stores/devices/cell.test.ts
npx vitest run -t "name of test"
```

## Mandatory verification pipeline (after any frontend code change)

Run all three from `frontend/` and fix every failure before considering the change done / opening a PR:

```sh
npm run check:types   # tsc --noEmit — must pass clean
npm run lint          # eslint — must pass clean (npm run lint:fix to autofix)
npm test              # vitest run — all tests green
```

## Dev server / connecting to a controller

`npm run dev` proxies `/mqtt`, `/auth`, `/device`, `/fwupdate`, etc. to `MQTT_BROKER_URI`
(default `http://10.200.200.1`). To point at a different controller, copy `.env.default` to `.env`
and set `MQTT_BROKER_URI`. Env vars also drive branding (`APP_NAME`, `LOGO`, …) via Vite `define`.

## Architecture

The app is a thin reactive layer over MQTT. Data flows: **MQTT ↔ services ↔ MobX stores ↔ React**.

- **`src/services/`** — the transport layer.
  - `mqtt-client.ts` wraps the `mqtt` library; a single `mqttClient` singleton is shared app-wide.
  - `rpc.ts` implements MQTT-RPC over topics (`/rpc/v1/<target>/<method>/...`). Use
    `createRpcProxy<T>(target, methodNames)` to build a typed proxy; each entry becomes an async
    method returning the RPC result. `*-proxy.ts` files (`dali-proxy`, `editor-proxy`,
    `history-proxy`, `device-manager-proxy`, …) are these proxies. Re-exported from `services/index.ts`.
- **`src/stores/`** — MobX stores, the source of truth. Most are exported as **singletons** from the
  store's `index.ts` (e.g. `devicesStore`, `authStore`, `dashboardsStore`, `uiStore`). Stores own
  domain state and call the service proxies. Components observe stores via `mobx-react-lite`
  (`observer(...)`).
- **`src/main.tsx`** — bootstrap. Waits for `authStore.isAuthenticated`, then connects `mqttClient`,
  subscribes rules logs, loads dashboards. Uses MobX `when`/`autorun`/`runInAction` to wire reactions.
- **`src/router/`** — `react-router-dom` `createHashRouter`. Routes are lazy-loaded in `routes.tsx`;
  `middlewares/` holds route guards (`authGuard`, `homeRedirect`). `legacy-redirects.ts` maps old
  AngularJS-era URLs to new ones.
- **`src/pages/`** — route-level pages (dashboards, devices, history, rules, settings, login,
  integrations). **`src/components/`** — reusable presentational components. **`src/layouts/`** —
  app/default/page shells.
- **`src/i18n/`** — i18next; translations in `src/i18n/locales/{en,ru}.json`. UI is bilingual EN/RU.

Path alias: `@/` → `src/` (configured in `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`).

## Conventions

- TypeScript `strict` is **off** (`strictNullChecks`/`noImplicitAny` disabled) — match the loose
  style already in files; don't introduce strict-only assumptions.
- Lint config is `@wirenboard/eslint` (base + react) in `eslint.config.mjs`.
- Tests: vitest with `globals: true` (no need to import `describe`/`it`/`vi`), happy-dom,
  `@testing-library/react`. Setup file `src/test/setup-components.ts`. Co-locate tests as
  `*.test.ts(x)` next to the code.
- Device/control modeling lives in `src/stores/devices/` (`Cell`, `Device`, cell-type maps). MQTT
  device/control conventions follow https://github.com/wirenboard/conventions.

## Deploy

- `make install` rsyncs the production build (`dist/`) to `/var/www`.
- A custom left-nav menu can be supplied as JSON in `/usr/share/wb-mqtt-homeui/custom-menu`
  (structure documented in the root `README.md`).
