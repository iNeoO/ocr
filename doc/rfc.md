# ocr

`pnpm` monorepo. No separate API process — the TanStack Start server in `apps/web`
owns Postgres, Redis, S3 and RabbitMQ directly and calls business services
in-memory. See [CLAUDE.md](../CLAUDE.md) for the full architecture.

## endpoints

Auth flows are server functions (`apps/web/src/libs/api/auth.tsx`), not REST routes:

### auth

- `signInWithEmailAndPassword`
- `signUpWithEmailAndPassword`
- `signOut`
- `getSession`
- `requestPasswordReset`
- `resetPassword`
- `verifyEmail`
- `sendVerificationEmail`

### processes

Server functions (`apps/web/src/libs/api/processes.tsx`):

- `getProcessesByUserId`
- `deleteProcess`
- `uploadProcessFile`

Route handlers (`apps/web/src/routes/`):

- `GET /api/processes/status` — SSE stream of process status events
- `GET /downloads/processes/:id` — download the ZIP archive of a finished process

### admin

- `GET /metrics` — Prometheus metrics, all series prefixed `ocr_web_`

## queues

One queue per worker package, each worker owning its own publisher and
exporting it via `./publisher` for the upstream package to use:

- `split-pdf-worker` — splits an uploaded PDF into page images
- `transcribe-jpg-worker` — OCR-transcribes each page image
- `post-process-page-worker` — refines the transcription with an LLM
- `cleanup-process-worker` — node-cron, `0 */2 * * *` UTC, deletes processes past
  the 7-day retention window (no queue, runs on a schedule)

## flow

1. User uploads a PDF via `uploadProcessFile`
2. File is stored on S3 (`filesService.uploadFile`) and a process row is created
   (`processService.createProcess`)
3. Job is published to `split-pdf-worker`'s queue
4. `split-pdf-worker` splits the PDF into page images, uploads each to S3, and
   publishes one job per page to `transcribe-jpg-worker`
5. `transcribe-jpg-worker` OCR-transcribes each page image and publishes to
   `post-process-page-worker`
6. `post-process-page-worker` refines the transcription with an LLM
7. Each stage publishes a `process_status` event (`split_pdf`, `transcribe_page`,
   `post_process_page`, `process_completed`, `process_failed`) over Redis
   pub/sub, which `apps/web` relays to the browser over SSE
   (`GET /api/processes/status`)
8. Once every page has completed, the user downloads the finished process as a
   ZIP of Markdown files via `GET /downloads/processes/:id`

## metrics

`GET /metrics` exposes Prometheus metrics about the pipeline (queue throughput,
download counts, SSE stream health, etc.), scraped by Grafana.
