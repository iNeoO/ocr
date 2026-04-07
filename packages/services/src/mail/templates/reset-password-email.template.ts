type ResetPasswordEmailTemplateInput = {
	name?: string | null;
	url: string;
};

export const getResetPasswordEmailTemplate = ({
	name,
	url,
}: ResetPasswordEmailTemplateInput) => {
	const greeting = name ? `Bonjour ${name},` : "Bonjour,";

	return {
		subject: "Réinitialisez votre mot de passe",
		html: `
			<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
				<p>${greeting}</p>
				<p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
				<p>
					<a href="${url}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">
						Réinitialiser mon mot de passe
					</a>
				</p>
				<p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
			</div>
		`,
	};
};
