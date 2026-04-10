import { Box, Button, Callout, Flex, Text, TextField } from "@radix-ui/themes";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Mail, User } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import AuthShell from "../components/AuthShell";
import { signUpWithEmailAndPassword } from "../libs/api/auth";

const signUpSchema = z.object({
	name: z.string().min(1, "Enter your name."),
	email: z.string().email("Enter a valid email address."),
	password: z.string().min(8, "Password must be at least 8 characters."),
});

type SignUpFieldErrors = Partial<
	Record<keyof z.infer<typeof signUpSchema>, string>
>;

export const Route = createFileRoute("/sign-up")({
	beforeLoad: ({ context }) => {
		if (context.session) {
			throw redirect({ to: "/" });
		}
	},
	component: RouteComponent,
});

function mapFieldErrors(error: z.ZodError): SignUpFieldErrors {
	const fields = error.flatten().fieldErrors;

	return {
		name: fields.name?.[0],
		email: fields.email?.[0],
		password: fields.password?.[0],
	};
}

function RouteComponent() {
	const navigate = useNavigate();
	const router = useRouter();
	const signUp = useServerFn(signUpWithEmailAndPassword);
	const [signupEmail, setSignupEmail] = useState("");
	const [signupPassword, setSignupPassword] = useState("");
	const [signupName, setSignupName] = useState("");
	const usernameId = useId();
	const emailId = useId();
	const passwordId = useId();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSignup = async (event: React.SubmitEvent) => {
		event.preventDefault();
		setErrorMessage(null);

		const parsed = signUpSchema.safeParse({
			name: signupName.trim(),
			email: signupEmail.trim(),
			password: signupPassword,
		});

		if (!parsed.success) {
			setFieldErrors(mapFieldErrors(parsed.error));
			return;
		}

		setFieldErrors({});
		setIsSubmitting(true);

		try {
			await signUp({ data: parsed.data });
			await router.invalidate();
			await navigate({ to: "/" });
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Signup failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<AuthShell
			eyebrow="New account"
			title="Create your workspace entry point."
			description="This page now uses the server signup function directly."
		>
			<Flex direction="column" gap="4">
				{errorMessage ? (
					<Callout.Root color="red" variant="soft" size="2">
						<Callout.Text>{errorMessage}</Callout.Text>
					</Callout.Root>
				) : null}

				<Box asChild>
					<form onSubmit={handleSignup}>
						<Flex direction="column" gap="4">
							<Box>
								<Text as="label" htmlFor={usernameId} size="2" weight="medium">
									Name
								</Text>
								<TextField.Root
									id={usernameId}
									mt="2"
									size="3"
									type="text"
									value={signupName}
									onChange={(e) => setSignupName(e.target.value)}
									required
								>
									<TextField.Slot>
										<User size={16} />
									</TextField.Slot>
								</TextField.Root>
								{fieldErrors.name ? (
									<Text mt="2" size="1" color="red">
										{fieldErrors.name}
									</Text>
								) : null}
							</Box>

							<Box>
								<Text as="label" htmlFor={emailId} size="2" weight="medium">
									Email
								</Text>
								<TextField.Root
									id={emailId}
									mt="2"
									size="3"
									type="email"
									value={signupEmail}
									onChange={(e) => setSignupEmail(e.target.value)}
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
								<Text as="label" htmlFor={passwordId} size="2" weight="medium">
									Password
								</Text>
								<TextField.Root
									id={passwordId}
									mt="2"
									size="3"
									type="password"
									value={signupPassword}
									onChange={(e) => setSignupPassword(e.target.value)}
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
								{isSubmitting ? "Creating..." : "Create account"}
							</Button>
						</Flex>
					</form>
				</Box>
			</Flex>
		</AuthShell>
	);
}
