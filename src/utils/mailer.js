import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export async function sendNotificationEmail(to, subject, text) {
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

    const info = await transporter.sendMail({
      from: `"Gestionale Notifiche" <${config.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    console.log('Email sent: ' + info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
