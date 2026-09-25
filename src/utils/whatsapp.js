import { prisma } from './prisma.js';

/**
 * Invia una notifica WhatsApp quando un task o una scheda viene assegnata a un utente.
 * Include una strategia multi-tier per garantire la consegna:
 * 1. Template dedicato 'nuova_assegnazione' (in approvazione Meta).
 * 2. Messaggio di testo libero (se l'utente ha scritto nelle ultime 24h).
 * 3. Template approvato 'daily_brief' come fallback garantito oltre le 24h.
 */
export async function sendWhatsAppAssignmentNotification({
  recipientUser,
  assignerName = 'Un collega',
  itemType = 'attività',
  itemTitle,
  cardId,
  contextName = '',
  baseUrl = null
}) {
  if (!recipientUser || !recipientUser.phone) {
    return { skipped: true, reason: 'Nessun numero di telefono configurato' };
  }

  // Rispetta la preferenza utente se disattivata
  if (recipientUser.notifyAssignedCard === false) {
    return { skipped: true, reason: 'Notifiche assegnazione disattivate per utente' };
  }

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'BASE_URL'] } }
    });
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });

    const phoneId = config.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = config.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !token) {
      console.warn('[WhatsApp] Credenziali non configurate in systemSetting o env');
      return { skipped: true, reason: 'Credenziali non configurate' };
    }

    let resolvedBaseUrl = baseUrl || config.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dashboard-trello.vercel.app'));
    resolvedBaseUrl = resolvedBaseUrl.replace('https://https://', 'https://').replace('http://https://', 'https://');
    if (resolvedBaseUrl.endsWith('/')) resolvedBaseUrl = resolvedBaseUrl.slice(0, -1);

    const cardLink = cardId ? `${resolvedBaseUrl}/?card=${cardId}` : resolvedBaseUrl;
    const cleanPhone = recipientUser.phone.toString().replace(/[^0-9]/g, '');

    const firstName = recipientUser.name ? recipientUser.name.split(' ')[0] : 'Collaboratore';
    const truncatedTitle = itemTitle.length > 80 ? itemTitle.substring(0, 77) + '...' : itemTitle;

    // 1. Prova prima con il template dedicato "nuova_assegnazione" (se già approvato da Meta)
    try {
      const templateRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'nuova_assegnazione',
            language: { code: 'it' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: firstName },
                  { type: 'text', text: truncatedTitle },
                  { type: 'text', text: assignerName }
                ]
              }
            ]
          }
        })
      });

      if (templateRes.ok) {
        console.log(`[WhatsApp] Notifica nuova_assegnazione inviata con successo a ${recipientUser.name} (${cleanPhone})`);
        return { success: true, method: 'template_nuova_assegnazione' };
      }
      
      const errTemplate = await templateRes.json().catch(() => ({}));
      console.warn(`[WhatsApp] Template nuova_assegnazione non disponibile (${errTemplate?.error?.message || 'status'}), procedo con messaggio testo...`);
    } catch (e) {
      console.warn('[WhatsApp] Errore template nuova_assegnazione:', e.message);
    }

    // 2. Prova con messaggio di testo libero (funziona immediatamente se l'utente ha chattato nelle ultime 24h)
    const textBody = `🔔 *Nuova Assegnazione su GestionAle* 🚀\n\nCiao ${firstName}!\nTi è stata assegnata una nuova ${itemType}:\n📋 *${itemTitle}*${contextName ? `\n🏢 ${contextName}` : ''}\n👤 Assegnata da: *${assignerName}*\n\n🔗 ${cardLink}`;

    try {
      const textRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: textBody }
        })
      });

      if (textRes.ok) {
        console.log(`[WhatsApp] Messaggio testo libero inviato con successo a ${recipientUser.name} (${cleanPhone})`);
        return { success: true, method: 'free_text' };
      }

      const errText = await textRes.json().catch(() => ({}));
      console.warn(`[WhatsApp] Testo libero non inviato (${errText?.error?.message || 'fuori 24h'}), tento con template daily_brief...`);
    } catch (e) {
      console.warn('[WhatsApp] Errore invio testo libero:', e.message);
    }

    // 3. Fallback: Usa il template approvato "daily_brief" (consegna garantita sempre da Meta anche oltre 24h)
    try {
      const summaryText = `🔔 Ti è stata assegnata una nuova ${itemType}: "${truncatedTitle}" da ${assignerName}.`;
      const briefRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'daily_brief',
            language: { code: 'it' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', parameter_name: 'nome', text: firstName },
                  { type: 'text', parameter_name: 'riassunto', text: summaryText }
                ]
              }
            ]
          }
        })
      });

      if (briefRes.ok) {
        console.log(`[WhatsApp] Notifica consegnata tramite template daily_brief a ${recipientUser.name} (${cleanPhone})`);
        return { success: true, method: 'template_daily_brief' };
      }

      const errBrief = await briefRes.json().catch(() => ({}));
      console.error(`[WhatsApp] Errore invio fallback daily_brief:`, errBrief);
      return { success: false, error: errBrief };
    } catch (e) {
      console.error('[WhatsApp] Errore invio daily_brief:', e.message);
      return { success: false, error: e.message };
    }
  } catch (error) {
    console.error('[WhatsApp] Errore generale invio notifica assegnazione:', error);
    return { success: false, error: error.message };
  }
}
