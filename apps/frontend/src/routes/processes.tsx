import {
	Badge,
	Button,
	Container,
	Dialog,
	Flex,
	Heading,
	Table,
	Text,
} from "@radix-ui/themes";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
	getProcessesByUserId,
	type UserProcess,
} from "../libs/api/processes";

export const Route = createFileRoute("/processes")({
	beforeLoad: ({ context }) => {
		if (!context.session) {
			throw redirect({ to: "/login" });
		}
	},
	loader: async () => {
		const processes = await getProcessesByUserId();
		return { processes };
	},
	component: ProcessesPage,
});

const formatDate = (date: Date | null) => {
	if (!date) {
		return "—";
	}

	return new Intl.DateTimeFormat("fr-FR", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(date));
};

const getStatusColor = (status: UserProcess["status"]) => {
	switch (status) {
		case "completed":
			return "green";
		case "failed":
			return "red";
		case "processing":
		case "splitting":
		case "finalizing":
			return "orange";
		default:
			return "gray";
	}
};

function ProcessesPage() {
	const { processes } = Route.useLoaderData();
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	const handleUpload = () => {
		if (!selectedFile) {
			return;
		}

		// Upload backend flow will be wired in the next step.
		setIsUploadOpen(false);
		setSelectedFile(null);
	};

	return (
		<Container size="3" px="4" py={{ initial: "8", sm: "9" }}>
			<Flex mb="5" align="center" justify="between" gap="3" wrap="wrap">
				<Heading size="8" className="display-title">
					Processes
				</Heading>
				<Dialog.Root open={isUploadOpen} onOpenChange={setIsUploadOpen}>
					<Dialog.Trigger>
						<Button color="orange">Upload file</Button>
					</Dialog.Trigger>
					<Dialog.Content maxWidth="460px">
						<Dialog.Title>Upload a PDF</Dialog.Title>
						<Dialog.Description size="2" mb="4">
							Select a file to start a new process.
						</Dialog.Description>
						<Flex direction="column" gap="3">
							<input
								type="file"
								accept="application/pdf"
								onChange={(event) =>
									setSelectedFile(event.target.files?.[0] ?? null)
								}
							/>
							<Text size="2" color="gray">
								{selectedFile
									? `Selected: ${selectedFile.name}`
									: "No file selected"}
							</Text>
						</Flex>
						<Flex mt="5" gap="3" justify="end">
							<Dialog.Close>
								<Button variant="soft" color="gray">
									Cancel
								</Button>
							</Dialog.Close>
							<Button color="orange" onClick={handleUpload} disabled={!selectedFile}>
								Upload
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
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{processes.map((process) => (
							<Table.Row key={process.id}>
								<Table.Cell>{formatDate(process.createdAt)}</Table.Cell>
								<Table.Cell>{formatDate(process.updatedAt)}</Table.Cell>
								<Table.Cell>{process.sourceFileName}</Table.Cell>
								<Table.Cell>
									<Badge color={getStatusColor(process.status)} variant="soft">
										{process.status}
									</Badge>
								</Table.Cell>
								<Table.Cell>{process.error ?? "—"}</Table.Cell>
								<Table.Cell>
									{process.error ? formatDate(process.errorAt) : "—"}
								</Table.Cell>
								<Table.Cell>{process.completedPages}</Table.Cell>
								<Table.Cell>{process.pageCount}</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			)}
		</Container>
	);
}
