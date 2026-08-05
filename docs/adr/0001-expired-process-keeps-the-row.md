# Expiring a process deletes its files but keeps the process row

The retention job (`cleanupExpiredProcesses`, 7-day window) used to call `deleteProcess`,
which removed the `process` row entirely along with its files. We're changing this: the
job now only deletes files and sets `status = 'expired'`, leaving the row (and its `page`
rows) in place as an audit trail of what ran. This required making `process.sourceFileId`
nullable with `onDelete: "set null"` (it was `NOT NULL` / `restrict`), matching the
pattern already used by `zipFileId` and `mergedMdFileId` — a process without a source
file is now a valid, expected state, not an integrity violation. Manual user-triggered
deletion (`deleteProcess`, the "Supprimer" button) is unchanged and still removes the row.

## Consequences

- The `process_status` Postgres enum gains `expired` as a value that can never be
  removed (Postgres doesn't support dropping enum values) — a rollback of this decision
  leaves the enum value dangling even if the code path is reverted.
- Once a process reaches `expired`, `cleanupExpiredProcesses`'s existing
  `completed`/`failed` queries naturally stop matching it — no dedicated exclusion logic
  needed.
