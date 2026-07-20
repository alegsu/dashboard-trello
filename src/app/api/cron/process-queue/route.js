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

    const processedUserIds = [];

    for (const userId in groupedByUser) {
      const group = groupedByUser[userId];
      const user = group.user;
      const notifications = group.notifications;

      if (!user.email) {
        processedUserIds.push(userId); // We process them (by dropping)
        continue;
      }

      // Rate Limiting: Massimo 1 email ogni 3 ore
      if (user.lastNotificationEmailSentAt) {
        const orePassate = (Date.now() - new Date(user.lastNotificationEmailSentAt).getTime()) / (1000 * 60 * 60);
        if (orePassate < 3) {
          // Non sono ancora passate 3 ore, saltiamo l'invio e lasciamo in coda
          continue;
        }
      }

      // URL di base
      const baseUrlSetting = await prisma.systemSetting.findUnique({ where: { key: 'BASE_URL' } });
      let BASE_URL = baseUrlSetting?.value || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));
      BASE_URL = BASE_URL.replace('https://https://', 'https://').replace('http://https://', 'https://');
      if (BASE_URL.endsWith('/')) BASE_URL = BASE_URL.slice(0, -1);

      const typeMap = {
        'CARD_ADD': '📌 Nuova Scheda',
        'ASSIGN': '👤 Assegnazione',
        'ASSIGN_TASK': '✅ Assegnazione Task',
        'MENTION': '💬 Menzione',
        'BOARD_UPDATE': '📋 Bacheca',
      };

      let listItems = notifications.map(n => {
        const fullLink = n.link ? (n.link.startsWith('/') ? BASE_URL + n.link : BASE_URL + '/' + n.link) : '';
        const linkHtml = fullLink ? ` <a href="${fullLink}" style="color: #3b82f6; text-decoration: none; font-weight: 500; font-size: 13px; margin-left: 8px;">Vai alla scheda ➔</a>` : '';
        const badgeStr = typeMap[n.type] || n.type;
        
        return `<li style="margin-bottom: 16px; font-size: 15px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9; list-style-type: none;">
                  <div style="margin-bottom: 6px;"><span style="display: inline-block; background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${badgeStr}</span></div>
                  <div style="color: #1e293b; line-height: 1.5;">${n.message}${linkHtml}</div>
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
        ctaLink: BASE_URL,
        ctaText: "Apri la Bacheca"
      });

      const textEmail = `Ciao ${user.name},\n\nHai ${notifications.length} nuovi aggiornamenti nel gestionale.\n\nVai su ${BASE_URL} per vederli.`;

      // RACE CONDITION FIX: Eliminiamo SUBITO le notifiche dal database.
      // Se deleteMany restituisce 0, significa che un'altra richiesta concorrente le ha già prese.
      const idsToDelete = notifications.map(n => n.id);
      const { count } = await prisma.pendingNotification.deleteMany({
        where: { id: { in: idsToDelete } }
      });

      if (count === 0) {
        continue; // Un'altra esecuzione le ha già elaborate
      }

      // Invia email
      const sent = await sendNotificationEmail(
        user.email,
        `Hai ${notifications.length} nuovi aggiornamenti`,
        textEmail,
        htmlEmail
      );

      processedUserIds.push(userId);

      if (sent) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastNotificationEmailSentAt: new Date() }
        });
      }
    }

    let emailsSent = processedUserIds.length;

    return NextResponse.json({ success: true, emailsSent, processedUsers: processedUserIds.length });
  } catch (error) {
    console.error("Process Queue Error:", error);
    return NextResponse.json({ error: 'Errore durante l\'invio delle code' }, { status: 500 });
  }
}
