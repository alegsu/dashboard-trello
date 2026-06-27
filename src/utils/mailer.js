import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export function getEmailTemplate({ title, bodyHtml, ctaLink, ctaText = "Vai al GestionAle" }) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 4px solid #a1bdcf;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 24px; letter-spacing: 1px;">Gestion<span style="color: #a1bdcf;">Ale</span></h1>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0; margin-bottom: 16px;">${title}</h2>
        <div style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${bodyHtml}
        </div>
        ${ctaLink ? `
        <div style="margin-top: 32px; text-align: center;">
          <a href="${ctaLink}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${ctaText}</a>
        </div>
        ` : ''}
      </div>
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
        Questo è un messaggio automatico da GestionAle.<br>Non rispondere a questa email.
      </div>
    </div>
  `;
}

export async function sendNotificationEmail(to, subject, text, html = null) {
  try {
    const settings = await prisma.systemSetting.findMany();
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });

    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.log('SMTP non configurato, email ignorata.');
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: parseInt(config.SMTP_PORT || '465'),
      secure: parseInt(config.SMTP_PORT || '465') === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Gestionale Notifiche" <${config.SMTP_USER}>`,
      to,
      subject,
      text,
    };
    if (html) mailOptions.html = html;

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
