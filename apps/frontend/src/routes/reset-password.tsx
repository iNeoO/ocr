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
import { zodValidator } from "@tanstack/zod-adapter";
import { Lock } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import AuthShell from "../components/AuthShell";
import { resetPassword } from "../libs/api/auth";

const resetPasswordSearchSchema = z.object({
	token: z.string().min(1),
});

const resetPasswordFormSchema = z
	.object({
		password: z.string().min(8, "Password must be at least 8 characters."),
		confirmPassword: z.string().min(1, "Please confirm your password."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ["confirmPassword"],
		message: "Passwords do not match.",
	});

type ResetFieldErrors = {
	password?: string;
	confirmPassword?: string;
};

export const Route = createFileRoute("/reset-password")({
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/" });
		}
	},
	validateSearch: zodValidator(resetPasswordSearchSchema),
	component: RouteComponent,
});

function RouteComponent() {
	const { token } = Route.useSearch();
	const resetPasswordFn = useServerFn(resetPassword);
	const passwordId = useId();
	const confirmPasswordId = useId();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setErrorMessage(null);

		const parsed = resetPasswordFormSchema.safeParse({
			password,
			confirmPassword,
		});

		if (!parsed.success) {
			const fields = parsed.error.flatten().fieldErrors;
			setFieldErrors({
				password: fields.password?.[0],
				confirmPassword: fields.confirmPassword?.[0],
			});
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			await resetPasswordFn({
				data: {
					token,
					newPassword: parsed.data.password,
				},
			});
			setIsSubmitted(true);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Reset failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthShell
			eyebrow="Security"
			title="Set a new secure key."
			description="Choose a replacement password and return to the same deck without changing any backend auth contract."
			footer={
				<>
					Need the login page instead?{" "}
					<Link asChild weight="medium" color="teal">
						<RouterLink to="/login">Go to sign in</RouterLink>
					</Link>
				</>
			}
		>
			<Flex direction="column" gap="4">
				{errorMessage ? (
					<Callout.Root color="red" variant="soft" size="2" className="surface-callout">
						<Callout.Text>{errorMessage}</Callout.Text>
					</Callout.Root>
				) : null}

				{isSubmitted ? (
					<Flex direction="column" gap="4">
						<Callout.Root color="green" variant="soft" size="2" className="surface-callout">
							<Callout.Text>
								Password reset successful. You can now sign in.
							</Callout.Text>
						</Callout.Root>
						<Flex>
							<Button asChild size="3" className="rounded-full">
								<RouterLink to="/login">Go to login</RouterLink>
							</Button>
						</Flex>
					</Flex>
				) : (
					<Box asChild>
						<form onSubmit={handleSubmit}>
							<Flex direction="column" gap="4">
								<Box>
									<Text
										as="label"
										htmlFor={passwordId}
										size="2"
										weight="medium"
									>
										New password
									</Text>
									<TextField.Root
										id={passwordId}
										mt="2"
										size="3"
										type="password"
										className="rounded-[18px]"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										required
									>
										<TextField.Slot>
											<Lock size={16} />
										</TextField.Slot>
									</TextField.Root>
									{fieldErrors.password ? (
										<Text mt="2" size="1" color="red">
											{fieldErrors.password}
										</Text>
									) : null}
								</Box>

								<Box>
									<Text
										as="label"
										htmlFor={confirmPasswordId}
										size="2"
										weight="medium"
									>
										Confirm new password
									</Text>
									<TextField.Root
										id={confirmPasswordId}
										mt="2"
										size="3"
										type="password"
										className="rounded-[18px]"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										required
									>
										<TextField.Slot>
											<Lock size={16} />
										</TextField.Slot>
									</TextField.Root>
									{fieldErrors.confirmPassword ? (
										<Text mt="2" size="1" color="red">
											{fieldErrors.confirmPassword}
										</Text>
									) : null}
								</Box>

								<Button type="submit" size="3" disabled={isSubmitting} className="rounded-full">
									{isSubmitting ? "Resetting..." : "Reset password"}
								</Button>
							</Flex>
						</form>
					</Box>
				)}
			</Flex>
		</AuthShell>
	);
}
