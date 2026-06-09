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

const previewProcesses = [
	{ status: "completed", name: "rapport-annuel.pdf", pages: "124 pages" },
	{ status: "running", name: "brief-q4.pdf", pages: "45 / 89" },
	{ status: "queued", name: "contrat-2024.pdf", pages: "pending" },
] as const;

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

				<Card size="4" className="auth-hero-card grid-noise p-2 sm:p-3">
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
								{/* Logo badge */}
								<div>
									<div className="inline-flex items-center gap-3 rounded-full border border-(--line-strong) bg-(--accent-soft) px-3 py-2">
										<span className="h-2.5 w-2.5 rounded-full bg-[linear-gradient(135deg,var(--accent),#ffe1c5)] shadow-[0_0_18px_rgba(249,115,22,0.65)]" />
										<span className="mono-label text-[0.7rem] tracking-[0.22em]">OCR // deck</span>
									</div>
								</div>

								{/* Mini preview du dashboard */}
								<div className="grid gap-3">
									<Text size="1" weight="bold" className="section-kicker">
										Live queue
									</Text>
									<div className="grid gap-1.5">
										{previewProcesses.map((item) => (
											<div
												key={item.name}
												className="surface-callout flex items-center gap-3 px-3 py-2"
											>
												<span
													className="status-pill shrink-0"
													data-status={item.status}
													style={{ minHeight: "auto", padding: "0.18rem 0.5rem", fontSize: "0.62rem" }}
												>
													<span className="status-dot" />
													{item.status}
												</span>
												<span className="min-w-0 flex-1 truncate text-xs text-(--text-base)">
													{item.name}
												</span>
												<span className="mono-label shrink-0 text-[0.62rem] text-(--text-faint)">
													{item.pages}
												</span>
											</div>
										))}
									</div>
								</div>

								{/* Feature bullets */}
								<div className="auth-side-list">
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text size="2">
											Stronger typography and contrast for critical actions.
										</Text>
									</div>
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text size="2">
											Real-time pipeline monitoring from the same workspace.
										</Text>
									</div>
									<div className="auth-side-item">
										<span className="auth-side-bullet" />
										<Text size="2">
											One-click download once the OCR pipeline completes.
										</Text>
									</div>
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
