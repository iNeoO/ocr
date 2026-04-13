export type RefinePageMarkdownInput = {
	imageBuffer: Uint8Array;
	currentMarkdown: string;
};

export type OllamaChatResponse = {
	message?: {
		content?: string;
	};
	error?: string;
};
