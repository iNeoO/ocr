import {
	ArchiveBoxArrowDownIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { Button, Dialog, Flex, Table, Text } from "@radix-ui/themes";
import { formatDate } from "../../helpers/formater.helper";
import type { UserProcess } from "../../libs/api/processes";
import { ProcessStatusBadge } from "./ProcessStatusBadge";

type ProcessesTableProps = {
	processes: UserProcess[];
	downloadProcessId: string | null;
	deleteProcessId: string | null;
	pendingDeleteProcess: UserProcess | null;
	onDownload: (processId: string) => Promise<void>;
	onRequestDelete: (process: UserProcess) => void;
	onDeleteConfirmOpenChange: (open: boolean) => void;
	onDeleteConfirm: () => Promise<void>;
};

export function ProcessesTable({
	processes,
	downloadProcessId,
	deleteProcessId,
	pendingDeleteProcess,
	onDownload,
	onRequestDelete,
	onDeleteConfirmOpenChange,
	onDeleteConfirm,
}: ProcessesTableProps) {
	if (processes.length === 0) {
		return (
			<div className="empty-state-panel feature-card rounded-[24px]">
				<p className="section-kicker m-0">Empty queue</p>
				<Text size="4" className="mt-3 block text-(--text-strong)">
					No process found.
				</Text>
				<Text className="mt-2 block text-(--text-muted)">
					Open the upload panel to drop a PDF and start the first OCR run.
				</Text>
			</div>
		);
	}

	return (
		<>
			<div className="mb-3 flex justify-end">
				<p className="mono-label m-0 text-[0.64rem] tracking-[0.15em] text-(--text-faint)">
					horizontal scroll enabled on compact screens
				</p>
			</div>
			<div className="process-table-wrap">
				<Table.Root variant="surface" size="2" className="process-table">
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
								<Table.Cell className="max-w-[16rem]">
									<Text className="block truncate text-(--text-strong)">
										{process.sourceFileName}
									</Text>
								</Table.Cell>
								<Table.Cell>
									<ProcessStatusBadge
										status={process.status}
										isRunning={process.isRunning}
									/>
								</Table.Cell>
								<Table.Cell className="max-w-[16rem]">
									<Text className="block truncate text-(--text-muted)">
										{process.error ?? "—"}
									</Text>
								</Table.Cell>
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
													className="rounded-full"
													onClick={() => void onDownload(process.id)}
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
												className="rounded-full"
												onClick={() => onRequestDelete(process)}
												disabled={deleteProcessId === process.id}
											>
												<TrashIcon width={16} height={16} />
												{deleteProcessId === process.id
													? "Deleting..."
													: "Delete"}
											</Button>
										</Flex>
									) : (
										<Text size="1" className="text-(--text-faint)">
											—
										</Text>
									)}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			</div>

			<Dialog.Root
				open={Boolean(pendingDeleteProcess)}
				onOpenChange={onDeleteConfirmOpenChange}
			>
				<Dialog.Content maxWidth="480px" className="upload-dialog-content">
					<Dialog.Title>Delete process</Dialog.Title>
					<Dialog.Description size="2" className="text-(--text-muted)">
						This will delete the process, its pages and every related file. This
						action cannot be undone.
					</Dialog.Description>
					<Flex mt="5" gap="3" justify="end">
						<Dialog.Close>
							<Button variant="soft" color="gray">
								Cancel
							</Button>
						</Dialog.Close>
						<Button
							color="red"
							onClick={() => void onDeleteConfirm()}
							disabled={!pendingDeleteProcess}
						>
							Delete
						</Button>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</>
	);
}
