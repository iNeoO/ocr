import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
	deleteProcess,
	downloadProcessArchive,
	processesQueryKey,
	type UserProcess,
	uploadProcessFile,
} from "../../libs/api/processes";
import { triggerBrowserDownload } from "./processes.helpers";

export function useProcessActions() {
	const queryClient = useQueryClient();
	const removeProcess = useServerFn(deleteProcess);
	const uploadFile = useServerFn(uploadProcessFile);
	const [downloadProcessId, setDownloadProcessId] = useState<string | null>(
		null,
	);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pendingDeleteProcess, setPendingDeleteProcess] =
		useState<UserProcess | null>(null);

	const invalidateProcesses = () =>
		queryClient.invalidateQueries({ queryKey: processesQueryKey });

	const uploadMutation = useMutation({
		mutationFn: (file: File) => {
			const formData = new FormData();
			formData.append("file", file);

			return uploadFile({ data: formData });
		},
		onSuccess: invalidateProcesses,
	});

	const deleteMutation = useMutation({
		mutationFn: (processId: string) => removeProcess({ data: { processId } }),
		onSuccess: invalidateProcesses,
	});

	const upload = async (file: File) => {
		setActionError(null);

		try {
			await uploadMutation.mutateAsync(file);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Upload failed.");
			throw error;
		}
	};

	const download = async (processId: string) => {
		setDownloadProcessId(processId);
		setActionError(null);

		try {
			const { blob, filename } = await downloadProcessArchive(processId);
			triggerBrowserDownload(blob, filename);
		} catch (error) {
			setActionError(
				error instanceof Error ? error.message : "Download failed.",
			);
			throw error;
		} finally {
			setDownloadProcessId((currentProcessId) =>
				currentProcessId === processId ? null : currentProcessId,
			);
		}
	};

	const requestDelete = (process: UserProcess) => {
		setActionError(null);
		setPendingDeleteProcess(process);
	};

	const confirmDelete = async () => {
		if (!pendingDeleteProcess) {
			return;
		}

		setActionError(null);

		try {
			await deleteMutation.mutateAsync(pendingDeleteProcess.id);
			setPendingDeleteProcess(null);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Delete failed.");
			throw error;
		}
	};

	return {
		isUploading: uploadMutation.isPending,
		downloadProcessId,
		deleteProcessId: deleteMutation.isPending
			? (deleteMutation.variables ?? null)
			: null,
		actionError,
		pendingDeleteProcess,
		setActionError,
		setPendingDeleteProcess,
		upload,
		download,
		requestDelete,
		confirmDelete,
	};
}
