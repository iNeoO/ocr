import { createServerFn } from "@tanstack/react-start";
import { withServerErrorLogging } from "../server/error-handling";
import { trpc } from "../trpc.server";

export const getProcessesByUserId = createServerFn({ method: "GET" }).handler(
	async () => {
		const { processes } = await withServerErrorLogging(
			"processes.getProcesses",
			() => trpc.processes.getProcesses.query(),
			{ userMessage: "Failed to load processes. Please try again." },
		);
		return processes;
	},
);

export const deleteProcess = createServerFn({ method: "POST" })
	.inputValidator((data: { processId: string }) => data)
	.handler(async ({ data }) => {
		await withServerErrorLogging(
			"processes.delete",
			() => trpc.processes.delete.mutate({ processId: data.processId }),
			{ userMessage: "Failed to delete process. Please try again." },
		);
		return { success: true };
	});

export type UserProcess = Awaited<
	ReturnType<typeof getProcessesByUserId>
>[number];

export const uploadProcessFile = async (file: File) => {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch("/trpc/files.upload", {
		method: "POST",
		body: formData,
		credentials: "include",
	});

	const payload = (await response.json().catch(() => null)) as
		| {
				error?: {
					message?: string;
				};
		  }
		| null;

	if (!response.ok || payload?.error?.message) {
		throw new Error(payload?.error?.message ?? "Upload failed.");
	}

	return payload;
};

export const downloadProcessArchive = async (processId: string) => {
	const response = await fetch(`/downloads/processes/${processId}`, {
		method: "GET",
		credentials: "include",
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as
			| { message?: string }
			| null;
		throw new Error(payload?.message ?? "Download failed.");
	}

	const blob = await response.blob();
	const disposition = response.headers.get("content-disposition");
	const filenameMatch = disposition?.match(/filename="([^"]+)"/);
	const filename = filenameMatch?.[1] ?? `process-${processId}.zip`;

	return {
		blob,
		filename,
	};
};
