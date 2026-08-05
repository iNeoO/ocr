import {
	type ProcessStatusEvent,
	type ProcessStatusStage,
	processStatusEventSchema,
} from "@ocr/common";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { processesQueryKey } from "../../libs/api/processes";
import { getProcessStatusEventKey } from "../../libs/server/sse";
import { useToast } from "../toast/ToastProvider";

const PROCESS_STATUS_STREAM_URL = "/api/processes/status";
const PROCESS_TABLE_REFRESH_DEBOUNCE_MS = 750;
const SEEN_EVENT_KEYS_LIMIT = 250;

const PAGE_PROGRESS_STAGES: ReadonlySet<ProcessStatusStage> = new Set([
	"transcribe_page",
	"post_process_page",
]);
const PAGE_PROGRESS_DEBOUNCE_MS = 500;

const formatDuration = (durationMs: number) => {
	if (durationMs < 1000) {
		return `${durationMs} ms`;
	}

	const seconds = durationMs / 1000;
	if (seconds < 60) {
		return `${seconds.toFixed(1)} s`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return `${minutes} min ${remainingSeconds} s`;
};

const formatProcessStatusToast = (event: ProcessStatusEvent) => ({
	title: `${event.sourceFileName} update`,
	description: `${event.message} in ${formatDuration(event.durationMs)}`,
});

const formatPageProgressToast = (event: ProcessStatusEvent) => ({
	key: `pages:${event.processId}`,
	title: `${event.sourceFileName} processing`,
	description: `${event.completedPages}/${event.pageCount} pages processed`,
});

export function useProcessStatusSubscription() {
	const queryClient = useQueryClient();
	const { pushToast } = useToast();
	const seenEventsRef = useRef<Set<string>>(new Set());
	const seenEventKeysOrderRef = useRef<string[]>([]);
	const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingPageProgressRef = useRef<Map<string, ProcessStatusEvent>>(
		new Map(),
	);
	const pageProgressTimersRef = useRef<
		Map<string, ReturnType<typeof setTimeout>>
	>(new Map());

	useEffect(() => {
		const scheduleTableRefresh = () => {
			if (invalidateTimerRef.current) {
				clearTimeout(invalidateTimerRef.current);
			}

			invalidateTimerRef.current = setTimeout(() => {
				invalidateTimerRef.current = null;
				void queryClient.invalidateQueries({ queryKey: processesQueryKey });
			}, PROCESS_TABLE_REFRESH_DEBOUNCE_MS);
		};

		const schedulePageProgressToast = (event: ProcessStatusEvent) => {
			pendingPageProgressRef.current.set(event.processId, event);

			if (pageProgressTimersRef.current.has(event.processId)) {
				return;
			}

			const timer = setTimeout(() => {
				pageProgressTimersRef.current.delete(event.processId);
				const latestEvent = pendingPageProgressRef.current.get(event.processId);
				pendingPageProgressRef.current.delete(event.processId);

				if (latestEvent) {
					pushToast(formatPageProgressToast(latestEvent));
				}
			}, PAGE_PROGRESS_DEBOUNCE_MS);

			pageProgressTimersRef.current.set(event.processId, timer);
		};

		const eventSource = new EventSource(PROCESS_STATUS_STREAM_URL);

		eventSource.onmessage = (message) => {
			let payload: unknown;

			try {
				payload = JSON.parse(message.data);
			} catch (error) {
				console.error("Malformed process status event", error);
				return;
			}

			const parsedEvent = processStatusEventSchema.safeParse(payload);
			if (!parsedEvent.success) {
				console.error("Unexpected process status event", parsedEvent.error);
				return;
			}

			const event = parsedEvent.data;
			const dedupeKey = getProcessStatusEventKey(event);
			if (seenEventsRef.current.has(dedupeKey)) {
				return;
			}

			seenEventsRef.current.add(dedupeKey);
			seenEventKeysOrderRef.current.push(dedupeKey);

			if (seenEventKeysOrderRef.current.length > SEEN_EVENT_KEYS_LIMIT) {
				const expiredKey = seenEventKeysOrderRef.current.shift();
				if (expiredKey) {
					seenEventsRef.current.delete(expiredKey);
				}
			}

			if (PAGE_PROGRESS_STAGES.has(event.stage)) {
				schedulePageProgressToast(event);
			} else {
				pushToast(formatProcessStatusToast(event));
			}

			scheduleTableRefresh();
		};

		eventSource.onerror = () => {
			if (eventSource.readyState === EventSource.CLOSED) {
				console.error("Process status stream closed");
			}
		};

		return () => {
			if (invalidateTimerRef.current) {
				clearTimeout(invalidateTimerRef.current);
			}

			for (const timer of pageProgressTimersRef.current.values()) {
				clearTimeout(timer);
			}
			pageProgressTimersRef.current.clear();
			pendingPageProgressRef.current.clear();

			eventSource.close();
		};
	}, [pushToast, queryClient]);
}
