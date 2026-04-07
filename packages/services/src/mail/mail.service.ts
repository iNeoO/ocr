import { env } from "@ocr/infra/configs";
import { Resend } from "resend";

import {
	getResetPasswordEmailTemplate,
} from "./templates/reset-password-email.template.js";
import {
	getVerificationEmailTemplate,
} from "./templates/verification-email.template.js";
import type {
	MailServiceOptions,
	SendMailInput,
	SendResetPasswordEmailInput,
	SendVerificationEmailInput,
} from "./mail.types.js";

export class MailService {
	private readonly resend: Resend;
	private readonly from: string;

	constructor({ apiKey, from }: MailServiceOptions) {
		this.resend = new Resend(apiKey);
		this.from = from;
	}

	async send({ to, subject, html }: SendMailInput) {
		const recipient = env.NODE_ENV === "production" ? to : "delivered@resend.dev";

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
