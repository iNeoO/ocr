# OCR

OCR is a full-stack application that ingests PDF documents, runs them through an asynchronous OCR pipeline, and delivers structured archives back to the user.

Production app: [ocr.tuturu.io](https://ocr.tuturu.io)

## What The Project Does

- Authenticated document upload
- Process creation and live status tracking
- PDF split into pages
- OCR transcription on generated page images
- Post-processing and downloadable archive delivery

## Architecture

The repository is a `pnpm` monorepo split into a few clear areas:

- `apps/frontend`: the single application server — React, Vite, TanStack Start / Router / Query UI **and** the server layer (server functions and route handlers) that calls the business services in memory
- `workers/*`: queue-driven pipeline workers for splitting, transcription, post-processing, and cleanup
- `packages/*`: shared business services, infra utilities, and common types
- `db`: Drizzle schema, migrations, and database tooling
- `doc`: RFC notes

There is no separate API process: the TanStack Start server owns Postgres,
Redis, S3, and RabbitMQ access directly.

## Stack

- Frontend: React, TypeScript, Vite, TanStack Router, TanStack Query, Radix UI
- Server: TanStack Start server functions and route handlers (Node.js, TypeScript)
- Database: PostgreSQL with Drizzle ORM
- Messaging and cache: RabbitMQ, Redis
- Object storage: Garage / S3-compatible storage
- Tooling: `pnpm`, Biome, Docker Compose

## End-To-End Flow

1. A user uploads a PDF from the frontend.
2. The Start server creates a process and stores the source file.
3. A split worker turns the PDF into page images.
4. OCR workers transcribe the pages.
5. A post-processing worker assembles the final result.
6. The browser receives live process updates over SSE (`GET /api/processes/status`) and exposes download actions when the run is complete.

## Local Development

Install dependencies:

```bash
pnpm install
```

Prepare environment variables from one of the provided templates:

- [`.env.exemple`](./.env.exemple) for local development
- [`.env.docker.example`](./.env.docker.example) for Docker-based runs

`FRONTEND_ALLOWED_HOSTS` can be used to add extra hostnames accepted by `vite preview` in the frontend container. Use a comma-separated list when internal probes or reverse proxies access the frontend with hostnames that differ from `localhost` or `BETTER_AUTH_URL`.

Start local infrastructure:

```bash
docker compose up -d
```

Bootstrap the local Garage bucket after the first start, or after wiping the
`garage-data` volume:

```bash
pnpm garage:init
```

This imports `S3_ACCESS_KEY` / `S3_SECRET_KEY`, creates `S3_BUCKET`, and grants
read/write access to that key.

Run the full app in development mode:

```bash
pnpm dev
```

`pnpm dev` first builds the runtime packages, then starts the frontend server and all workers concurrently.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm garage:init
```

## Docker And Deployment

Development infrastructure is defined in [`docker-compose.yaml`](./docker-compose.yaml).

Production services are defined in [`docker-compose.prod.yaml`](./docker-compose.prod.yaml):

```bash
docker compose --env-file .env.docker \
  -f docker-compose.prod.yaml \
  up -d --build --remove-orphans
```

Main exposed production ports:

- Frontend / TanStack Start application server: `3010`
- PostgreSQL: `5436`

Production Redis, RabbitMQ, and object storage are provided by the shared stack
in [`../infra`](../infra). OCR containers join the external `redis-network`,
`rabbitmq-network`, and `garage-network`, and connect to `redis-prod`,
`rabbitmq-prod`, and `garage-prod`.

Provision the production Garage key and bucket before the first deployment:

```bash
../infra/garage/provision-project.sh ocr-prod ocr-prod "$PWD/.env.docker"
```

Set `REDIS_OCR_USERNAME=ocr`, copy the dedicated `REDIS_OCR_PASSWORD` from the
secret vault, and configure `AMQP_URL` with the existing OCR RabbitMQ user and
`/ocr` vhost in `.env.docker`.

The reverse proxy should target only the frontend container on `127.0.0.1:3010`.
There is no backend upstream anymore. Keep `BETTER_AUTH_URL` aligned with the
public HTTPS origin and add any internal proxy/probe hostnames to
`FRONTEND_ALLOWED_HOSTS` as a comma-separated list.

## Observability And Docs

- Project notes: [`doc/rfc.md`](./doc/rfc.md)

The frontend exposes `/metrics`; if it is served through `vite preview`, make
sure the probe hostname is allowed through `FRONTEND_ALLOWED_HOSTS` when needed.
Monitoring dashboards and scrape configuration are handled separately.

## License

This project is licensed under the ISC License.

- Local license file: [`LICENSE`](./LICENSE)
- SPDX reference: [ISC](https://spdx.org/licenses/ISC.html)
