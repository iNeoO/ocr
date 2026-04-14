type VerificationEmailTemplateInput = {
	name?: string | null;
	url: string;
};

import { getEmailShellTemplate } from "./email-shell.template.js";

export const getVerificationEmailTemplate = ({
	name,
	url,
}: VerificationEmailTemplateInput) => {
	const greeting = name ? `Bonjour ${name},` : "Bonjour,";

	return {
		subject: "Confirmez votre adresse e-mail",
		html: getEmailShellTemplate({
			title: "Confirmez votre adresse e-mail",
			eyebrow: "Validation",
			intro:
				"Confirmez votre adresse e-mail pour finaliser votre inscription et accéder au cockpit OCR.",
			buttonLabel: "Confirmer mon adresse e-mail",
			buttonUrl: url,
			notice:
				"Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail sans autre action.",
			greeting,
		}),
	};
};
