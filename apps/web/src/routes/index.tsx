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
				{/* HERO — centré, full width */}
				<section className="hero-panel grid-noise overflow-hidden px-5 py-10 sm:px-10 sm:py-16">
					<div className="mx-auto grid max-w-3xl gap-7 text-center">
						<div
							className="flex justify-center stagger-enter"
							style={{ "--stagger-delay": "0ms" } as CSSProperties}
						>
							<div className="accent-chip">
								<span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
								pdf intake / ocr orchestration
							</div>
						</div>

						<Heading
							className="display-title stagger-enter text-5xl leading-none sm:text-7xl lg:text-8xl"
							style={{ "--stagger-delay": "90ms" } as CSSProperties}
						>
							Process dense documents without losing the thread.
						</Heading>

						<Text
							size="4"
							className="text-(--text-muted) stagger-enter"
							style={{ "--stagger-delay": "170ms" } as CSSProperties}
						>
							OCR turns upload, split, transcription and delivery into one
							focused deck — built for operational clarity over generic app
							shells.
						</Text>

						<Flex
							gap="3"
							wrap="wrap"
							justify="center"
							className="stagger-enter"
							style={{ "--stagger-delay": "250ms" } as CSSProperties}
						>
							<Link
								to={session ? "/processes" : "/login"}
								className="terminal-button"
							>
								{session ? "Open process deck" : "Login"}
							</Link>
							{session ? null : (
								<Link to="/sign-up" className="subtle-button">
									Create account
								</Link>
							)}
						</Flex>

						<div
							className="hero-divider stagger-enter"
							style={{ "--stagger-delay": "320ms" } as CSSProperties}
						/>

						{/* 3 étapes en barre horizontale */}
						<div
							className="grid gap-3 text-left sm:grid-cols-3 stagger-enter"
							style={{ "--stagger-delay": "380ms" } as CSSProperties}
						>
							<div className="metric-card">
								<p className="section-kicker m-0">Step 01</p>
								<p className="panel-title mt-2 text-base font-semibold">
									Upload
								</p>
								<p className="metric-label m-0 text-sm">
									Drop a PDF into the intake zone to open a new OCR run.
								</p>
							</div>
							<div className="metric-card">
								<p className="section-kicker m-0">Step 02</p>
								<p className="panel-title mt-2 text-base font-semibold">
									Monitor
								</p>
								<p className="metric-label m-0 text-sm">
									Track splitting, OCR and post-processing inside one dashboard.
								</p>
							</div>
							<div className="metric-card">
								<p className="section-kicker m-0">Step 03</p>
								<p className="panel-title mt-2 text-base font-semibold">
									Deliver
								</p>
								<p className="metric-label m-0 text-sm">
									Download structured archives once the pipeline completes.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* FEATURES — asymétrique : 1 grande + 2 petites */}
				<section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
					<article
						className="feature-card p-6 lg:p-8 stagger-enter"
						style={{ "--stagger-delay": "0ms" } as CSSProperties}
					>
						<p className="section-kicker m-0">Atmosphere</p>
						<Heading size="7" className="panel-title mt-3 max-w-[18ch]">
							Cockpit-inspired shell
						</Heading>
						<Text className="mt-4 block max-w-[42ch] text-(--text-muted)">
							Dense surfaces, guided highlights and monospaced utility labels
							frame the product like an operational console. Every surface has a
							purpose — no decorative noise.
						</Text>
						<div className="mt-6">
							<span className="accent-chip text-xs">
								<span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
								operational console
							</span>
						</div>
					</article>

					<div className="grid gap-4">
						<article
							className="feature-card p-5 stagger-enter"
							style={{ "--stagger-delay": "80ms" } as CSSProperties}
						>
							<p className="section-kicker m-0">Readability</p>
							<Heading size="6" className="panel-title mt-2">
								Sharper hierarchy
							</Heading>
							<Text className="mt-3 block text-(--text-muted)">
								Display for signal, mono for system cues, and stronger contrast
								for states, actions and forms.
							</Text>
						</article>
						<article
							className="feature-card p-5 stagger-enter"
							style={{ "--stagger-delay": "160ms" } as CSSProperties}
						>
							<p className="section-kicker m-0">Motion</p>
							<Heading size="6" className="panel-title mt-2">
								Deliberate entry moments
							</Heading>
							<Text className="mt-3 block text-(--text-muted)">
								Page reveals, hover lift and upload feedback are concentrated on
								the moments that matter.
							</Text>
						</article>
					</div>
				</section>
			</div>
		</Container>
	);
}
