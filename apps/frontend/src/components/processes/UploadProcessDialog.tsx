import { FileText, Upload } from "lucide-react";
import { type DragEvent, type RefObject } from "react";
import {
	Box,
	Button,
	Callout,
	Dialog,
	Flex,
	Text,
} from "@radix-ui/themes";

type UploadProcessDialogProps = {
	isOpen: boolean;
	selectedFile: File | null;
	selectedFileSize: string | null;
	isDragging: boolean;
	isUploading: boolean;
	uploadError: string | null;
	inputRef: RefObject<HTMLInputElement | null>;
	onOpenChange: (open: boolean) => void;
	onDrop: (event: DragEvent<HTMLLabelElement>) => void;
	onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
	onDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
	onFileChange: (file: File | null) => void;
	onRemoveFile: () => void;
	onUpload: () => Promise<void>;
};

export function UploadProcessDialog({
	isOpen,
	selectedFile,
	selectedFileSize,
	isDragging,
	isUploading,
	uploadError,
	inputRef,
	onOpenChange,
	onDrop,
	onDragOver,
	onDragLeave,
	onFileChange,
	onRemoveFile,
	onUpload,
}: UploadProcessDialogProps) {
	return (
			<Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
			<Dialog.Trigger>
				<Button color="orange" className="rounded-full">
					Upload file
				</Button>
			</Dialog.Trigger>
			<Dialog.Content maxWidth="640px" className="upload-dialog-content">
				<Dialog.Title className="display-title">Upload a PDF</Dialog.Title>
				<Dialog.Description size="2" mb="5" className="text-(--text-muted)">
					Drag your file here or use the button to start a new process. Only
					PDF files are accepted. Limit: 5 uploads per day per user. If you
					delete a completed or failed process, you free up a slot.
				</Dialog.Description>
				<Flex direction="column" gap="4">
					{uploadError ? (
						<Callout.Root color="red" variant="soft" size="2">
							<Callout.Text>{uploadError}</Callout.Text>
						</Callout.Root>
					) : null}
					<Box
						asChild
						className={`upload-dropzone ${isDragging ? "is-dragging" : ""}`}
					>
						<label
							className="flex min-h-[20rem] cursor-pointer items-center justify-center rounded-[22px] px-5 py-6"
							onDrop={onDrop}
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
						>
							<input
								ref={inputRef}
								type="file"
								accept="application/pdf,.pdf"
								className="sr-only"
								onChange={(event) =>
									onFileChange(event.target.files?.[0] ?? null)
								}
							/>
							<Flex direction="column" align="center" justify="center" gap="4">
								<Box className="upload-dropzone-icon">
									<Upload size={34} strokeWidth={2.2} />
								</Box>
								<Flex direction="column" align="center" gap="2">
									<Text size="6" weight="bold" align="center" className="text-(--text-strong)">
										Drop your PDF here or click to upload
									</Text>
									<Text size="2" align="center" className="text-(--text-muted)">
										High-contrast intake zone for single PDF uploads.
									</Text>
								</Flex>
								<Button
									type="button"
									color="orange"
									size="3"
									className="rounded-full"
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
										<Text size="2" weight="bold" className="text-(--text-strong)">
											{selectedFile.name}
										</Text>
										<Text size="1" className="text-(--text-muted)">
											Selected PDF • {selectedFileSize}
										</Text>
									</Flex>
								</Flex>
								<Button
									type="button"
									variant="soft"
									color="gray"
									className="rounded-full"
									onClick={onRemoveFile}
								>
									Remove
								</Button>
							</Flex>
						) : (
							<Text size="2" className="text-(--text-muted)">
								No file selected.
							</Text>
						)}
					</Box>
				</Flex>
				<Flex mt="5" gap="3" justify="end">
					<Dialog.Close>
						<Button variant="soft" color="gray" className="rounded-full">
							Cancel
						</Button>
					</Dialog.Close>
					<Button
						color="orange"
						className="rounded-full"
						onClick={() => void onUpload()}
						disabled={!selectedFile || isUploading}
					>
						{isUploading ? "Uploading..." : "Upload"}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
