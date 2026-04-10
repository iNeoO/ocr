import { Theme } from "@radix-ui/themes";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import Footer from "../components/Footer";
import Header from "../components/Header";
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
			console.log(error);
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
			<body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(249,115,22,0.22)]">
				<Theme
					accentColor="orange"
					grayColor="sage"
					radius="large"
					scaling="100%"
					appearance="inherit"
				>
					<Header />
					{children}
					<Footer />
				</Theme>
				<Scripts />
			</body>
		</html>
	);
}

function NotFoundPage() {
	return (
		<main className="page-wrap px-4 py-16 sm:py-24">
			<div className="island-shell rounded-4xl px-6 py-10 sm:px-10 sm:py-14">
				<p className="island-kicker mb-3">404</p>
				<h1 className="display-title m-0 text-4xl sm:text-5xl">
					Page not found
				</h1>
				<p className="mt-4 max-w-[48ch] text-(--sea-ink-soft)">
					The page you requested does not exist or is no longer available.
				</p>
				<Link
					to="/"
					className="mt-6 inline-flex rounded-full border border-(--chip-line) bg-(--chip-bg) px-4 py-2 font-semibold text-(--sea-ink) no-underline"
				>
					Go back home
				</Link>
			</div>
		</main>
	);
}
