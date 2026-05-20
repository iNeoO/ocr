# OCR

OCR is a full-stack application that ingests PDF documents, runs them through an asynchronous OCR pipeline, and delivers structured archives back to the user.

Production app: [ocr.tuturu.io](https://ocr.tuturu.io)

## What The Project Does

- Authenticated document upload
- Process creation and live status tracking
- PDF split into pages
- OCR transcription on generated page images
- Post-processing and downloadable archive delivery
- Backend metrics endpoint for observability

## Architecture

The repository is a `pnpm` monorepo split into a few clear areas:

- `apps/frontend`: React, Vite, TanStack Router UI
- `apps/backend`: Node.js, TypeScript, tRPC API and metrics endpoint
- `workers/*`: queue-driven pipeline workers for splitting, transcription, post-processing, and cleanup
- `packages/*`: shared business services, infra utilities, and common types
- `db`: Drizzle schema, migrations, and database tooling
- `monitoring`: Grafana dashboard and Prometheus scrape notes
- `doc`: RFC notes and generated OpenAPI document

## Stack

- Frontend: React, TypeScript, Vite, TanStack Router, Radix UI
- Backend: Node.js, TypeScript, tRPC
- Database: PostgreSQL with Drizzle ORM
- Messaging and cache: RabbitMQ, Redis
- Object storage: MinIO / S3-compatible storage
- Tooling: `pnpm`, Biome, Docker Compose

## End-To-End Flow

1. A user uploads a PDF from the frontend.
2. The backend creates a process and stores the source file.
3. A split worker turns the PDF into page images.
4. OCR workers transcribe the pages.
5. A post-processing worker assembles the final result.
6. The frontend receives live process updates and exposes download actions when the run is complete.

## Local Development

Install dependencies:

```bash
pnpm install
```

Prepare environment variables from one of the provided templates:

- [`.env.exemple`](./.env.exemple) for local development
- [`.env.docker.example`](./.env.docker.example) for Docker-based runs

Start local infrastructure:

```bash
docker compose up -d
```

Run the full app in development mode:

```bash
pnpm dev
```

`pnpm dev` first builds the runtime packages, then starts the backend, frontend, and all workers concurrently.

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm scripts:generate-openapi
pnpm scripts:serve-openapi
```

## Docker And Deployment

Development infrastructure is defined in [`docker-compose.yaml`](./docker-compose.yaml).

Production services are defined in [`docker-compose.prod.yaml`](./docker-compose.prod.yaml):

```bash
docker compose -f docker-compose.prod.yaml up -d --build
```

Main exposed production ports:

- Backend: `4010`
- PostgreSQL: `5436`
- Redis: `6380`
- RabbitMQ: `5673`
- MinIO API: `9002`

Current deployment note: the production compose file does not include the frontend service.

## Observability And Docs

- Monitoring guide: [`monitoring/README.md`](./monitoring/README.md)
- Grafana dashboard: [`monitoring/grafana/dashboards/ocr-observability.json`](./monitoring/grafana/dashboards/ocr-observability.json)
- OpenAPI artifact: [`doc/openapi.json`](./doc/openapi.json)
- Project notes: [`doc/rfc.md`](./doc/rfc.md)

The backend metrics endpoint is exposed on `/metrics`.

## License

This project is licensed under the ISC License.

- Local license file: [`LICENSE`](./LICENSE)
- SPDX reference: [ISC](https://spdx.org/licenses/ISC.html)
