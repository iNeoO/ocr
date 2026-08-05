# CLAUDE.md

Guidance for working in this repository. See [README.md](README.md) for the user-facing
overview and deployment instructions.

## What This Is

OCR ingests PDFs, splits them into page images, transcribes them through an
asynchronous queue pipeline, refines the result with an LLM, and delivers a ZIP
archive. Production: [ocr.tuturu.io](https://ocr.tuturu.io).

## Architecture

`pnpm` monorepo (workspaces: `apps/*`, `packages/*`, `db`, `workers/*`, `scripts`).

**There is no separate API process.** The TanStack Start server in
[apps/web/](apps/web/) owns Postgres, Redis, S3 and RabbitMQ directly and
calls the business services in-memory. Do not add an HTTP backend — server functions
and route handlers are the server layer.

```
apps/web              React + Vite + TanStack Start/Router/Query UI *and* the server layer
workers/*             queue-driven pipeline workers (one package per stage)
packages/services     business logic — classes with constructor-injected dependencies
packages/infra        env, pino, Redis, S3, AMQP consumer helper
packages/common       zod contracts and types shared client/server
db                    Drizzle schema + migrations
scripts               one-off maintenance scripts
```

### Dependency direction

`web`/`workers` → `services` → `db`/`infra`/`common`. Nothing in `packages/*` may
import from `apps/*` or from a worker's handler/consumer.

The one deliberate exception: `services` imports worker **publishers** (`@ocr/<worker>/publisher`)
as types. That makes the workspace graph technically circular, which is why
`build:runtime` has a hand-ordered build sequence (`common → infra → db → workers →
services`) and why every package's `exports` map points `types` at `src/*.ts` while
`default` points at `dist/*.js` — `tsc` reads sources, Node runs the build.

### Pipeline

```
upload → split-pdf-worker → transcribe-jpg-worker → post-process-page-worker
                                                  → ZIP + download
cleanup-process-worker: node-cron, "0 */2 * * *" UTC, retention 7 days
```

Each worker package owns the publisher for **its own** queue and exports it via
`./publisher`. The *upstream* container instantiates the *downstream* publisher —
`split-pdf-worker/container.ts` builds a `TranscribeJpgPublisher`, and so on.

Live status reaches the browser over SSE at `GET /api/processes/status`, fed by
`ProcessStatusPubSubService` on Redis pub/sub. Stage names are the zod enum in
[packages/common/src/types/processStatusEvent.type.ts](packages/common/src/types/processStatusEvent.type.ts) —
keep it in sync with the DB `process_status` enum when adding a stage.

## Commands

```bash
pnpm install
docker compose up -d          # postgres 5435, redis 6379, rabbitmq 5672/15672, garage 3900
pnpm garage:init              # once, after first start or after wiping the garage-data volume
pnpm dev                      # predev builds runtime packages, then web + all workers
pnpm build
pnpm lint                     # biome check, recursive — read-only, does not fix
pnpm db:generate              # after editing db/src/schemas/*
pnpm db:migrate
pnpm scripts:clean-processes
```

Every root script wraps the command in `dotenv -e .env`. Run scripts from the root, not
from a package directory, or `env` parsing will fail on missing variables.

Run a single package: `pnpm --filter @ocr/<name> <script>`.

Formatting and linting are Biome ([biome.json](biome.json)) — **tabs**, double quotes,
organize-imports on. `pnpm lint` only reports; use `pnpm --filter @ocr/<name> exec biome check --write`
to fix.

There are currently **no tests** in the repo. `vitest` is wired up in `@ocr/web`
and `@ocr/services` but no spec files exist yet.

## Conventions

**Env.** One zod schema, [packages/infra/src/configs/env.ts](packages/infra/src/configs/env.ts),
parsed at import time — a missing variable crashes the process at boot, by design. Never
read `process.env` elsewhere; add the variable to the schema, to [.env.exemple](.env.exemple)
and to [.env.docker.example](.env.docker.example). The schema's `transform` derives
`REDIS_KEY_PREFIX` (`ocr:<dev|test|prod>:`) — always namespace Redis keys with it.

**Containers.** Each runtime composes its own dependency graph by hand in a
`container.ts` (`createContainer()` returning `{ init, shutdown, handler }` for workers;
a module-level singleton pinned on `globalThis` for the web app). No DI framework. Wire
new services there, and add their teardown to `shutdown`.

**Services.** Classes in `packages/services/<domain>/<domain>.service.ts`, dependencies
passed as a single object to the constructor and stored `private readonly`. Types live in
a sibling `<domain>.types.ts`. Optional dependencies (`splitPdfPublisher?`) exist because
a worker only needs part of the graph — keep them optional rather than building unused
AMQP channels.

**Worker package layout.** Always these four files plus a handler and a contract:

```
src/index.ts                      bootstrap: createContainer → init → startConsumer → signals
src/container.ts                  dependency wiring
src/consumer.ts                   startResilientConsumer + logger child + ack/nack
src/publisher.ts                  exported for upstream packages
src/contracts/<name>.schema.ts    zod job payload + parseRawMessage
src/handler/<name>.handler.ts     createXWorker({ deps }) => (message) => Promise<void>
```

Messages are validated with zod on both publish and consume. A handler that throws gets
`channel.nack(msg, false, false)` — no requeue, no DLQ. Handlers are responsible for
publishing their own `process_status` event on both success and failure paths.

`startConsumer` returns the `ResilientConsumer` handle; `index.ts` owns SIGINT/SIGTERM and
shuts down in order — `consumer.end()` (cancel, drain in-flight jobs, close) then
`container.shutdown()`, then `process.exit`. The consumer never registers a signal handler
itself. Prod compose gives the worker services `stop_grace_period: 30s` so the 15s drain
fits inside it.

**Logging.** `pinoLogger` for bootstrap and top-level code. Inside a request or job,
`getLoggerStore()` reads the request-scoped child logger from `AsyncLocalStorage` — it
**throws** if no `loggerStorage.run()` wraps the call, so any new entry point must
establish the store. Errors go in the `err` field (`logger.error({ err }, "message")`).

**Imports.** Packages and workers are NodeNext ESM: relative imports need the `.js`
extension (`./container.js`), even from `.ts`. `@ocr/web` is bundler-resolution: no
extension, and `#/*` / `@/*` alias `./src/*`.

**Server functions.** Every `createServerFn` handler body goes through
`withServerErrorLogging(operation, fn, { userMessage })` — it logs, records the
per-operation Prometheus metrics, and decides disclosure. Input validation via
`.inputValidator(zodSchema)`. Auth via `await requireUser()`. Route handlers that do not
use a server function (the SSE stream, downloads) must replicate that error policy
by hand.

**Errors.** Never `throw new Error` in `packages/*` or `workers/*`. Every error we raise
ourselves is an `InternalError`
([packages/infra/src/errors/internal-error.ts](packages/infra/src/errors/internal-error.ts))
carrying a code from `APP_ERROR`
([packages/common/src/app-error.ts](packages/common/src/app-error.ts)) plus a message
written for a human. Add the code to `APP_ERROR`, then to `appErrorStatusCode` in
[apps/web/src/libs/server/errors.ts](apps/web/src/libs/server/errors.ts) — that `Record`
is exhaustive, so a new code does not compile until it has an HTTP status. Branch on
`error.code` (`isInternalError`), never on a message or a raw status number.
`better-auth`'s `APIError` is the one foreign error shape we still sniff (`isAPIError`),
and only for auth flows.

**Error disclosure.** ≥500 is logged and replaced with a generic message; 4xx messages
are passed through because only deliberately-shaped errors (our `InternalError` mapped to
a 4xx status, `better-auth`'s `APIError`, our `ServerError`) carry one. Errors crossing to
the browser are serialized by seroval including `stack` and the whole `cause` chain — use
`createClientSafeError` so nothing else leaks.

**Metrics.** `/metrics` on the web app, all series prefixed `ocr_web_`. `route` is a
bounded label set: add every new route to `KNOWN_ROUTES` in
[apps/web/src/libs/server/metrics.ts](apps/web/src/libs/server/metrics.ts) or it silently
collapses into `other`. Renaming the prefix orphans the Grafana dashboards — don't.

**DB.** Drizzle, one table per file in [db/src/schemas/](db/src/schemas/), re-exported
from `db/src/schema.ts`. Text primary keys with `randomUUID()` generated in the service.
Timestamps are `precision: 6, withTimezone: true`. Schema change → edit the schema file →
`pnpm db:generate` → review the SQL → `pnpm db:migrate`. Never hand-edit a generated
migration or the `drizzle/meta` journal.

## Gotchas

- **Do not register `process.on("SIGTERM")` in the web app.** `vite preview` (the
  container CMD) owns the signal. Teardown is sequenced behind Vite's HTTP drain by
  `gracefulShutdownPlugin` in [apps/web/vite.config.ts](apps/web/vite.config.ts),
  which reaches the live container through the `globalThis` key in `container-registry.ts`.
  That registry module must stay import-free — `vite.config.ts` loads it.
- **`amqplib` does not reconnect.** Always consume through `startResilientConsumer`
  ([packages/infra/src/amqp/amqp.consumer.ts](packages/infra/src/amqp/amqp.consumer.ts)).
  A raw `amqp.connect` consumer exits cleanly with code 0 on a broker restart and never
  comes back. Watching `connection.on("close")` alone is not enough either: a channel-level
  close and a broker-side `basic.cancel` (queue deleted) both leave the connection open, so
  the process stays alive consuming nothing. `startResilientConsumer` reconnects on all
  three.
- `pnpm dev` fails if runtime packages are stale — `predev` handles it, but a manual
  `pnpm --filter @ocr/web dev` does not.
- The web dev server runs on **3000**, `vite preview` and the production container on
  **3010**. `BETTER_AUTH_URL` must match the origin the browser actually uses, and
  non-localhost hostnames (proxies, health probes) need `WEB_ALLOWED_HOSTS`.
- `routeTree.gen.ts` and `styles.css` are excluded from Biome — generated, do not edit.
- Production Redis/RabbitMQ/Garage come from the shared stack in `../infra` over external
  Docker networks; only Postgres and the web app are owned by this compose file.

## Project Rules

The global CryptoNext constitutional rules apply. Most relevant here:

- Secrets in env vars only, never in code or committed `.env` files.
- All external input is untrusted — validate at every boundary: server function inputs,
  AMQP payloads, env vars, uploaded files.
- Commit with `/cns:commit`, one logical change per commit, reference the Jira ticket in
  the scope (`feat(RD-42): ...`).
