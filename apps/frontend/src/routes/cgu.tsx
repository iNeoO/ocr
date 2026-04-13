import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cgu")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="page-wrap px-4 py-12 sm:py-16">
			<div className="hero-panel grid-noise rounded-[32px] px-6 py-8 sm:px-10 sm:py-12">
				<div className="flex flex-col gap-4 border-b border-(--border-strong) pb-8">
					<p className="section-kicker m-0">OCR</p>
					<h1 className="display-title m-0 max-w-[14ch] text-4xl text-(--text-strong) sm:text-5xl">
						Conditions Generales d&apos;Utilisation
					</h1>
					<p className="max-w-3xl text-sm leading-6 text-(--text-muted)">
						Date d&apos;effet : 13 avril 2026
					</p>
					<div className="flex flex-wrap gap-3">
						<Link to="/" className="subtle-button">
							Retour a l&apos;accueil
						</Link>
						<Link to="/sign-up" className="terminal-button">
							Creer un compte
						</Link>
					</div>
				</div>

				<div className="mt-8 space-y-8 text-sm leading-7 text-(--text-strong)">
					<section className="space-y-3">
						<h2 className="panel-title text-xl">1. Objet</h2>
						<p>
							OCR est un service permettant de televerser des PDF, de les
							decouper en pages, d&apos;executer une transcription OCR puis de
							mettre a disposition des fichiers structures telechargeables.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">2. Acceptation</h2>
						<p>
							L&apos;utilisation du service implique l&apos;acceptation pleine et
							entiere des presentes CGU.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">3. Acces au service</h2>
						<p>
							Le service est accessible en ligne depuis les domaines exploites
							par l&apos;editeur.
						</p>
						<p>
							L&apos;acces a certaines fonctionnalites necessite la creation
							d&apos;un compte.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">4. Creation de compte</h2>
						<p>
							L&apos;utilisateur s&apos;engage a fournir des informations exactes
							lors de son inscription, notamment son adresse email.
						</p>
						<p>
							L&apos;utilisateur est responsable de la confidentialite de ses
							identifiants et de toute activite realisee depuis son compte.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">5. Fonctionnalites</h2>
						<p>Le service permet notamment :</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>le televersement de fichiers PDF ;</li>
							<li>le decoupage automatique en pages ;</li>
							<li>la transcription OCR et le post-traitement ;</li>
							<li>le telechargement des sorties generees.</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">6. Utilisations interdites</h2>
						<p>Il est strictement interdit d&apos;utiliser OCR pour :</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>televerser des contenus illicites ;</li>
							<li>porter atteinte aux droits de tiers ;</li>
							<li>diffuser des logiciels malveillants ou du code nuisible ;</li>
							<li>
								perturber, contourner ou compromettre la securite du service.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">
							7. Suspension ou suppression d&apos;acces
						</h2>
						<p>
							L&apos;editeur se reserve le droit de suspendre ou supprimer
							l&apos;acces d&apos;un utilisateur en cas de violation des presentes
							CGU ou d&apos;usage abusif du service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">8. Disponibilite</h2>
						<p>
							Le service est fourni en l&apos;etat, sans garantie de
							disponibilite continue.
						</p>
						<p>
							L&apos;editeur peut interrompre temporairement l&apos;acces pour
							maintenance, evolution ou correction.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">9. Responsabilite</h2>
						<p>L&apos;utilisateur demeure seul responsable :</p>
						<ul className="list-disc space-y-2 pl-6 text-(--text-muted)">
							<li>des fichiers qu&apos;il televerse ;</li>
							<li>des contenus traites par le service ;</li>
							<li>de l&apos;usage qu&apos;il fait des resultats generes.</li>
						</ul>
						<p>
							L&apos;editeur ne pourra etre tenu responsable des dommages
							indirects, pertes de donnees, pertes d&apos;exploitation ou usages
							illicites realises par des utilisateurs ou des tiers.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">10. Propriete intellectuelle</h2>
						<p>Le logiciel OCR est propose comme projet open source.</p>
						<p>
							Sauf mention contraire, les elements specifiques du service,
							notamment les textes, graphismes, logos et interfaces, restent
							proteges par les droits de propriete intellectuelle applicables.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">11. Donnees personnelles</h2>
						<p>
							Le service traite notamment les donnees necessaires a la gestion
							des comptes, des documents, des traitements OCR et des fichiers
							generes.
						</p>
						<p>
							Seuls les elements strictement necessaires a
							l&apos;authentification et au fonctionnement du service peuvent etre
							utilises.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">12. Modification des CGU</h2>
						<p>
							Les presentes CGU peuvent etre modifiees a tout moment. La version
							applicable est celle publiee en ligne a la date d&apos;utilisation
							du service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="panel-title text-xl">13. Droit applicable</h2>
						<p>Les presentes CGU sont soumises au droit francais.</p>
					</section>

					<section className="space-y-3 border-t border-(--border-strong) pt-8">
						<h2 className="panel-title text-xl">14. Contact</h2>
						<p>
							Pour toute question relative au service :
							<br />
							<a
								href="mailto:contact@ocr.tuturu.io"
								className="text-[var(--accent)] hover:underline"
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
