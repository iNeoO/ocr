import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-and-conditions")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="page-wrap px-4 py-12 sm:py-16">
			<div className="hero-panel grid-noise px-6 py-8 sm:px-10 sm:py-12">
				<div className="flex flex-col gap-4 border-b border-(--border-strong) pb-8">
					<p className="section-kicker m-0">OCR</p>
					<h1 className="display-title m-0 max-w-[14ch] text-4xl text-(--text-strong) sm:text-5xl">
						Terms of Service
					</h1>
					<p className="max-w-3xl text-sm leading-6 text-(--text-muted)">
						Effective date: April 13, 2026
					</p>
					<div className="flex flex-wrap gap-3">
						<Link to="/" className="subtle-button">
							Back to home
						</Link>
						<Link to="/sign-up" className="terminal-button">
							Create an account
						</Link>
					</div>
				</div>

				<div className="mt-8 space-y-8 text-sm leading-7 text-(--text-strong)">
					<section className="space-y-3">
						<h2 className="panel-title text-xl">1. Purpose</h2>
						<p>
							OCR is a service that allows users to upload PDF files, split them
							into pages, run OCR transcription, and download the structured
							output files.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">2. Acceptance</h2>
						<p>
							By using the service, you fully and unconditionally accept these
							Terms of Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">3. Access</h2>
						<p>
							The service is accessible online from the domains operated by the
							publisher.
						</p>
						<p>Access to certain features requires creating an account.</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">4. Account creation</h2>
						<p>
							You agree to provide accurate information when registering,
							including a valid email address.
						</p>
						<p>
							You are responsible for the confidentiality of your credentials
							and for any activity carried out from your account.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">5. Features</h2>
						<p>The service provides, in particular:</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>uploading PDF files;</li>
							<li>automatic page splitting;</li>
							<li>OCR transcription and post-processing;</li>
							<li>downloading the generated outputs.</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">6. Prohibited uses</h2>
						<p>It is strictly forbidden to use OCR to:</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>upload unlawful content;</li>
							<li>infringe on the rights of third parties;</li>
							<li>distribute malware or harmful code;</li>
							<li>
								disrupt, circumvent, or compromise the security of the service.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">
							7. Suspension or termination
						</h2>
						<p>
							The publisher reserves the right to suspend or terminate a
							user&apos;s access in the event of a breach of these Terms or
							abusive use of the service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">8. Availability</h2>
						<p>
							The service is provided as-is, without any guarantee of continuous
							availability.
						</p>
						<p>
							The publisher may temporarily interrupt access for maintenance,
							updates, or bug fixes.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">9. Liability</h2>
						<p>You remain solely responsible for:</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>the files you upload;</li>
							<li>the content processed by the service;</li>
							<li>the use you make of the generated results.</li>
						</ul>
						<p>
							The publisher cannot be held liable for indirect damages, data
							loss, business interruption, or unlawful use by users or third
							parties.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">10. Intellectual property</h2>
						<p>The OCR software is offered as an open-source project.</p>
						<p>
							Unless otherwise stated, specific elements of the service —
							including texts, graphics, logos, and interfaces — remain
							protected by applicable intellectual property rights.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">11. Personal data</h2>
						<p>
							The service processes the data necessary for account management,
							document handling, OCR processing, and the generated files.
						</p>
						<p>
							Only data strictly necessary for authentication and the operation
							of the service is used.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">12. AI processing (OpenAI)</h2>
						<p>
							As part of OCR post-processing, the service transmits uploaded
							images and extracted text to OpenAI&apos;s servers via its API, in
							order to improve formatting and output quality.
						</p>
						<p>
							By using the service, you explicitly accept that your documents
							are processed by OpenAI. This data is subject to OpenAI&apos;s
							privacy policy, available at{" "}
							<a
								href="https://openai.com/policies/privacy-policy"
								target="_blank"
								rel="noopener noreferrer"
								className="text-(--accent) hover:underline"
							>
								openai.com/policies/privacy-policy
							</a>
							.
						</p>
						<p>
							You are strongly advised not to upload documents containing
							sensitive, confidential, or personal information, as their content
							is transmitted to a third party.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">13. File retention</h2>
						<p>
							Uploaded files and generated results are automatically deleted
							after <strong>7 days</strong>. A cleanup job runs every 2 hours to
							remove expired files.
						</p>
						<p>
							You can delete your files at any time from your personal
							workspace.
						</p>
						<p>
							Upon account deletion, all associated files are removed within 30
							days.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">14. Changes to the Terms</h2>
						<p>
							These Terms may be updated at any time. The applicable version is
							the one published online at the date of use of the service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">15. Governing law</h2>
						<p>These Terms are governed by French law.</p>
					</section>

					<section className="space-y-3 border-t border-(--border-strong) pt-8">
						<h2 className="panel-title text-xl">16. Contact</h2>
						<p>
							For any questions regarding the service:
							<br />
							<a
								href="mailto:contact@ocr.tuturu.io"
								className="text-(--accent) hover:underline"
							>
								contact@ocr.tuturu.io
							</a>
						</p>
					</section>
				</div>
			</div>
		</main>
	);
}
