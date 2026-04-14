import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const getAllowedHosts = (betterAuthUrl?: string) => {
	const allowedHosts = ["localhost", "127.0.0.1"];

	if (!betterAuthUrl) {
		return allowedHosts;
	}

	try {
		allowedHosts.push(new URL(betterAuthUrl).hostname);
	} catch {
		console.warn(
			`Ignoring invalid BETTER_AUTH_URL for Vite preview.allowedHosts: ${betterAuthUrl}`,
		);
	}

	return [...new Set(allowedHosts)];
};

const config = defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			devtools(),
			tsconfigPaths({ projects: ["./tsconfig.json"] }),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		],
		server: {
			proxy: {
				"/trpc": {
					target: "http://localhost:4000",
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/trpc/, ""),
				},
			},
		},
		preview: {
			host: "0.0.0.0",
			port: 3010,
			allowedHosts: getAllowedHosts(env.BETTER_AUTH_URL),
		},
	};
});

export default config;
