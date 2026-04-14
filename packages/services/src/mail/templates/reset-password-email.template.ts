type ResetPasswordEmailTemplateInput = {
	name?: string | null;
	url: string;
};

import { getEmailShellTemplate } from "./email-shell.template.js";

export const getResetPasswordEmailTemplate = ({
	name,
	url,
}: ResetPasswordEmailTemplateInput) => {
	const greeting = name ? `Bonjour ${name},` : "Bonjour,";

	return {
		subject: "Réinitialisez votre mot de passe",
		html: getEmailShellTemplate({
			title: "Réinitialisez votre mot de passe",
			eyebrow: "Sécurité",
			intro:
				"Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte. Utilisez le lien ci-dessous pour définir un nouveau mot de passe.",
			buttonLabel: "Réinitialiser mon mot de passe",
			buttonUrl: url,
			notice:
				"Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail. Votre mot de passe actuel restera inchangé.",
			greeting,
		}),
	};
};
