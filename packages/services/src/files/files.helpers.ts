import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export const fileToNodeStream = (file: File) =>
	Readable.fromWeb(file.stream() as unknown as NodeReadableStream);
