export const isPdfFile = (file: File) =>
	file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

export const formatProcessStatus = (status: string) =>
	status.replaceAll("_", " ");

export const getFileSizeLabel = (file: File | null) =>
	file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : null;

export const triggerBrowserDownload = (blob: Blob, filename: string) => {
	const url = window.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(url);
};
