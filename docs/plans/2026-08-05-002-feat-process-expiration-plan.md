---
title: Process expiration keeps the row, only deletes files
type: feat
status: active
date: 2026-08-05
origin: grilled directly in-session (no docs/brainstorms/ requirements doc); see CONTEXT.md and docs/adr/0001-expired-process-keeps-the-row.md
---

# Process expiration keeps the row, only deletes files

## Overview

The retention job (`cleanup-process-worker`, cron every 2h) currently hard-deletes a
`process` row (and its `page` rows) plus all of its files once it's 7+ days past
`completed`/`failed`. This plan changes that: the job will instead delete the files and
transition the row to a new `expired` status, leaving the row (and its `page` rows) in
place as a permanent audit record. The user-facing "Supprimer" button (`deleteProcess`)
is explicitly unchanged — it still hard-deletes.

## Problem Frame

Today, once a process's retention window passes, there's no record it ever existed —
the row is gone. The business wants a durable history of every process that ran, even
after its output files are reclaimed for storage cost reasons. See
[[docs/adr/0001-expired-process-keeps-the-row.md]] for why this is the chosen shape, and
`CONTEXT.md` for the **Expired** vs **Deleted** terminology this plan uses throughout.

## Requirements Trace

- R1. The retention job deletes a process's files (source PDF, page images, page
  markdowns, zip, merged markdown) exactly as it does today.
- R2. The retention job no longer deletes the `process`/`page` rows; instead it sets
  `status = "expired"` and records `expiredAt`.
- R3. An expired process still appears in the user's process list with its original
  filename, even though the underlying file row is gone.
- R4. The manual "Supprimer" flow (`deleteProcess`) is untouched — still a hard delete,
  still gated to `completed`/`failed`.
- R5. No new class of unhandled error is introduced for downloads, SSE, or the daily
  upload-limit count as a result of `expired` rows persisting indefinitely.

## Scope Boundaries

- `deleteProcess()` and its `completed`/`failed`-only guard are **not** modified.
  Expired processes remain not manually purgeable in this iteration — an explicit
  non-goal, not an oversight.
- `RETENTION_DAYS` (7) and the two eligibility queries (`completed` via `completedAt`,
  `failed` via `errorAt`) are unchanged.
- No dedicated visual treatment for the `expired` badge beyond the existing gray
  default — just an explicit `case` instead of an implicit fallthrough.
- No SSE/live-status event is published when a process expires — this is a background
  transition on rows nobody has an open tab watching (all are ≥7 days old).
- No backfill of `sourceFilename` for pre-existing rows is mandatory (see Risks) — an
  optional one-off script is noted but not required to ship this feature.

## Context & Research

### Relevant Code and Patterns

- `db/src/schemas/process.ts:6-14` — `processStatus` pgEnum to extend with `"expired"`.
- `db/src/schemas/process.ts:22-31` — `sourceFileId` (`NOT NULL` + `restrict`, to relax)
  vs. `zipFileId`/`mergedMdFileId` (nullable + `set null`, the pattern to mirror).
- `db/src/schemas/process.ts:43-48` — `completedAt`/`errorAt` nullable timestamp shape
  (`precision: 6, withTimezone: true`) to mirror for the new `expiredAt` column.
- `db/drizzle/0001_loving_stark_industries.sql` + `db/drizzle/meta/_journal.json:9-14` —
  direct precedent for this exact migration shape: `ALTER TYPE ... ADD VALUE`, add
  nullable column, add FK with `ON DELETE set null`, all in one generated migration.
- `packages/services/src/process/process.service.ts:335-391` (`deleteProcess`) — the
  file-collection logic (`fileIds` array) to mirror in `expireProcess`.
- `packages/services/src/process/process.service.ts:235-259` (`getProcessesByUserId`)
  and `:160-188` (`getProcessNotificationContextByProcessId`) — both `innerJoin` on
  `sourceFileId`, which breaks once that FK is nulled (see Key Technical Decisions).
- `apps/web/src/helpers/colorChart.helper.ts:3-16` (`getProcessStatusColor`) — has a
  `default: "gray"` fallback, so `expired` won't crash, but silently falls through
  rather than being a deliberate case.
- `apps/web/src/components/processes/ProcessesTable.tsx:99-131` — download buttons are
  individually gated on `status === "completed"` (lines ~102, ~117), which already
  excludes `expired` rows with no further change needed.
- `apps/web/src/libs/api/processes.tsx:~101-106` — `uploadFile` call site already has
  the uploaded `file` object (including `file.filename`) in scope right before calling
  `createProcess`, so denormalizing the filename costs no extra query.

### Institutional Learnings

- `docs/solutions/` does not exist in this repo — no prior incidents or gotchas on
  record for this area.

### External References

- None consulted — the repo has a direct migration precedent for this exact schema
  change shape (enum add + nullable FK + new column), and Postgres 18 (this repo's
  version, per `docker-compose.yaml`) has no restriction on using a newly `ADD VALUE`'d
  enum label later in the same migration/transaction (that limitation was PG < 12).

## Key Technical Decisions

- **`sourceFileId` becomes nullable + `onDelete: "set null"`**: matches the existing
  `zipFileId`/`mergedMdFileId` pattern exactly. A process without a source file is now
  a valid terminal state, not an integrity violation. (See ADR 0001.)
- **New `expireProcess(processId, userId)` method, not a modified `deleteProcess`**: the
  two are semantically distinct per `CONTEXT.md` (Expired keeps the row, Deleted
  removes it) and have different callers (cron job vs. user button). Keeping them
  separate avoids a branchy, harder-to-read `deleteProcess(..., { hard: boolean })`.
- **File deletion happens *before* the status flip, not after**: `deleteProcess` today
  deletes the row first, then the files — fine there, because if it crashes mid-way the
  row is already gone and nobody retries. `expireProcess` inverts this: delete files
  first, and only set `status = "expired"` / `expiredAt` once `deleteFiles` resolves
  successfully. If the process crashes between file deletion and the status update, the
  row is still `completed`/`failed`, so the next cron run picks it up again and safely
  retries (re-deleting already-gone file rows is a no-op in `FilesService.deleteFiles`,
  which filters its `inArray` select to rows that still exist). Flipping the status
  *before* deleting files would instead orphan any files a crash left behind forever,
  since `expired` rows are excluded from both eligibility queries.
- **`cleanupExpiredProcesses` wraps each `expireProcess` call in try/catch**: today a
  single `deleteProcess` failure mid-loop throws and aborts the whole batch. That was
  low-stakes when failed rows just got retried next run with no side effects. It's
  higher-stakes now: a process that reliably fails to expire (e.g. a stale S3 object)
  would silently block *every other* eligible process from expiring on *every*
  subsequent run, forever. Catching per-item, logging, and continuing is a small,
  justified addition — not scope creep — because the change to "rows persist forever"
  is what turns a transient bug into a permanent blockage.
- **Denormalize `sourceFilename` onto `process` at creation**: `getProcessesByUserId`
  currently gets the filename via `innerJoin(file, sourceFileId)`. Once `sourceFileId`
  is nulled by expiration, that join drops the row from the result set entirely —
  directly defeating the point of keeping it. Storing the filename directly on
  `process` at creation time (cheap: the caller already has it) and switching the read
  path to `leftJoin` + `COALESCE(process.sourceFilename, file.filename)` fixes this
  while staying backward-compatible with rows created before this migration (see Risks).
- **No SSE event for the `expired` transition**: `processStatusStageSchema`
  (`packages/common/src/types/processStatusEvent.type.ts`) models live pipeline
  progress a connected browser is watching. Expiration is a background job acting on
  rows that are, by definition, ≥7 days old — no browser tab is subscribed. Adding a
  stage here would be dead code for the one consumer (SSE) that exists today.

## Open Questions

### Resolved During Planning

- Should `sourceFileId` become nullable? Yes — required to delete the source file
  without violating the FK; matches existing sibling columns.
- Should `deleteProcess` (manual button) change? No — stays a hard delete, unchanged
  guard.
- Track expiration time? Yes — new `expiredAt` column, mirroring `completedAt`/`errorAt`.
- UI treatment for the `expired` badge/download button? Minimal — explicit color-helper
  case (still gray), no code change needed for the download buttons since they're
  already gated to `status === "completed"`.
- File-deletion scope and cron eligibility query? Unchanged from today.
- `getProcessesByUserId` silently dropping expired rows via `innerJoin`? Fixed by
  denormalizing `sourceFilename` + switching to `leftJoin`/`COALESCE`.
- Order of operations inside `expireProcess` (files vs. status)? Files first, status
  flip last, for crash-safety/retry coverage.

### Deferred to Implementation

- Whether to write the optional one-off backfill script (`scripts/`) that populates
  `sourceFilename` for processes created before this migration ships, by joining to
  their still-intact `file` row. Recommended for a clean audit trail but not required —
  without it, only pre-existing rows that later expire before ever being backfilled
  lose their filename at that point (see Risks).
- Exact log field naming in `cleanup-processes.handler.ts` (e.g. renaming
  `deletedProcessCount` to `expiredProcessCount`) — cosmetic, implementer's call.
- Whether `finalizeProcess`'s `notInArray` status guard should defensively list
  `"expired"` alongside `finalizing`/`completed`/`failed` — currently unreachable
  (a process can't be mid-pipeline and expired simultaneously) but harmless to add for
  future-proofing.

## High-Level Technical Design

> Directional guidance for review, not implementation specification.

```
expireProcess(processId, userId):
  process = load process (must belong to userId)
  fileIds = [process.sourceFileId, process.zipFileId, process.mergedMdFileId,
             ...pages.imageFileId, ...pages.markdownFileId]  // same set as deleteProcess

  filesService.deleteFiles(fileIds)     // S3 objects + `file` rows gone;
                                         // FK `set null` cascades into `process`/`page`
  -- if the above throws, stop here: process is still completed/failed, next cron
     run retries it. Nothing below this line has run yet.

  update process SET status = 'expired', expiredAt = now(), updatedAt = now()
  -- process & page rows are untouched otherwise (no cascade delete triggers,
     because nothing calls DELETE on `process` or `page`)

cleanupExpiredProcesses():
  for each eligible process (same completed/failed + RETENTION_DAYS queries as today):
    try: expireProcess(process.id, process.userId)
    catch: log error with processId, continue to next process   // <- new
```

Read-path fix (`getProcessesByUserId`):

```
SELECT process.*, COALESCE(process.sourceFilename, file.filename) AS sourceFileName
FROM process
LEFT JOIN file ON process.sourceFileId = file.id   -- was innerJoin
```

## Implementation Units

- [ ] **Unit 1: Schema migration**

**Goal:** Add the `expired` enum value, relax `sourceFileId` to nullable/`set null`,
add `expiredAt` and `sourceFilename` columns.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `db/src/schemas/process.ts`
- Generated (review, do not hand-edit): `db/drizzle/000X_<name>.sql`,
  `db/drizzle/meta/_journal.json`, `db/drizzle/meta/000X_snapshot.json`

**Approach:**
- Add `"expired"` to the `processStatus` pgEnum array (append — Postgres enum order
  only matters if you rely on ordinal comparisons, which this codebase doesn't).
- Change `sourceFileId` from `.notNull().references(() => file.id, { onDelete:
  "restrict" })` to `.references(() => file.id, { onDelete: "set null" })` (drop
  `.notNull()`).
- Add `expiredAt: t.timestamp("expired_at", { precision: 6, withTimezone: true })`
  (nullable, no default) — same shape as `completedAt`/`errorAt`.
- Add `sourceFilename: t.text("source_filename")` (nullable, no default — see Key
  Technical Decisions for why nullable rather than backfilled-NOT-NULL).
- Run `pnpm db:generate`, read the generated SQL end to end before `pnpm db:migrate`.
  Expect four statements in the shape of the `0001_...` precedent: `ALTER TYPE ADD
  VALUE`, `ALTER TABLE ADD COLUMN` (x2), and an FK constraint drop+recreate (or
  drizzle-kit may emit `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL` plus a
  constraint drop/add — either is fine, just verify it doesn't touch existing data).

**Patterns to follow:**
- `db/drizzle/0001_loving_stark_industries.sql` (enum value + nullable column + `set
  null` FK, added for `mergedMdFileId`).

**Test scenarios:**
- Test expectation: none — schema-only change, verified by running the migration
  against the dev database and confirming existing rows are unaffected (their
  `sourceFileId` values remain valid; new columns default to `NULL`).

**Verification:**
- `pnpm db:migrate` succeeds against the dev database with existing seed/process data
  present; `\d process` in psql shows the new enum value, nullable `source_file_id`,
  and the two new nullable columns.

---

- [ ] **Unit 2: Capture `sourceFilename` at process creation**

**Goal:** Every newly created process stores its source file's name directly, so later
expiration doesn't lose it.

**Requirements:** R3

**Dependencies:** Unit 1

**Files:**
- Modify: `packages/services/src/process/process.types.ts`
  (`CreateProcessInput` gains `sourceFilename: string`)
- Modify: `packages/services/src/process/process.service.ts` (`createProcess`, ~line
  114 — pass `sourceFilename` through to the `insert(schema.process)` values)
- Modify: `apps/web/src/libs/api/processes.tsx` (~line 104 — pass `file.filename` as
  `sourceFilename` when calling `processService.createProcess`)

**Approach:**
- No extra DB query needed — the uploaded `file` row (with `.filename`) is already in
  scope at the call site, right after `filesService.uploadFile`.

**Patterns to follow:**
- Existing `CreateProcessInput` / `createProcess` shape in
  `packages/services/src/process/process.service.ts:114-135`.

**Test scenarios:**
- Happy path: uploading a PDF named `report.pdf` creates a process row where
  `sourceFilename === "report.pdf"`.
- Integration: `getProcessesByUserId` for a freshly created process returns the same
  filename it did before this change (parity check against the join-based value).

**Verification:**
- A newly uploaded file's process row has `sourceFilename` populated immediately,
  independent of the `file` table.

---

- [ ] **Unit 3: `expireProcess` + retention job wiring + read-path fix**

**Goal:** Implement the new expiration method, wire the cron job to use it instead of
`deleteProcess`, and fix `getProcessesByUserId` so expired rows stay visible.

**Requirements:** R1, R2, R3, R5

**Dependencies:** Units 1, 2

**Files:**
- Modify: `packages/services/src/process/process.types.ts` (add `"expired"` to the
  `UpdateProcessStatusInput.status` union for type completeness)
- Modify: `packages/services/src/process/process.service.ts`:
  - Add `expireProcess(processId, userId)`, sibling to `deleteProcess` (~line 335)
  - Modify `cleanupExpiredProcesses` (~line 393) to call `expireProcess` instead of
    `deleteProcess`, wrapped per-item in try/catch
  - Modify `getProcessesByUserId` (~line 235) to `leftJoin` + `COALESCE`

**Approach:**
- `expireProcess` mirrors `deleteProcess`'s file-collection logic exactly (same
  `fileIds` array construction from `sourceFileId`, `zipFileId`, `mergedMdFileId`, and
  every page's `imageFileId`/`markdownFileId`), but order of operations is inverted:
  delete files first, flip status last (see Key Technical Decisions).
- Do **not** delete the `page` rows or the `process` row.
- `cleanupExpiredProcesses`'s two eligibility `SELECT`s are unchanged; only the
  per-item action inside the loop changes, plus the added try/catch.
- `getProcessesByUserId`'s `sourceFileName` becomes
  `COALESCE(schema.process.sourceFilename, schema.file.filename)` over a `leftJoin`.

**Patterns to follow:**
- `deleteProcess` (`packages/services/src/process/process.service.ts:335-391`) for the
  file-collection shape.
- Worker handlers' nack-and-continue error handling style (`CLAUDE.md` — "a handler
  that throws gets nacked, no retry" — the analogous per-item resilience here is
  catch-log-continue rather than letting one bad row abort the batch).

**Test scenarios:**
- Happy path (completed): `expireProcess` on a `completed` process deletes source PDF,
  all page images/markdowns, zip, and merged markdown; process row survives with
  `status: "expired"`, `expiredAt` set, `sourceFileId`/`zipFileId`/`mergedMdFileId` all
  `NULL`; `page` rows survive with their file-id columns `NULL`.
- Happy path (failed): `expireProcess` on a `failed` process (no `zipFileId`/
  `mergedMdFileId` to begin with) only deletes source + page files; transitions the
  same way.
- Idempotent retry: calling `expireProcess` again on an already-`expired` process
  (simulating a cron re-run edge case) is a safe no-op on the file side (`deleteFiles`
  with already-gone ids) — decide/verify whether the status-update `WHERE` clause
  should guard on current status to avoid clobbering `expiredAt` on a second call.
- Batch resilience: one process's `expireProcess` throwing (e.g. simulated S3 error)
  does not prevent other eligible processes in the same `cleanupExpiredProcesses` run
  from being expired.
- Read-path parity: `getProcessesByUserId` returns the correct, original filename for
  an `expired` process (via the denormalized column) and for an active process created
  before this migration shipped (via the `file` join fallback).
- Regression: `cleanupExpiredProcesses`'s eligibility queries never re-select an
  already-`expired` row on a subsequent run.

**Verification:**
- Running the retention job against a mix of eligible `completed`/`failed` processes
  results in `expired` rows with no orphaned S3 objects and no data loss for
  still-active processes.

---

- [ ] **Unit 4: Worker logging**

**Goal:** Keep the cleanup job's logs accurate now that it expires rather than deletes.

**Requirements:** R2

**Dependencies:** Unit 3

**Files:**
- Modify: `workers/cleanup-process-worker/src/handler/cleanup-processes.handler.ts`

**Approach:**
- Rename the `deletedProcessCount` log field (and surrounding log messages) to reflect
  "expired" rather than "deleted", matching what the job now actually does.

**Test scenarios:**
- Test expectation: none — logging-only change.

**Verification:**
- Job logs read coherently against the new behavior (no log claims "deleted" when rows
  survive).

---

- [ ] **Unit 5: Frontend badge treatment**

**Goal:** Give `expired` a deliberate (not fallthrough) visual treatment.

**Requirements:** none directly (polish); supports R3's "still visible" intent

**Dependencies:** Unit 3 (needs `expired` to actually occur to verify visually)

**Files:**
- Modify: `apps/web/src/helpers/colorChart.helper.ts`

**Approach:**
- Add an explicit `case "expired": return "gray";` in `getProcessStatusColor` instead
  of relying on the `default` fallthrough — same visual result, but documents the
  status is accounted for rather than merely unhandled.
- No change needed to `ProcessesTable.tsx`'s download-button gating — both zip and
  markdown buttons already require `status === "completed"` (lines ~102, ~117), which
  already excludes `expired` rows.

**Test scenarios:**
- Visual/manual: an expired process row shows a gray "expired" badge and no
  download buttons, consistent with a `failed` row's download-button absence today.

**Verification:**
- `pnpm dev`, manually flip a test process to `expired` (or wait for the job), confirm
  the row renders correctly in `/processes`.

## System-Wide Impact

- **Interaction graph:** `cleanup-process-worker` (cron) → `ProcessService.expireProcess`
  → `FilesService.deleteFiles` (S3 + `file` table) → FK cascade nulls `process`'s file-id
  columns and `page`'s file-id columns. No SSE publish, no downstream worker triggered.
  The frontend's process list read path (`getProcessesByUserId`) is the only other
  touched interaction.
- **Error propagation:** `expireProcess` failures are now caught per-item inside
  `cleanupExpiredProcesses`'s loop and logged, rather than aborting the whole batch —
  a deliberate strengthening (see Key Technical Decisions). Download-route error
  handling (`PROCESS_OUTPUT_INCOMPLETE` / `FILE_NOT_FOUND`) is unchanged and already
  correctly handles a `null` `zipFileId`/`mergedMdFileId`.
- **State lifecycle risks:** The files-before-status ordering in `expireProcess` is the
  key safeguard against orphaned S3 objects on partial failure. `assertDailyProcessLimit`
  counts rows by `createdAt` regardless of status, so `expired` rows persisting forever
  does not affect it (it already only looks at today's window). `getProcessesByUserId`
  returning unbounded history over time is an accepted, intended consequence of this
  feature (that's the point — an audit trail) rather than a bug; pagination/filtering
  of the process list is out of scope for this plan.
- **API surface parity:** `UpdateProcessStatusInput.status` union updated for type
  completeness; no other exported type in `packages/common` needs a change, since
  `processStatusStageSchema` (SSE stages) is deliberately not touched (see Key
  Technical Decisions).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Processes created before this migration ships have no `sourceFilename`; if such a process later expires before an optional backfill runs, it permanently loses its display filename | Accepted trade-off, documented in Open Questions; an optional one-off `scripts/` backfill (join to `file` while it's still intact) can close this gap post-deploy if desired |
| A single `expireProcess` failure could otherwise block every other eligible process from ever expiring, since `expired` rows never disappear on their own | Per-item try/catch + log-and-continue in `cleanupExpiredProcesses` (Unit 3) |
| Download race: a download request reading `zipFileId` just before `expireProcess` deletes that file surfaces as `FILE_NOT_FOUND` instead of the friendlier `PROCESS_OUTPUT_INCOMPLETE` | Low probability (only processes ≥7 days old, rarely downloaded); both are already correctly-mapped 4xx errors, no code change planned |
| Manual "Supprimer" button has no effect on `expired` rows (`deleteProcess`'s guard requires `completed`/`failed`) | Explicit non-goal for this iteration, confirmed during grilling |
| Postgres enum `ADD VALUE` + same-transaction use | Confirmed non-issue on this repo's Postgres 18, per direct migration precedent (`0001_loving_stark_industries.sql`) |

## Sources & References

- **Origin:** Grilled directly in this session (`cns:grill`) — no upstream
  `docs/brainstorms/*-requirements.md` document exists for this feature.
- `CONTEXT.md` — **Expired** vs **Deleted** terminology.
- `docs/adr/0001-expired-process-keeps-the-row.md` — the schema/row-retention decision.
- Related code: `packages/services/src/process/process.service.ts`,
  `db/src/schemas/process.ts`, `workers/cleanup-process-worker/`,
  `apps/web/src/components/processes/`.
