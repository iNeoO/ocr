/**
 * Key under which {@link container} publishes itself on `globalThis`.
 *
 * `vite preview` imports the built server bundle into its own process, so the
 * preview server and the container share a realm — and therefore a
 * `globalThis`. The preview shutdown hook in `vite.config.ts` reaches the live
 * container through this key rather than by importing the bundle: importing it
 * would evaluate the entry (S3 check, pools, AMQP channels) just to close it,
 * which is exactly wrong when the process is on its way out.
 *
 * This module must stay free of runtime imports — `vite.config.ts` loads it.
 */
export const SERVER_CONTAINER_KEY = "__ocrServerContainer__";

export type ShutdownableContainer = {
	shutdown: () => Promise<void>;
};

/**
 * The container instance created by the running server, if any. Returns
 * `undefined` when no request ever touched the container, so nothing gets
 * lazily built during shutdown.
 */
export const getRunningContainer = (): ShutdownableContainer | undefined =>
	(globalThis as typeof globalThis & Record<string, unknown>)[
		SERVER_CONTAINER_KEY
	] as ShutdownableContainer | undefined;
