ARG NODE_VERSION=24-alpine
FROM node:${NODE_VERSION} AS base

ARG PNPM_VERSION=10.33.0

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global corepack@latest && \
    corepack enable && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY db/package.json db/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/infra/package.json packages/infra/package.json
COPY packages/services/package.json packages/services/package.json
COPY workers/build-zip-worker/package.json workers/build-zip-worker/package.json
COPY workers/cleanup-process-worker/package.json workers/cleanup-process-worker/package.json
COPY workers/merge-markdown-worker/package.json workers/merge-markdown-worker/package.json
COPY workers/post-process-page-worker/package.json workers/post-process-page-worker/package.json
COPY workers/split-pdf-worker/package.json workers/split-pdf-worker/package.json
COPY workers/transcribe-jpg-worker/package.json workers/transcribe-jpg-worker/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY db db
COPY packages/common packages/common
COPY packages/infra packages/infra
COPY packages/services packages/services
COPY workers/build-zip-worker workers/build-zip-worker
COPY workers/cleanup-process-worker workers/cleanup-process-worker
COPY workers/merge-markdown-worker workers/merge-markdown-worker
COPY workers/post-process-page-worker workers/post-process-page-worker
COPY workers/split-pdf-worker workers/split-pdf-worker
COPY workers/transcribe-jpg-worker workers/transcribe-jpg-worker

# build-zip-worker/merge-markdown-worker build before this worker: this
# container's own code constructs their publisher classes at runtime (not a
# type-only import), so their compiled dist must exist, not just their source.
RUN pnpm --filter @ocr/common build && \
    pnpm --filter @ocr/infra build && \
    pnpm --filter @ocr/db build && \
    pnpm --filter @ocr/build-zip-worker build && \
    pnpm --filter @ocr/merge-markdown-worker build && \
    pnpm --filter @ocr/post-process-page-worker build && \
    pnpm --filter @ocr/transcribe-jpg-worker build && \
    pnpm --filter @ocr/split-pdf-worker build && \
    pnpm --filter @ocr/services build

FROM base AS server

ENV NODE_ENV=production

COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=deps /app/package.json ./package.json
COPY --chown=node:node --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --chown=node:node --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --chown=node:node --from=builder /app/db db
COPY --chown=node:node --from=builder /app/packages/common packages/common
COPY --chown=node:node --from=builder /app/packages/infra packages/infra
COPY --chown=node:node --from=builder /app/packages/services packages/services
COPY --chown=node:node --from=builder /app/workers/build-zip-worker workers/build-zip-worker
COPY --chown=node:node --from=builder /app/workers/merge-markdown-worker workers/merge-markdown-worker
COPY --chown=node:node --from=builder /app/workers/post-process-page-worker workers/post-process-page-worker
COPY --chown=node:node --from=builder /app/workers/split-pdf-worker workers/split-pdf-worker
COPY --chown=node:node --from=builder /app/workers/transcribe-jpg-worker workers/transcribe-jpg-worker

USER node

CMD ["pnpm", "--filter", "@ocr/post-process-page-worker", "start"]
