import { Callout, Link } from "@radix-ui/themes";
import { createFileRoute, Link as RouterLink } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import AuthShell from "../components/AuthShell";
import { verifyEmail } from "../libs/api/auth";

type ValidationStatus = "idle" | "loading" | "success" | "error";

const validateEmailSearchParamsSchema = z.object({
	token: z.string(),
});

export const Route = createFileRoute("/validate-email")({
	validateSearch: zodValidator(validateEmailSearchParamsSchema),
	component: RouteComponent,
});

function RouteComponent() {
	const { token } = Route.useSearch();
	const validateEmail = useServerFn(verifyEmail);
	const [status, setStatus] = useState<ValidationStatus>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const hasValidated = useRef(false);

	useEffect(() => {
		if (!token || hasValidated.current) {
			return;
		}

		hasValidated.current = true;
		setStatus("loading");
		setErrorMessage(null);

		validateEmail({ data: { token } })
			.then(() => {
				setStatus("success");
			})
			.catch((error) => {
				setStatus("error");
				setErrorMessage(
					error instanceof Error ? error.message : "Validation failed",
				);
			});
	}, [token, validateEmail]);

	return (
		<AuthShell
			eyebrow="Verification"
			title="Confirming your email channel."
			description="Validation stays on the existing server flow, but the screen now reads like part of the same command deck."
		>
			{!token ? (
				<Callout.Root color="amber" variant="soft" size="2" className="surface-callout">
					<Callout.Icon>
						<AlertTriangle size={16} />
					</Callout.Icon>
					<Callout.Text>
						Missing validation token. Please use the link from your email.
					</Callout.Text>
				</Callout.Root>
			) : null}

			{status === "loading" ? (
				<Callout.Root color="blue" variant="soft" size="2" className="surface-callout">
					<Callout.Icon>
						<Info size={16} />
					</Callout.Icon>
					<Callout.Text>Validating your email...</Callout.Text>
				</Callout.Root>
			) : null}

			{status === "success" ? (
				<Callout.Root color="green" variant="soft" size="2" className="surface-callout">
					<Callout.Icon>
						<CheckCircle2 size={16} />
					</Callout.Icon>
					<Callout.Text>
						Your email has been validated.{" "}
						<Link asChild underline="hover" weight="medium" color="green">
							<RouterLink to="/login">Go to login</RouterLink>
						</Link>
					</Callout.Text>
				</Callout.Root>
			) : null}

			{status === "error" ? (
				<Callout.Root color="red" variant="soft" size="2" className="surface-callout">
					<Callout.Icon>
						<AlertTriangle size={16} />
					</Callout.Icon>
					<Callout.Text>{errorMessage ?? "Validation failed"}</Callout.Text>
				</Callout.Root>
			) : null}
		</AuthShell>
	);
}
