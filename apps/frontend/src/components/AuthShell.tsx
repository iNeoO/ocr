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
		<Container size="4" px="4" py={{ initial: "7", sm: "9" }}>
			<Flex direction="column" gap="6">
				<Box>
					<Link asChild size="2" underline="hover" color="gray">
						<RouterLink to="/">
							<Flex align="center" gap="2" className="mono-label text-[0.68rem] tracking-[0.16em]">
								<ArrowLeft size={16} />
								Back to command deck
							</Flex>
						</RouterLink>
					</Link>
				</Box>

				<Card size="4" className="auth-hero-card grid-noise rounded-[28px] p-2 sm:p-3">
					<div className="auth-grid">
						<div className="auth-form-block">
							<Flex direction="column" gap="6">
								<Flex direction="column" gap="2">
									<Text size="1" weight="bold" className="section-kicker">
										{eyebrow}
									</Text>
									<Heading size="8" className="display-title auth-title text-5xl sm:text-6xl">
										{title}
									</Heading>
									<Text size="3" className="eyebrow-copy">
										{description}
									</Text>
								</Flex>

								{children}
							</Flex>
						</div>

						<div className="auth-side-block">
							<Flex direction="column" justify="between" gap="6" height="100%">
								<Flex direction="column" gap="3">
									<Text size="1" weight="bold" className="section-kicker">
										Deck notes
									</Text>
									<Text className="display-title text-3xl text-(--text-strong)">
										High-contrast flows built for focused document work.
									</Text>
									<Text className="text-(--text-muted)">
										Every auth screen now inherits the same cockpit layout,
										atmospheric background and clearer hierarchy.
									</Text>
								</Flex>

								<div className="auth-side-list">
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text>
											Stronger typography and contrast for critical actions.
										</Text>
									</div>
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text>
											Consistent form surfaces, states and recovery messages.
										</Text>
									</div>
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text>
											No API changes, only presentation and shell structure.
										</Text>
									</div>
								</div>

								<div className="accent-chip">
									<span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
									secure entry surface
								</div>
							</Flex>
						</div>
					</div>
				</Card>

				{footer ? (
					<Text size="2" className="text-(--text-muted)" align="center">
						{footer}
					</Text>
				) : null}
			</Flex>
		</Container>
	);
}
