# OCR

OCR is a full-stack document processing app that turns uploaded PDFs into structured outputs through a queued OCR pipeline.

App: `https://ocr.tuturu.io`

## Features

- PDF upload and process tracking
- PDF split pipeline
- OCR transcription and post-processing
- Structured output download
- OpenAPI docs exposed by the backend outside production

## Stack

- Frontend: React, TypeScript, Vite, TanStack Router
- Backend: Node.js, TypeScript, tRPC
- Database: PostgreSQL with Drizzle ORM
- Queue and cache: RabbitMQ, Redis
- Object storage: MinIO / S3-compatible storage
- Monorepo: pnpm workspaces

## Development

Install dependencies:

```bash
pnpm install
```

Start infrastructure with Docker:

```bash
docker compose up -d
```

Start the app in dev mode:

```bash
pnpm dev
```

`pnpm dev` runs a runtime build first, then starts the frontend, backend, and workers.

## Build

Build runtime packages and apps:

```bash
pnpm build
```

Run lint across workspaces:

```bash
pnpm -r --if-present lint
```

## Production Docker

Production compose file:

```bash
docker compose -f docker-compose.prod.yaml up -d --build
```

Environment template:

- [`.env.docker.example`](./.env.docker.example)

Main exposed ports in production compose:

- Front services: configure separately if you add the frontend service
- Backend: `4010`
- Postgres: `5436`
- Redis: `6380`
- RabbitMQ: `5673`
- MinIO API: `9002`

## Notes

- The production Dockerfiles build workspace artifacts and run compiled files from `dist`.
- The frontend is currently not included in `docker-compose.prod.yaml`.
