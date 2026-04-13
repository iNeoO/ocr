import { Theme } from "@radix-ui/themes";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import type { CSSProperties } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { ToastProvider } from "../components/toast/ToastProvider";
import { type AuthSession, getSession } from "../libs/api/auth";

import appCss from "../styles.css?url";

interface RouterContext {
	session: AuthSession | null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	beforeLoad: async () => {
		try {
			const session = await getSession();
			return {
				session,
			};
		} catch (error) {
			console.error("Failed to load session", error);
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
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
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
			<div className="hero-panel grid-noise rounded-[28px] px-6 py-10 sm:px-10 sm:py-14">
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
