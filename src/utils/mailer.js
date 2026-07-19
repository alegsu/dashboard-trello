import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export function getEmailTemplate({ title, bodyHtml, ctaLink, ctaText = "Vola su GestionAle 🚀" }) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 30px 24px; text-align: center; border-bottom: 4px solid #3b82f6;">
        <h1 style="color: #f8fafc; margin: 0; font-size: 28px; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">Gestion<span style="color: #3b82f6;">Ale</span> ✨</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 8px; margin-bottom: 0;">Il tuo assistente di produttività preferito</p>
      </div>
      <div style="padding: 32px 24px; background-color: #ffffff;">
        <h2 style="color: #0f172a; font-size: 22px; margin-top: 0; margin-bottom: 20px;">${title}</h2>
        <div style="color: #475569; font-size: 16px; line-height: 1.6;">
          ${bodyHtml}
        </div>
        ${ctaLink ? `
        <div style="margin-top: 36px; text-align: center;">
          <a href="${ctaLink}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); transition: all 0.2s;">${ctaText}</a>
        </div>
        ` : ''}
      </div>
      <div style="background-color: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0;">
        🤖 Beep boop! Questo è un messaggio automatico da Roger e dal team di GestionAle.<br>Non c'è bisogno di rispondere a questa email, ma ti auguriamo un'ottima giornata lavorativa! ☕
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
