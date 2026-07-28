import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { getRunningContainer } from "./src/libs/server/container-registry";

const getAllowedHosts = (
	betterAuthUrl?: string,
	extraAllowedHosts?: string,
) => {
	const allowedHosts = ["localhost", "127.0.0.1"];

	if (betterAuthUrl) {
		try {
			allowedHosts.push(new URL(betterAuthUrl).hostname);
		} catch {
			console.warn(
				`Ignoring invalid BETTER_AUTH_URL for Vite preview.allowedHosts: ${betterAuthUrl}`,
			);
		}
	}

	if (extraAllowedHosts) {
		allowedHosts.push(
			...extraAllowedHosts
				.split(",")
				.map((host) => host.trim())
				.map((host) => {
					try {
						return new URL(host).hostname;
					} catch {
						return host;
					}
				})
				.filter(Boolean),
		);
	}

	return [...new Set(allowedHosts)];
};

/**
 * Sequences the app's resource teardown behind Vite's HTTP drain.
 *
 * `vite preview` — the container CMD — registers its own
 * `process.once("SIGTERM")` that awaits `server.close()` and then calls
 * `process.exit()`. Shutting the pools down from a competing signal handler
 * would run in parallel with that drain (in-flight requests hitting a closed
 * pool) and be truncated by the exit (pg/RabbitMQ connections abandoned
 * server-side). Wrapping `server.close` instead puts us *inside* Vite's own
 * sequence: drain first, then close resources, then Vite exits.
 *
 * Preview only: `vite dev` calls `server.close()` on config-change restarts
 * too, and killing the pools there would leave the surviving global container
 * pointing at dead clients.
 */
const gracefulShutdownPlugin = (): PluginOption => ({
	name: "ocr:graceful-shutdown",
	apply: "serve",
	configurePreviewServer: {
		order: "post",
		handler(server) {
			const closeHttpServer = server.close.bind(server);

			server.close = async () => {
				await closeHttpServer();

				// Absent when no request ever built the container — nothing to close.
				const container = getRunningContainer();
				if (!container) return;

				console.info("HTTP server closed. Releasing server resources.");
				await container.shutdown();
			};

			// Vite only handles SIGTERM. Registering SIGINT suppresses Node's default
			// terminate-on-Ctrl-C, so this handler must exit the process itself.
			process.once("SIGINT", () => {
				void server.close().finally(() => process.exit(130));
			});
		},
	},
});

const config = defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		plugins: [
			devtools(),
			tsconfigPaths({ projects: ["./tsconfig.json"] }),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
			gracefulShutdownPlugin(),
		],
		preview: {
			host: "0.0.0.0",
			port: 3010,
			allowedHosts: getAllowedHosts(
				env.BETTER_AUTH_URL,
				env.FRONTEND_ALLOWED_HOSTS,
			),
		},
	};
});

export default config;
