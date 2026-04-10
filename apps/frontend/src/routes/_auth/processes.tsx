import {
	ArchiveBoxArrowDownIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import {
	Box,
	Badge,
	Button,
	Callout,
	Container,
	Dialog,
	Flex,
	Heading,
	Table,
	Text,
} from "@radix-ui/themes";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { FileText, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { getProcessStatusColor } from "../../helpers/colorChart.helper";
import { formatDate } from "../../helpers/formater.helper";
import { trpc } from "../../libs/trpc";
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
	const router = useRouter();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [downloadProcessId, setDownloadProcessId] = useState<string | null>(null);
	const [deleteProcessId, setDeleteProcessId] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const isPdfFile = (file: File) =>
		file.type === "application/pdf" ||
		file.name.toLowerCase().endsWith(".pdf");

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

		setIsUploading(true);
		setUploadError(null);

		try {
			const formData = new FormData();
			formData.append("file", selectedFile);

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

			setIsUploadOpen(false);
			setSelectedFile(null);
			setIsDragging(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
			await router.invalidate();
		} catch (error) {
			setUploadError(
				error instanceof Error ? error.message : "Upload failed.",
			);
		} finally {
			setIsUploading(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsUploadOpen(open);
		if (!open) {
			setSelectedFile(null);
			setIsDragging(false);
			setUploadError(null);
			setIsUploading(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	};

	const handleDownload = async (processId: string) => {
		setDownloadProcessId(processId);

		try {
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
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Download failed.",
			);
		} finally {
			setDownloadProcessId((currentProcessId) =>
				currentProcessId === processId ? null : currentProcessId,
			);
		}
	};

	const handleDelete = async (processId: string) => {
		if (
			!window.confirm(
				"This will delete the process, its pages and every related file. Continue?",
			)
		) {
			return;
		}

		setDeleteProcessId(processId);

		try {
			await trpc.processes.delete.mutate({ processId });
			await router.invalidate();
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "Delete failed.",
			);
		} finally {
			setDeleteProcessId((currentProcessId) =>
				currentProcessId === processId ? null : currentProcessId,
			);
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

	const selectedFileSize = selectedFile
		? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
		: null;

	return (
		<Container size="4" px="4" py={{ initial: "8", sm: "9" }}>
			<Flex mb="5" align="center" justify="between" gap="3" wrap="wrap">
				<Heading size="8" className="display-title">
					Processes
				</Heading>
				<Dialog.Root open={isUploadOpen} onOpenChange={handleOpenChange}>
					<Dialog.Trigger>
						<Button color="orange">Upload file</Button>
					</Dialog.Trigger>
					<Dialog.Content
						maxWidth="640px"
						className="upload-dialog-content"
					>
						<Dialog.Title className="display-title">Upload a PDF</Dialog.Title>
						<Dialog.Description size="2" mb="5" color="gray">
							Drag your file here or use the button to start a new process.
							Only PDF files are accepted. Limit: 5 uploads per day per user.
							If you delete a completed or failed process, you free up a slot.
						</Dialog.Description>
						<Flex direction="column" gap="4">
							{uploadError ? (
								<Callout.Root color="red" variant="soft" size="2">
									<Callout.Text>{uploadError}</Callout.Text>
								</Callout.Root>
							) : null}
							<Box
								asChild
								className={`upload-dropzone ${
									isDragging ? "is-dragging" : ""
								}`}
							>
								<label
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
								>
									<input
										ref={inputRef}
										type="file"
										accept="application/pdf,.pdf"
										className="sr-only"
										onChange={(event) =>
											setPdfFile(event.target.files?.[0] ?? null)
										}
									/>
									<Flex
										direction="column"
										align="center"
										justify="center"
										gap="4"
									>
										<Box className="upload-dropzone-icon">
											<Upload size={34} strokeWidth={2.2} />
										</Box>
										<Flex direction="column" align="center" gap="2">
											<Text size="6" weight="bold" align="center">
												Drop your PDF here or click to upload
											</Text>
											<Text size="2" color="gray" align="center">
												Import simple, format PDF uniquement.
											</Text>
										</Flex>
										<Button
											type="button"
											color="orange"
											size="3"
											onClick={(event) => {
												event.preventDefault();
												inputRef.current?.click();
											}}
										>
											Choose PDF
										</Button>
									</Flex>
								</label>
							</Box>

							<Box className="upload-file-summary">
								{selectedFile ? (
									<Flex align="center" justify="between" gap="3" wrap="wrap">
										<Flex align="center" gap="3">
											<Box className="upload-file-icon">
												<FileText size={18} />
											</Box>
											<Flex direction="column" gap="1">
												<Text size="2" weight="bold">
													{selectedFile.name}
												</Text>
												<Text size="1" color="gray">
													Selected PDF • {selectedFileSize}
												</Text>
											</Flex>
										</Flex>
										<Button
											type="button"
											variant="soft"
											color="gray"
											onClick={() => {
												setSelectedFile(null);
												if (inputRef.current) {
													inputRef.current.value = "";
												}
											}}
										>
											Remove
										</Button>
									</Flex>
								) : (
									<Text size="2" color="gray">
										No file selected.
									</Text>
								)}
							</Box>
						</Flex>
						<Flex mt="5" gap="3" justify="end">
							<Dialog.Close>
								<Button variant="soft" color="gray">
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								color="orange"
								onClick={handleUpload}
								disabled={!selectedFile || isUploading}
							>
								{isUploading ? "Uploading..." : "Upload"}
							</Button>
						</Flex>
					</Dialog.Content>
				</Dialog.Root>
			</Flex>
			{processes.length === 0 ? (
				<Text size="3" color="gray">
					No process found.
				</Text>
			) : (
				<Table.Root variant="surface" size="2">
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeaderCell>Created at</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Updated at</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>File name</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Error</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Error at</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Completed pages</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Page count</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{processes.map((process) => (
							<Table.Row key={process.id}>
								<Table.Cell>{formatDate(process.createdAt)}</Table.Cell>
								<Table.Cell>{formatDate(process.updatedAt)}</Table.Cell>
								<Table.Cell>{process.sourceFileName}</Table.Cell>
								<Table.Cell>
									<Badge
										color={getProcessStatusColor(process.status)}
										variant="soft"
									>
										{process.status}
										{process.isRunning ? " • running" : ""}
									</Badge>
								</Table.Cell>
								<Table.Cell>{process.error ?? "—"}</Table.Cell>
								<Table.Cell>
									{process.error ? formatDate(process.errorAt) : "—"}
								</Table.Cell>
								<Table.Cell>{process.completedPages}</Table.Cell>
								<Table.Cell>{process.pageCount}</Table.Cell>
								<Table.Cell>
									{process.status === "completed" ||
									process.status === "failed" ? (
										<Flex gap="2" wrap="wrap">
											{process.status === "completed" ? (
												<Button
													size="1"
													color="orange"
													variant="soft"
													onClick={() => void handleDownload(process.id)}
													disabled={downloadProcessId === process.id}
												>
													<ArchiveBoxArrowDownIcon width={16} height={16} />
													{downloadProcessId === process.id
														? "Downloading..."
														: "ZIP"}
												</Button>
											) : null}
											<Button
												size="1"
												color="red"
												variant="soft"
												onClick={() => void handleDelete(process.id)}
												disabled={deleteProcessId === process.id}
											>
												<TrashIcon width={16} height={16} />
												{deleteProcessId === process.id
													? "Deleting..."
													: "Delete"}
											</Button>
										</Flex>
									) : (
										<Text size="1" color="gray">
											—
										</Text>
									)}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			)}
		</Container>
	);
}
