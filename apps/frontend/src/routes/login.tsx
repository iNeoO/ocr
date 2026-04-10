import {
	Box,
	Button,
	Callout,
	Flex,
	Link,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import {
	createFileRoute,
	Link as RouterLink,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import AuthShell from "../components/AuthShell";
import {
	type CalloutVariant,
	getCalloutColor,
} from "../helpers/colorChart.helper";
import {
	sendVerificationEmail,
	signInWithEmailAndPassword,
} from "../libs/api/auth";

const loginSchema = z.object({
	email: z.string().email("Enter a valid email address."),
	password: z.string().min(1, "Enter your password."),
});

type LoginFieldErrors = Partial<
	Record<keyof z.infer<typeof loginSchema>, string>
>;

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Login failed";
}

function mapFieldErrors(error: z.ZodError): LoginFieldErrors {
	const fields = error.flatten().fieldErrors;

	return {
		email: fields.email?.[0],
		password: fields.password?.[0],
	};
}

function RouteComponent() {
	const navigate = useNavigate();
	const router = useRouter();
	const signIn = useServerFn(signInWithEmailAndPassword);
	const resendVerification = useServerFn(sendVerificationEmail);
	const [loginEmail, setLoginEmail] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorVariant, setErrorVariant] = useState<CalloutVariant>("error");
	const [canResendValidationEmail, setCanResendValidationEmail] =
		useState(false);
	const [resendSuccessMessage, setResendSuccessMessage] = useState<
		string | null
	>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResending, setIsResending] = useState(false);

	const handleLogin = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setErrorMessage(null);
		setErrorVariant("error");
		setCanResendValidationEmail(false);
		setResendSuccessMessage(null);

		const parsed = loginSchema.safeParse({
			email: loginEmail.trim(),
			password: loginPassword,
		});

		if (!parsed.success) {
			setFieldErrors(mapFieldErrors(parsed.error));
			setErrorVariant("warning");
			setErrorMessage("Please fix the form errors.");
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			await signIn({ data: parsed.data });
			await router.invalidate();
			await navigate({ to: "/" });
		} catch (error) {
			const message = getErrorMessage(error);
			const lowerMessage = message.toLowerCase();

			setCanResendValidationEmail(
				lowerMessage.includes("verify") || lowerMessage.includes("validation"),
			);
			setErrorVariant("error");
			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResendValidationEmail = async () => {
		setResendSuccessMessage(null);
		setErrorMessage(null);
		setErrorVariant("error");
		setIsResending(true);

		try {
			await resendVerification({
				data: {
					email: loginEmail.trim(),
				},
			});
			setResendSuccessMessage("A new validation email has been sent.");
		} catch (error) {
			setErrorVariant("error");
			setErrorMessage(
				error instanceof Error
					? error.message
					: "Failed to send validation email",
			);
		} finally {
			setIsResending(false);
		}
	};

	return (
		<AuthShell
			eyebrow="Account access"
			title="Sign in to continue."
			description="Same flow, cleaner UI. The form now calls the server auth functions directly."
		>
			<Flex direction="column" gap="4">
				{errorMessage ? (
					<Callout.Root
						color={getCalloutColor(errorVariant)}
						variant="soft"
						size="2"
					>
						<Callout.Icon>
							<AlertTriangle size={16} />
						</Callout.Icon>
						<Callout.Text>{errorMessage}</Callout.Text>
					</Callout.Root>
				) : null}

				{canResendValidationEmail ? (
					<Flex justify="start">
						<Button
							type="button"
							variant="soft"
							color="amber"
							onClick={handleResendValidationEmail}
							disabled={isResending}
						>
							{isResending ? "Sending..." : "Resend validation email"}
						</Button>
					</Flex>
				) : null}

				{resendSuccessMessage ? (
					<Callout.Root color="green" variant="soft" size="2">
						<Callout.Text>{resendSuccessMessage}</Callout.Text>
					</Callout.Root>
				) : null}

				<Box asChild>
					<form onSubmit={handleLogin}>
						<Flex direction="column" gap="4">
							<Box>
								<Text as="label" htmlFor="email" size="2" weight="medium">
									Email
								</Text>
								<TextField.Root
									id="email"
									mt="2"
									size="3"
									type="email"
									value={loginEmail}
									onChange={(e) => setLoginEmail(e.target.value)}
									placeholder="you@example.com"
									required
								>
									<TextField.Slot>
										<Mail size={16} />
									</TextField.Slot>
								</TextField.Root>
								{fieldErrors.email ? (
									<Text mt="2" size="1" color="red">
										{fieldErrors.email}
									</Text>
								) : null}
							</Box>

							<Box>
								<Text as="label" htmlFor="password" size="2" weight="medium">
									Password
								</Text>
								<TextField.Root
									id="password"
									mt="2"
									size="3"
									type="password"
									value={loginPassword}
									onChange={(e) => setLoginPassword(e.target.value)}
									placeholder="Enter your password"
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

							<Button type="submit" size="3" disabled={isSubmitting}>
								{isSubmitting ? "Signing in..." : "Sign in"}
							</Button>
						</Flex>
					</form>
				</Box>

				<Separator size="4" />
				<Text size="2" color="gray">
					<Link asChild underline="always" color="orange">
						<RouterLink to="/password-forgotten">Forgot password?</RouterLink>
					</Link>
				</Text>
			</Flex>
		</AuthShell>
	);
}
