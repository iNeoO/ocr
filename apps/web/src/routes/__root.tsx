import { Theme } from "@radix-ui/themes";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	type ErrorComponentProps,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { type CSSProperties, useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { ToastProvider } from "../components/toast/ToastProvider";
import {
	type AuthSession,
	getSession,
	sessionQueryKey,
} from "../libs/api/auth";
import "../styles.css";

interface RouterContext {
	session: AuthSession | null;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async ({ context }) => {
		try {
			const session = await getSession();
			context.queryClient.setQueryData(sessionQueryKey, session);
			return {
				session,
			};
		} catch (error) {
			// Fail closed: a session we cannot read is a session we do not trust, so
			// the app renders logged out. That means a transient Redis or Postgres
			// blip looks like a sign-out to the user — deliberate, but it has to stay
			// visible in the logs.
			//
			// `beforeLoad` runs on both sides. On the server the cause is already an
			// `op: auth.getSession` error line from `withServerErrorLogging`, and
			// `console` would only add an unstructured duplicate to the same pino
			// stream. The browser has no such log, so keep the trace there.
			if (typeof document !== "undefined") {
				console.error("Failed to load session", error);
			}

			context.queryClient.setQueryData(sessionQueryKey, null);
			return {
				session: null,
			};
		}
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "OCR",
			},
		],
	}),
	shellComponent: RootDocument,
	errorComponent: RootErrorBoundary,
	notFoundComponent: NotFoundPage,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="font-sans antialiased wrap-anywhere">
				<Theme
					accentColor="orange"
					grayColor="slate"
					radius="large"
					scaling="100%"
					appearance="inherit"
				>
					<ToastProvider>
						<div className="app-shell min-h-screen">
							<Header />
							{children}
							<Footer />
						</div>
					</ToastProvider>
				</Theme>
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="page-wrap px-4 py-14 sm:py-20">
			<div className="hero-panel grid-noise  px-6 py-10 sm:px-10 sm:py-14">
				<p className="section-kicker mb-3 stagger-enter">404</p>
				<h1
					className="display-title glow-line m-0 text-4xl sm:text-5xl stagger-enter"
					style={{ "--stagger-delay": "80ms" } as CSSProperties}
				>
					Page not found
				</h1>
				<p
					className="mt-4 max-w-[48ch] text-(--text-muted) stagger-enter"
					style={{ "--stagger-delay": "140ms" } as CSSProperties}
				>
					The page you requested does not exist or is no longer available.
				</p>
				<Link
					to="/"
					className="terminal-button mt-8 stagger-enter"
					style={{ "--stagger-delay": "200ms" } as CSSProperties}
				>
					Go back home
				</Link>
			</div>
		</main>
	);
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
	useEffect(() => {
		console.error("[CLIENT ERROR]:", error);
	}, [error]);

	const message =
		error instanceof Error
			? error.message
			: "An unexpected error occurred. Please try again.";

	return (
		<main className="page-wrap px-4 py-14 sm:py-20">
			<div className="hero-panel grid-noise  px-6 py-10 sm:px-10 sm:py-14">
				<p className="section-kicker mb-3 stagger-enter">Error</p>
				<h1
					className="display-title glow-line m-0 text-4xl sm:text-5xl stagger-enter"
					style={{ "--stagger-delay": "80ms" } as CSSProperties}
				>
					Something went wrong
				</h1>
				<p
					className="mt-4 max-w-[56ch] text-(--text-muted) stagger-enter"
					style={{ "--stagger-delay": "140ms" } as CSSProperties}
				>
					{message}
				</p>
				<div
					className="mt-8 flex flex-wrap gap-3 stagger-enter"
					style={{ "--stagger-delay": "200ms" } as CSSProperties}
				>
					<button type="button" onClick={reset} className="terminal-button">
						Try again
					</button>
					<Link to="/" className="subtle-button">
						Go home
					</Link>
				</div>
			</div>
		</main>
	);
}
