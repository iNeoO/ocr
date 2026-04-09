import { createServerFn } from "@tanstack/react-start";
import { trpc } from "../trpc.server";

export const getProcessesByUserId = createServerFn({ method: "GET" }).handler(
	async () => {
		const { processes } = await trpc.processes.getProcesses.query();
		return processes;
	},
);

export type UserProcess = Awaited<
	ReturnType<typeof getProcessesByUserId>
>[number];
