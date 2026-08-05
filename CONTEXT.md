# OCR

Ingests PDFs, splits them into page images, transcribes them through an asynchronous
queue pipeline, refines the result with an LLM, and delivers a ZIP archive.

## Language

**Process**:
One user-submitted PDF's run through the full pipeline (split → transcribe →
post-process → finalize). Tracked as a single row in the `process` table, terminal
statuses are `completed`, `failed`, `expired`.

**Expired**:
A terminal state for a `completed` or `failed` process whose retention window (7 days)
has passed. The retention job deletes every file the process owns (source PDF, page
images, page markdowns, zip, merged markdown) but keeps the `process` row itself as an
audit record — only the status changes, to `expired`. Distinct from **Deleted**.
_Avoid_: "cleaned up", "purged" for this specific transition — reserve those for prose,
not as a stand-in for the status value.

**Deleted**:
The result of a user clicking "Supprimer" on their own process. Removes the `process`
row itself (and its `page` rows, via cascade) permanently, in addition to its files.
Unlike **Expired**, nothing is left behind — there is no row to query afterwards.
_Avoid_: Do not conflate with Expired — they share the same file-cleanup mechanics but
differ on whether the `process` row survives.

## Example dialogue

> **Dev**: Why does `expireProcess` null out `sourceFileId` instead of deleting the row
> like `deleteProcess` does?
> **Domain expert**: Because expiring is retention doing its job automatically — we
> still want the process to show up in someone's history as "this ran, it's just old
> now." Deleting is the user saying "make this go away entirely." Same files get
> removed either way, but only Deleted removes the row.
