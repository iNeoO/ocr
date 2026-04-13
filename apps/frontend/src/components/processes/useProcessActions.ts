import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
	deleteProcess,
	downloadProcessArchive,
	type UserProcess,
	uploadProcessFile,
} from "../../libs/api/processes";
import { triggerBrowserDownload } from "./processes.helpers";

export function useProcessActions() {
	const router = useRouter();
	const removeProcess = useServerFn(deleteProcess);
	const [isUploading, setIsUploading] = useState(false);
	const [downloadProcessId, setDownloadProcessId] = useState<string | null>(null);
	const [deleteProcessId, setDeleteProcessId] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [pendingDeleteProcess, setPendingDeleteProcess] =
		useState<UserProcess | null>(null);

	const upload = async (file: File) => {
		setIsUploading(true);
		setActionError(null);

		try {
			await uploadProcessFile(file);
			await router.invalidate();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Upload failed.");
			throw error;
		} finally {
			setIsUploading(false);
		}
	};

	const download = async (processId: string) => {
		setDownloadProcessId(processId);
		setActionError(null);

		try {
			const { blob, filename } = await downloadProcessArchive(processId);
			triggerBrowserDownload(blob, filename);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Download failed.");
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

		const processId = pendingDeleteProcess.id;
		setDeleteProcessId(processId);
		setActionError(null);

		try {
			await removeProcess({ data: { processId } });
			setPendingDeleteProcess(null);
			await router.invalidate();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : "Delete failed.");
			throw error;
		} finally {
			setDeleteProcessId((currentProcessId) =>
				currentProcessId === processId ? null : currentProcessId,
			);
		}
	};

	return {
		isUploading,
		downloadProcessId,
		deleteProcessId,
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
