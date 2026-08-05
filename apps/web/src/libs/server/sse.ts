import type { ProcessStatusEvent } from "@ocr/common";

export const SSE_KEEP_ALIVE_INTERVAL_MS = 25_000;

/** Value of the `stream` label on the SSE metrics. */
export const PROCESS_STATUS_STREAM = "process_status";

export const SSE_HEADERS = {
	"Content-Type": "text/event-stream; charset=utf-8",
	"Cache-Control": "no-store",
	Connection: "keep-alive",
	"X-Accel-Buffering": "no",
} as const;

export const encodeSseData = (payload: unknown) =>
	`data: ${JSON.stringify(payload)}\n\n`;

export const encodeSseKeepAlive = () => ": ping\n\n";

export const getProcessStatusEventKey = (event: ProcessStatusEvent) =>
	`${event.processId}:${event.stage}:${event.occurredAt}`;
