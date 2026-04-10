import {
	Box,
	Card,
	Container,
	Flex,
	Heading,
	Link,
	Text,
} from "@radix-ui/themes";
import { Link as RouterLink } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type AuthShellProps = {
	eyebrow: string;
	title: string;
	description: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
};

export default function AuthShell({
	eyebrow,
	title,
	description,
	children,
	footer,
}: AuthShellProps) {
	return (
		<Container size="2" px="4" py={{ initial: "7", sm: "9" }}>
			<Flex direction="column" gap="6">
				<Box>
					<Link asChild size="2" underline="hover" color="gray">
						<RouterLink to="/">
							<Flex align="center" gap="2">
								<ArrowLeft size={16} />
								Back to home
							</Flex>
						</RouterLink>
					</Link>
				</Box>

				<Card size="4" className="auth-hero-card">
					<Flex direction="column" gap="6">
						<Flex direction="column" gap="2">
							<Text size="1" weight="bold" className="auth-eyebrow">
								{eyebrow}
							</Text>
							<Heading size="8" className="display-title auth-title">
								{title}
							</Heading>
							<Text size="3" color="gray" className="max-w-[48ch]">
								{description}
							</Text>
						</Flex>

						{children}
					</Flex>
				</Card>

				{footer ? (
					<Text size="2" color="gray" align="center">
						{footer}
					</Text>
				) : null}
			</Flex>
		</Container>
	);
}
