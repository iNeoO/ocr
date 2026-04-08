export type SendMailInput = {
	to: string;
	subject: string;
	html: string;
};

export type SendVerificationEmailInput = {
	to: string;
	name?: string | null;
	url: string;
};

export type SendResetPasswordEmailInput = {
	to: string;
	name?: string | null;
	url: string;
};
