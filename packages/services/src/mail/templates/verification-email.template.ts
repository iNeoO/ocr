type VerificationEmailTemplateInput = {
	name?: string | null;
	url: string;
};

export const getVerificationEmailTemplate = ({
	name,
	url,
}: VerificationEmailTemplateInput) => {
	const greeting = name ? `Bonjour ${name},` : "Bonjour,";

	return {
		subject: "Confirmez votre adresse e-mail",
		html: `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<p>${greeting}</p>
				<p>Confirmez votre adresse e-mail pour finaliser votre inscription.</p>
				<p>
					<a href="${url}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
						Confirmer mon adresse e-mail
					</a>
				</p>
				<p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
			</div>
		`,
	};
};
