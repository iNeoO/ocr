import { Button, Callout, Container, Heading } from "@radix-ui/themes";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import { ProcessesTable } from "../../components/processes/ProcessesTable";
import {
	getFileSizeLabel,
	isPdfFile,
} from "../../components/processes/processes.helpers";
import { UploadProcessDialog } from "../../components/processes/UploadProcessDialog";
import { useProcessActions } from "../../components/processes/useProcessActions";
import { useProcessStatusSubscription } from "../../components/processes/useProcessStatusSubscription";
import { processesQueryOptions } from "../../libs/api/processes";

export const Route = createFileRoute("/_auth/processes")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(processesQueryOptions()),
	component: ProcessesPage,
});

function ProcessesPage() {
	const { data: processes } = useSuspenseQuery(processesQueryOptions());
	useProcessStatusSubscription();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const {
		isUploading,
		downloadProcessId,
		downloadMarkdownProcessId,
		deleteProcessId,
		actionError,
		pendingDeleteProcess,
		setPendingDeleteProcess,
		upload,
		download,
		downloadMarkdown,
		requestDelete,
		confirmDelete,
	} = useProcessActions();
	const completedCount = processes.filter(
		(p) => p.status === "completed",
	).length;
	const runningCount = processes.filter((p) => p.isRunning).length;
	const failedCount = processes.filter((p) => p.status === "failed").length;

	const setPdfFile = (file: File | null) => {
		if (!file || !isPdfFile(file)) {
			setSelectedFile(null);
			setUploadError("Only PDF files are allowed.");
			return;
		}
		setSelectedFile(file);
		setUploadError(null);
	};

	const handleUpload = async () => {
		if (!selectedFile) return;
		setUploadError(null);
		try {
			await upload(selectedFile);
			setIsUploadOpen(false);
			setSelectedFile(null);
			setIsDragging(false);
			if (inputRef.current) inputRef.current.value = "";
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : "Upload failed.");
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsUploadOpen(open);
		if (!open) {
			setSelectedFile(null);
			setIsDragging(false);
			setUploadError(null);
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setIsDragging(false);
		setPdfFile(event.dataTransfer.files?.[0] ?? null);
	};

	const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		if (!isDragging) setIsDragging(true);
	};

	const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setIsDragging(false);
		}
	};

	return (
		<Container size="4" px="4" py={{ initial: "7", sm: "8" }}>
			<div className="grid gap-5">
				{/* HEADER — titre + métriques + upload CTA */}
				<section className="data-panel px-5 py-5 sm:px-6">
					<div className="grid gap-4">
						<div className="flex items-start justify-between gap-4">
							<div className="page-header">
								<p className="section-kicker m-0">Process monitoring</p>
								<Heading
									size="7"
									className="display-title text-3xl sm:text-4xl"
								>
									Document runs
								</Heading>
								<p className="m-0 mt-1 max-w-[56ch] text-sm text-(--text-muted)">
									Track active OCR jobs, review failures and download completed
									archives.
								</p>
							</div>
							<div className="shrink-0 pt-1">
								<Button
									color="orange"
									size="3"
									className="rounded-full"
									onClick={() => setIsUploadOpen(true)}
								>
									<Upload size={16} />
									Upload
								</Button>
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							<div className="metric-card">
								<p className="section-kicker m-0">Total</p>
								<p className="metric-value">{processes.length}</p>
								<p className="metric-label m-0">Tracked processes</p>
							</div>
							<div className="metric-card">
								<p className="section-kicker m-0">Running</p>
								<p className="metric-value">{runningCount}</p>
								<p className="metric-label m-0">Currently in motion</p>
							</div>
							<div className="metric-card">
								<p className="section-kicker m-0">Delivered</p>
								<p className="metric-value">{completedCount}</p>
								<p className="metric-label m-0">Failed: {failedCount}</p>
							</div>
						</div>
					</div>
				</section>

				{/* QUEUE — pleine largeur */}
				<section className="data-panel p-4 sm:p-5">
					<div className="mb-4 flex items-end justify-between gap-3">
						<div>
							<p className="section-kicker m-0">Queue</p>
							<Heading size="6" className="panel-title mt-2">
								All document runs
							</Heading>
						</div>
						<p className="mono-label m-0 text-[0.66rem] tracking-[0.16em] text-(--text-faint)">
							live subscription
						</p>
					</div>

					{actionError ? (
						<Callout.Root
							color="red"
							variant="soft"
							size="2"
							mb="4"
							className="surface-callout"
						>
							<Callout.Text>{actionError}</Callout.Text>
						</Callout.Root>
					) : null}

					<ProcessesTable
						processes={processes}
						downloadProcessId={downloadProcessId}
						downloadMarkdownProcessId={downloadMarkdownProcessId}
						deleteProcessId={deleteProcessId}
						pendingDeleteProcess={pendingDeleteProcess}
						onDownload={download}
						onDownloadMarkdown={downloadMarkdown}
						onRequestDelete={requestDelete}
						onDeleteConfirmOpenChange={(open) => {
							if (!open) setPendingDeleteProcess(null);
						}}
						onDeleteConfirm={confirmDelete}
					/>
				</section>

				{/* Dialog upload — contrôlé par le bouton du header */}
				<UploadProcessDialog
					isOpen={isUploadOpen}
					selectedFile={selectedFile}
					selectedFileSize={getFileSizeLabel(selectedFile)}
					isDragging={isDragging}
					isUploading={isUploading}
					uploadError={uploadError}
					inputRef={inputRef}
					onOpenChange={handleOpenChange}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onFileChange={setPdfFile}
					onRemoveFile={() => {
						setSelectedFile(null);
						if (inputRef.current) inputRef.current.value = "";
					}}
					onUpload={handleUpload}
				/>
			</div>
		</Container>
	);
}
