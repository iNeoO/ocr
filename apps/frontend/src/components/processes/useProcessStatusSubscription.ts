import type { ProcessStatusEvent } from "@ocr/common";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { trpc } from "../../libs/trpc";
import { useToast } from "../toast/ToastProvider";

const PROCESS_TABLE_REFRESH_DEBOUNCE_MS = 750;
const SEEN_EVENT_KEYS_LIMIT = 250;

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
	description: `${event.processName} • ${event.message} in ${formatDuration(event.durationMs)}`,
});

export function useProcessStatusSubscription() {
	const router = useRouter();
	const { pushToast } = useToast();
	const seenEventsRef = useRef<Set<string>>(new Set());
	const seenEventKeysOrderRef = useRef<string[]>([]);
	const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const scheduleTableRefresh = () => {
			if (invalidateTimerRef.current) {
				clearTimeout(invalidateTimerRef.current);
			}

			invalidateTimerRef.current = setTimeout(() => {
				invalidateTimerRef.current = null;
				void router.invalidate();
			}, PROCESS_TABLE_REFRESH_DEBOUNCE_MS);
		};

		const subscription = trpc.processes.status.subscribe(undefined, {
			onData(event: ProcessStatusEvent) {
				const dedupeKey = `${event.processId}:${event.stage}:${event.occurredAt}`;
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

				pushToast(formatProcessStatusToast(event));
				scheduleTableRefresh();
			},
			onError(error) {
				console.error("Process status subscription failed", error);
			},
		});

		return () => {
			if (invalidateTimerRef.current) {
				clearTimeout(invalidateTimerRef.current);
			}

			subscription.unsubscribe();
		};
	}, [pushToast, router]);
}
