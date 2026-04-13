import type { UserProcess } from "../libs/api/processes";

export const getProcessStatusColor = (status: UserProcess["status"]) => {
	switch (status) {
		case "completed":
			return "green";
		case "failed":
			return "red";
		case "processing":
		case "post_processing":
		case "splitting":
		case "finalizing":
			return "orange";
		default:
			return "gray";
	}
};

export type CalloutVariant = "warning" | "error" | "info" | "success";

export const getCalloutColor = (variant: CalloutVariant) => {
	switch (variant) {
		case "warning":
			return "amber";
		case "success":
			return "green";
		case "info":
			return "blue";
		default:
			return "red";
	}
};
