type EmailShellInput = {
	title: string;
	eyebrow: string;
	intro: string;
	buttonLabel: string;
	buttonUrl: string;
	notice: string;
	greeting: string;
};

export const getEmailShellTemplate = ({
	title,
	eyebrow,
	intro,
	buttonLabel,
	buttonUrl,
	notice,
	greeting,
}: EmailShellInput) => {
	return `
		<!doctype html>
		<html lang="fr">
			<body style="margin:0;padding:0;background-color:#050816;color:#d1d7e8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;background-color:#050816;">
					<tr>
						<td align="center" style="padding:32px 16px;">
							<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:620px;border-collapse:collapse;">
								<tr>
									<td style="padding:0 0 16px 0;font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#ff9e58;">
										OCR / ${eyebrow}
									</td>
								</tr>
								<tr>
									<td style="background-color:#0d1224;border:1px solid rgba(255,158,88,0.24);border-radius:24px;padding:32px;box-shadow:0 12px 34px rgba(1,6,20,0.3);">
										<div style="margin:0 0 18px 0;font-size:14px;line-height:22px;color:#d1d7e8;">
											${greeting}
										</div>
										<h1 style="margin:0 0 14px 0;font-size:28px;line-height:34px;font-weight:700;color:#f3eee7;">
											${title}
										</h1>
										<p style="margin:0 0 24px 0;font-size:15px;line-height:24px;color:#95a0ba;">
											${intro}
										</p>
										<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px 0;">
											<tr>
												<td align="center" bgcolor="#ff9e58" style="border-radius:999px;">
													<a href="${buttonUrl}" style="display:inline-block;padding:14px 22px;font-size:14px;line-height:20px;font-weight:700;color:#1d2030;text-decoration:none;border-radius:999px;background-color:#ff9e58;">
														${buttonLabel}
													</a>
												</td>
											</tr>
										</table>
										<div style="margin:0 0 22px 0;padding:14px 16px;border-radius:16px;background-color:rgba(255,158,88,0.08);border:1px solid rgba(255,158,88,0.16);font-size:13px;line-height:21px;color:#d1d7e8;">
											${notice}
										</div>
										<p style="margin:0 0 10px 0;font-size:13px;line-height:21px;color:#65708b;">
											Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
										</p>
										<p style="margin:0;font-size:13px;line-height:21px;word-break:break-all;">
											<a href="${buttonUrl}" style="color:#ff9e58;text-decoration:underline;">${buttonUrl}</a>
										</p>
									</td>
								</tr>
								<tr>
									<td style="padding:18px 8px 0 8px;font-size:12px;line-height:20px;color:#65708b;text-align:center;">
										Interface OCR Tuturu
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</body>
		</html>
	`;
};
