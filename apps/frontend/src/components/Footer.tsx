import { Link } from "@tanstack/react-router";

export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="px-4 pb-10 pt-16">
			<div className="page-wrap data-panel grid gap-6 rounded-[28px] px-5 py-6 sm:px-6">
				<div>
					<p className="section-kicker m-0">Optical control room</p>
					<p className="display-title mt-2 text-2xl text-(--text-strong)">
						From raw PDFs to structured output, in one dark deck.
					</p>
				</div>
				<div className="flex flex-col gap-4 text-sm text-(--text-muted)">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<Link
							to="/cgu"
							className="transition-colors hover:text-(--text-strong)"
						>
							CGU
						</Link>
						<span className="hidden text-(--border-strong) md:inline">•</span>
						<a
							href="https://github.com/ineoo"
							target="_blank"
							rel="noreferrer"
							className="transition-colors hover:text-(--text-strong)"
						>
							Made with love by ineoo
						</a>
						<span className="hidden text-(--border-strong) md:inline">•</span>
						<a
							href="https://github.com/iNeoO/ocr/issues"
							target="_blank"
							rel="noreferrer"
							className="transition-colors hover:text-(--text-strong)"
						>
							If you have any issue
						</a>
					</div>

					<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
						<div className="flex flex-col gap-2">
							<p className="m-0">&copy; {year} OCR</p>
							<p className="mono-label m-0 text-[0.68rem] tracking-[0.18em] text-(--text-faint)">
								scan / split / transcribe / deliver
							</p>
						</div>

						<a
							href="https://github.com/iNeoO/ocr"
							target="_blank"
							rel="noreferrer"
							className="transition-colors hover:text-(--text-strong)"
						>
							Source code of the application
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
