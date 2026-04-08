import { env } from "@ocr/infra/configs";
import { Resend } from "resend";
import type {
	SendMailInput,
	SendResetPasswordEmailInput,
	SendVerificationEmailInput,
} from "./mail.types.js";
import { getResetPasswordEmailTemplate } from "./templates/reset-password-email.template.js";
import { getVerificationEmailTemplate } from "./templates/verification-email.template.js";

export class MailService {
	private readonly resend: Resend;
	private readonly from: string;

	constructor() {
		this.resend = new Resend(env.RESEND_API_KEY);
		this.from = env.RESEND_FROM_EMAIL;
	}

	async send({ to, subject, html }: SendMailInput) {
		const recipient =
			env.NODE_ENV === "production" ? to : "delivered@resend.dev";

		await this.resend.emails.send({
			from: this.from,
			to: recipient,
			subject,
			html,
		});
	}

	sendVerificationEmail({ to, name, url }: SendVerificationEmailInput) {
		const template = getVerificationEmailTemplate({
			name,
			url,
		});

		return this.send({
			to,
			subject: template.subject,
			html: template.html,
		});
	}

	sendResetPasswordEmail({ to, name, url }: SendResetPasswordEmailInput) {
		const template = getResetPasswordEmailTemplate({
			name,
			url,
		});

		return this.send({
			to,
			subject: template.subject,
			html: template.html,
		});
	}
}
