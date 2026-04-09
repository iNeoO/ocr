import {
	Box,
	Button,
	Callout,
	Flex,
	Link,
	Text,
	TextField,
} from "@radix-ui/themes";
import {
	createFileRoute,
	Link as RouterLink,
	redirect,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import AuthShell from "../components/AuthShell";
import { requestPasswordReset } from "../libs/api/auth";

const requestResetSchema = z.object({
	email: z.string().email("Enter a valid email address."),
});

export const Route = createFileRoute("/password-forgotten")({
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	const resetPassword = useServerFn(requestPasswordReset);
	const emailId = useId();
	const [email, setEmail] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldError, setFieldError] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setErrorMessage(null);

		const parsed = requestResetSchema.safeParse({ email: email.trim() });

		if (!parsed.success) {
			setFieldError(parsed.error.flatten().fieldErrors.email?.[0] ?? null);
			return;
		}

		setFieldError(null);
		setIsSubmitting(true);

		try {
			await resetPassword({ data: parsed.data });
			setIsSubmitted(true);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Request failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthShell
			eyebrow="Recovery"
			title="Request a reset link."
			description="A lighter recovery screen wired to the new server auth API."
			footer={
				<>
					Remembered your password?{" "}
					<Link asChild weight="medium" color="teal">
						<RouterLink to="/login">Back to sign in</RouterLink>
					</Link>
				</>
			}
		>
			<Flex direction="column" gap="4">
				{errorMessage ? (
					<Callout.Root color="red" variant="soft" size="2">
						<Callout.Text>{errorMessage}</Callout.Text>
					</Callout.Root>
				) : null}

				{isSubmitted ? (
					<Callout.Root color="green" variant="soft" size="2">
						<Callout.Text>
							If this email exists, we sent a reset link.
						</Callout.Text>
					</Callout.Root>
				) : (
					<Box asChild>
						<form onSubmit={handleSubmit}>
							<Flex direction="column" gap="4">
								<Box>
									<Text as="label" htmlFor={emailId} size="2" weight="medium">
										Email
									</Text>
									<TextField.Root
										id={emailId}
										mt="2"
										size="3"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										placeholder="you@example.com"
									>
										<TextField.Slot>
											<Mail size={16} />
										</TextField.Slot>
									</TextField.Root>
									{fieldError ? (
										<Text mt="2" size="1" color="red">
											{fieldError}
										</Text>
									) : null}
								</Box>

								<Button type="submit" size="3" disabled={isSubmitting}>
									{isSubmitting ? "Sending..." : "Send reset link"}
								</Button>
							</Flex>
						</form>
					</Box>
				)}
			</Flex>
		</AuthShell>
	);
}
