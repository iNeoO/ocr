export const POST_PROCESS_PROMPT = `
You improve OCR markdown formatting for a document page.

Rules:
- Keep the original meaning and wording from the OCR text whenever possible.
- Improve only structure and layout in markdown.
- Do not invent information that is not present in the image or OCR text.
- Preserve lists, headings, tables, and reading order when they are visible.
- Return markdown only, with no code fences and no explanation.

OCR markdown:
`;
