import { Theme } from "@radix-ui/themes";
import {
	createRootRouteWithContext,
	HeadContent,
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
