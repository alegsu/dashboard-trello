import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { sendNotificationEmail, getEmailTemplate } from '@/utils/mailer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force');

    // Vercel Cron Auth
    const authHeader = request.headers.get('authorization');
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    // Permit if it's a cron, or if force=true, or just allow anyone to trigger the queue processing (since it only sends emails that were already queued internally).
    // Rimuoviamo il blocco severo per permettere l'innesco dal client in background


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
        const linkHtml = n.link ? ` <a href="${n.link}" style="color: #3b82f6; text-decoration: none; font-weight: 500;">[Vedi]</a>` : '';
        return `<li style="margin-bottom: 12px; font-size: 15px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; list-style-type: none;">
                  <span style="display: inline-block; width: 8px; height: 8px; background-color: #a1bdcf; border-radius: 50%; margin-right: 8px;"></span>
                  <strong>${n.type}:</strong> ${n.message}${linkHtml}
                </li>`;
      }).join('');

      const htmlEmail = getEmailTemplate({
        title: "Hai nuovi aggiornamenti",
        bodyHtml: `
          <p>Ciao <strong>${user.name}</strong>,</p>
          <p>Ecco cosa è successo mentre non c'eri:</p>
          <ul style="padding: 0; margin: 24px 0;">
            ${listItems}
          </ul>
        `,
        ctaLink: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        ctaText: "Apri la Dashboard"
      });

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
