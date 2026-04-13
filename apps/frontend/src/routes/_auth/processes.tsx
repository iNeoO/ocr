import { Callout, Container, Flex, Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { type DragEvent, useRef, useState } from "react";
import { ProcessesTable } from "../../components/processes/ProcessesTable";
import { UploadProcessDialog } from "../../components/processes/UploadProcessDialog";
import {
	getFileSizeLabel,
	isPdfFile,
} from "../../components/processes/processes.helpers";
import { useProcessActions } from "../../components/processes/useProcessActions";
import { useProcessStatusSubscription } from "../../components/processes/useProcessStatusSubscription";
import { getProcessesByUserId } from "../../libs/api/processes";

export const Route = createFileRoute("/_auth/processes")({
	loader: async () => {
		const processes = await getProcessesByUserId();
		return { processes };
	},
	component: ProcessesPage,
});

function ProcessesPage() {
	const { processes } = Route.useLoaderData();
	useProcessStatusSubscription();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const {
		isUploading,
		downloadProcessId,
		deleteProcessId,
		actionError,
		pendingDeleteProcess,
		setPendingDeleteProcess,
		upload,
		download,
		requestDelete,
		confirmDelete,
	} = useProcessActions();
	const completedCount = processes.filter((process) => process.status === "completed").length;
	const runningCount = processes.filter((process) => process.isRunning).length;
	const failedCount = processes.filter((process) => process.status === "failed").length;

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
		if (!selectedFile) {
			return;
		}

		setUploadError(null);

		try {
			await upload(selectedFile);
			setIsUploadOpen(false);
			setSelectedFile(null);
			setIsDragging(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
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
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	};

	const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		setIsDragging(false);
		setPdfFile(event.dataTransfer.files?.[0] ?? null);
	};

	const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
		event.preventDefault();
		if (!isDragging) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
			setIsDragging(false);
		}
	};

	return (
		<Container size="4" px="4" py={{ initial: "7", sm: "8" }}>
			<div className="grid gap-5">
				<section className="data-panel rounded-[24px] px-5 py-5 sm:px-6">
					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
						<div className="page-header">
							<p className="section-kicker m-0">Process monitoring</p>
							<Heading size="7" className="display-title text-3xl sm:text-4xl">
								Document runs
							</Heading>
							<p className="m-0 max-w-[62ch] text-sm sm:text-base text-(--text-muted)">
								Track active OCR jobs, review failures and download completed
								archives. The queue is the primary surface.
							</p>
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
								<p className="metric-label m-0">
									Failed: {failedCount}
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="data-panel rounded-[24px] p-4 sm:p-5">
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
						<Callout.Root color="red" variant="soft" size="2" mb="4" className="surface-callout">
							<Callout.Text>{actionError}</Callout.Text>
						</Callout.Root>
					) : null}

					<ProcessesTable
						processes={processes}
						downloadProcessId={downloadProcessId}
						deleteProcessId={deleteProcessId}
						pendingDeleteProcess={pendingDeleteProcess}
						onDownload={download}
						onRequestDelete={requestDelete}
						onDeleteConfirmOpenChange={(open) => {
							if (!open) {
								setPendingDeleteProcess(null);
							}
						}}
						onDeleteConfirm={confirmDelete}
					/>
				</section>

				<section className="grid gap-5 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1fr)]">
					<div className="data-panel rounded-[24px] p-4 sm:p-5">
						<p className="section-kicker m-0">New intake</p>
						<Heading size="6" className="panel-title mt-2">
							Start a fresh process
						</Heading>
						<p className="mt-3 text-(--text-muted)">
							Upload a PDF, validate it and open a new OCR run from the same page.
						</p>
						<div className="mt-5">
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
									if (inputRef.current) {
										inputRef.current.value = "";
									}
								}}
								onUpload={handleUpload}
							/>
						</div>
					</div>

					<div className="feature-card rounded-[24px] p-5">
						<p className="section-kicker m-0">Notes</p>
						<ul className="mt-4 grid gap-3 pl-5 text-(--text-muted)">
							<li>Only PDF files are accepted for upload.</li>
							<li>Completed and failed jobs expose archive or delete actions.</li>
							<li>Removing a completed or failed process frees an upload slot.</li>
						</ul>
					</div>
				</section>
			</div>
		</Container>
	);
}
