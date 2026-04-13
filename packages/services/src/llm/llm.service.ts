import { env } from "@ocr/infra/configs";
import { getLoggerStore } from "@ocr/infra/libs";
import { POST_PROCESS_PROMPT } from "./llm.prompt.js";
import type {
	OllamaChatResponse,
	RefinePageMarkdownInput,
} from "./llm.type.js";

export class LlmService {
	async refinePageMarkdown({
		imageBuffer,
		currentMarkdown,
	}: RefinePageMarkdownInput) {
		const logger = getLoggerStore();
		const response = await fetch(new URL("/api/chat", env.LLM_URL), {
			method: "POST",
			signal: AbortSignal.timeout(env.LLM_TIMEOUT_MS),
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: env.LLM_MODEL,
				stream: true,
				messages: [
					{
						role: "user",
						content: `${POST_PROCESS_PROMPT}${currentMarkdown}`,
						images: [Buffer.from(imageBuffer).toString("base64")],
					},
				],
			}),
		});

		if (!response.ok) {
			logger.error(
				{ status: response.status, statusText: response.statusText },
				"LLM request failed",
			);
			throw new Error(`LLM request failed with status ${response.status}`);
		}

		if (!response.body) {
			throw new Error("LLM response body is empty");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffered = "";
		let refinedMarkdown = "";

		while (true) {
			const { value, done } = await reader.read();
			if (done) {
				break;
			}

			buffered += decoder.decode(value, { stream: true });
			const lines = buffered.split("\n");
			buffered = lines.pop() ?? "";

			for (const line of lines) {
				const trimmedLine = line.trim();
				if (!trimmedLine) {
					continue;
				}

				const payload = JSON.parse(trimmedLine) as OllamaChatResponse & {
					done?: boolean;
				};
				if (payload.error) {
					throw new Error(payload.error);
				}

				refinedMarkdown += payload.message?.content ?? "";
			}
		}

		if (buffered.trim()) {
			const payload = JSON.parse(buffered.trim()) as OllamaChatResponse;
			if (payload.error) {
				throw new Error(payload.error);
			}
			refinedMarkdown += payload.message?.content ?? "";
		}

		refinedMarkdown = refinedMarkdown.trim();
		if (!refinedMarkdown) {
			throw new Error("LLM returned empty markdown content");
		}

		return refinedMarkdown;
	}
}
