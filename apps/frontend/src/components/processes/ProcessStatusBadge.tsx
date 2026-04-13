import { Badge } from "@radix-ui/themes";
import type { UserProcess } from "../../libs/api/processes";
import { getProcessStatusColor } from "../../helpers/colorChart.helper";
import { formatProcessStatus } from "./processes.helpers";

type ProcessStatusBadgeProps = {
	status: UserProcess["status"];
	isRunning: boolean;
};

export function ProcessStatusBadge({
	status,
	isRunning,
}: ProcessStatusBadgeProps) {
	const tone = isRunning
		? "running"
		: status === "completed"
			? "completed"
			: status === "failed"
				? "failed"
				: "queued";

	return (
		<Badge
			color={getProcessStatusColor(status)}
			variant="soft"
			className="status-pill"
			data-status={tone}
		>
			<span className="status-dot" />
			{formatProcessStatus(status)}
			{isRunning ? " / running" : ""}
		</Badge>
	);
}
