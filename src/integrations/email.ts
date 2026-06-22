import { log } from '../agent/logger.js';
import { enqueueEmail, markEmailSent, getPendingEmails } from '../database/emailQueue.js';

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'resend' | 'none';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  sendgridApiKey?: string;
  resendApiKey?: string;
  fromAddress: string;
  fromName?: string;
}

function getConfig(): EmailConfig {
  return {
    provider: (process.env.EMAIL_PROVIDER as EmailConfig['provider']) || 'none',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'agent@paithonlabs.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Paithon Labs Agent',
  };
}

export const sendEmail = async (
  to: string,
  subject: string,
  body: string,
  html?: string,
): Promise<{ ok: boolean; error?: string }> => {
  const config = getConfig();

  if (config.provider === 'none') {
    // Queue for later if no provider configured
    const id = enqueueEmail({ toAddress: to, subject, body });
    log.warn(`Email provider not configured. Queued email #${id} to ${to}`);
    return { ok: true };
  }

  try {
    if (config.provider === 'resend' && config.resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${config.fromName} <${config.fromAddress}>`,
          to,
          subject,
          text: body,
          html: html ?? `<p>${body.replace(/\n/g, '<br>')}</p>`,
        }),
      });
      if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
      log.info(`Email sent via Resend to ${to}: ${subject}`);
      return { ok: true };
    }

    if (config.provider === 'sendgrid' && config.sendgridApiKey) {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: config.fromAddress, name: config.fromName },
          subject,
          content: [{ type: 'text/plain', value: body }, ...(html ? [{ type: 'text/html', value: html }] : [])],
        }),
      });
      if (!res.ok) throw new Error(`SendGrid error: ${await res.text()}`);
      log.info(`Email sent via SendGrid to ${to}: ${subject}`);
      return { ok: true };
    }

    if (config.provider === 'smtp') {
      // SMTP requires a library like nodemailer. Since we want to avoid extra deps if possible,
      // we queue and suggest using a webhook or external service.
      const id = enqueueEmail({ toAddress: to, subject, body });
      log.warn(`SMTP requires nodemailer. Queued email #${id}. Install nodemailer or use Resend/SendGrid.`);
      return { ok: true, error: 'SMTP not implemented without nodemailer. Email queued.' };
    }

    return { ok: false, error: 'Unknown email provider' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`sendEmail failed: ${msg}`);
    return { ok: false, error: msg };
  }
};

export const sendNotification = async (to: string, title: string, message: string): Promise<void> => {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF5F1F;">${title}</h2>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;" />
      <p style="font-size: 12px; color: #888;">Enviado por Agente IA - Especialista Instagram</p>
    </div>
  `;
  await sendEmail(to, title, message, html);
};

export const processEmailQueue = async (): Promise<{ sent: number; failed: number }> => {
  const pending = getPendingEmails(50);
  let sent = 0;
  let failed = 0;

  for (const email of pending) {
    const result = await sendEmail(email.toAddress, email.subject, email.body);
    if (result.ok) {
      markEmailSent(email.id!);
      sent++;
    } else {
      markEmailSent(email.id!, result.error);
      failed++;
    }
  }

  return { sent, failed };
};
