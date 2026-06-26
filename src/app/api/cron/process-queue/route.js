import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { sendNotificationEmail } from '@/utils/mailer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force');

    // Vercel Cron Auth
    const authHeader = request.headers.get('authorization');
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCron && force !== 'test') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Prendi tutte le notifiche in sospeso raggruppate per utente
    const pendingNotifications = await prisma.pendingNotification.findMany({
      include: { user: true },
      orderBy: { createdAt: 'asc' }
    });

    if (pendingNotifications.length === 0) {
      return NextResponse.json({ message: 'Nessuna notifica in coda' });
    }

    const groupedByUser = {};
    pendingNotifications.forEach(pn => {
      if (!groupedByUser[pn.userId]) {
        groupedByUser[pn.userId] = {
          user: pn.user,
          notifications: []
        };
      }
      groupedByUser[pn.userId].notifications.push(pn);
    });

    let emailsSent = 0;

    for (const userId in groupedByUser) {
      const group = groupedByUser[userId];
      const user = group.user;
      const notifications = group.notifications;

      if (!user.email) continue;

      let listItems = notifications.map(n => {
        const linkHtml = n.link ? ` <a href="${n.link}" style="color: #007bff; text-decoration: none;">[Vedi]</a>` : '';
        return `<li style="margin-bottom: 10px; font-size: 14px;"><strong>${n.type}:</strong> ${n.message}${linkHtml}</li>`;
      }).join('');

      const htmlEmail = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #ddd;">
            <h2 style="margin: 0; color: #007bff;">Hai nuovi aggiornamenti!</h2>
          </div>
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Ciao <strong>${user.name}</strong>,</p>
            <p style="font-size: 15px;">Ecco cosa è successo mentre non c'eri:</p>
            <ul style="background: #f1f3f5; padding: 15px 15px 15px 35px; margin: 20px 0; border-radius: 4px;">
              ${listItems}
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Vai al GestionAle</a>
            </div>
          </div>
        </div>
      `;

      const textEmail = `Ciao ${user.name},\n\nHai ${notifications.length} nuovi aggiornamenti nel gestionale.\n\nVai su ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'} per vederli.`;

      // Invia email
      const sent = await sendNotificationEmail(
        user.email,
        `Hai ${notifications.length} nuovi aggiornamenti`,
        textEmail,
        htmlEmail
      );

      if (sent) {
        emailsSent++;
      }
    }

    // 2. Elimina le notifiche in sospeso elaborate
    const processedIds = pendingNotifications.map(n => n.id);
    await prisma.pendingNotification.deleteMany({
      where: { id: { in: processedIds } }
    });

    return NextResponse.json({ success: true, emailsSent, processed: processedIds.length });
  } catch (error) {
    console.error("Process Queue Error:", error);
    return NextResponse.json({ error: 'Errore durante l\'invio delle code' }, { status: 500 });
  }
}
