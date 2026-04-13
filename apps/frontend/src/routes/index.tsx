import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { Route as RootRoute } from "./__root";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const { session } = RootRoute.useRouteContext();

	return (
		<Container size="4" px="4" py={{ initial: "7", sm: "8" }}>
			<div className="grid gap-5">
				<section className="hero-panel grid-noise overflow-hidden rounded-[32px] px-5 py-8 sm:px-8 sm:py-10">
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
						<div className="grid gap-5">
							<div
								className="accent-chip stagger-enter"
								style={{ "--stagger-delay": "0ms" } as CSSProperties}
							>
								<span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
								pdf intake / ocr orchestration
							</div>

							<div className="stagger-enter" style={{ "--stagger-delay": "90ms" } as CSSProperties}>
								<Heading className="display-title glow-line max-w-[10ch] text-6xl leading-none sm:text-7xl">
									Process dense documents without losing the thread.
								</Heading>
							</div>

							<Text
								size="4"
								className="max-w-[58ch] text-(--text-muted) stagger-enter"
								style={{ "--stagger-delay": "170ms" } as CSSProperties}
							>
								OCR turns upload, split, transcription and delivery into one
								focused deck. The interface now leans into a darker, editorial
								workspace instead of a generic app shell.
							</Text>

							<Flex
								gap="3"
								wrap="wrap"
								className="stagger-enter"
								style={{ "--stagger-delay": "250ms" } as CSSProperties}
							>
								<Link to={session ? "/processes" : "/login"} className="terminal-button">
									{session ? "Open process deck" : "Login"}
								</Link>
								{session ? null : (
									<Link to="/sign-up" className="subtle-button">
										Create account
									</Link>
								)}
							</Flex>
						</div>

						<div className="grid gap-4">
							<div
								className="metric-card stagger-enter"
								style={{ "--stagger-delay": "120ms" } as CSSProperties}
							>
								<p className="section-kicker m-0">Flow</p>
								<p className="metric-value">01</p>
								<p className="metric-label m-0">
									Upload PDFs with a clearer drag-and-drop surface.
								</p>
							</div>
							<div
								className="metric-card stagger-enter"
								style={{ "--stagger-delay": "200ms" } as CSSProperties}
							>
								<p className="section-kicker m-0">Flow</p>
								<p className="metric-value">02</p>
								<p className="metric-label m-0">
									Track splitting, OCR and post-processing inside one dashboard.
								</p>
							</div>
							<div
								className="metric-card stagger-enter"
								style={{ "--stagger-delay": "280ms" } as CSSProperties}
							>
								<p className="section-kicker m-0">Flow</p>
								<p className="metric-value">03</p>
								<p className="metric-label m-0">
									Download structured archives once the pipeline completes.
								</p>
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-4 lg:grid-cols-3">
					<article className="feature-card rounded-[26px] p-5">
						<p className="section-kicker m-0">Atmosphere</p>
						<Heading size="6" className="panel-title mt-3">
							Cockpit-inspired shell
						</Heading>
						<Text className="mt-3 text-(--text-muted)">
							Dense surfaces, guided highlights and monospaced utility labels
							frame the product like an operational console.
						</Text>
					</article>
					<article className="feature-card rounded-[26px] p-5">
						<p className="section-kicker m-0">Readability</p>
						<Heading size="6" className="panel-title mt-3">
							Sharper hierarchy
						</Heading>
						<Text className="mt-3 text-(--text-muted)">
							Display serif for signal, mono for system cues, and stronger
							contrast for states, actions and forms.
						</Text>
					</article>
					<article className="feature-card rounded-[26px] p-5">
						<p className="section-kicker m-0">Motion</p>
						<Heading size="6" className="panel-title mt-3">
							Deliberate entry moments
						</Heading>
						<Text className="mt-3 text-(--text-muted)">
							Page reveals, hover lift and upload feedback are concentrated on
							the moments that matter instead of scattered everywhere.
						</Text>
					</article>
				</section>
			</div>
		</Container>
	);
}
