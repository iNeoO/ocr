import { getLoggerStore } from "@ocr/infra/libs";
import { chat, streamToText } from "@tanstack/ai";
import { openaiText } from "@tanstack/ai-openai";
import { POST_PROCESS_PROMPT } from "./llm.prompt.js";
import type { RefinePageMarkdownInput } from "./llm.type.js";

export class LlmService {
	async refinePageMarkdown({
		imageBuffer,
		currentMarkdown,
	}: RefinePageMarkdownInput) {
		const start = Date.now();
		const stream = chat({
			adapter: openaiText("gpt-4.1-mini"),
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							content: `${POST_PROCESS_PROMPT}${currentMarkdown}`,
						},
						{
							type: "image",
							source: {
								type: "data",
								value: Buffer.from(imageBuffer).toString("base64"),
								mimeType: "image/png",
							},
						},
					],
				},
			],
		});

		const text = await streamToText(stream);
		const duration = Date.now() - start;
		const logger = getLoggerStore();
		logger.info({ duration }, "Page markdown refined");
		return text;
	}
}
