import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force');

    // Auth: Consenti se è cron di Vercel, o se force=test/true, o se c'è autorizzazione
    const authHeader = request.headers.get('authorization');
    const userAgent = request.headers.get('user-agent') || '';
    const isCron = (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) || 
                   userAgent.includes('vercel-cron') || 
                   userAgent.includes('cron') ||
                   request.headers.get('x-vercel-cron') === '1';

    if (!isCron && force !== 'test' && force !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Recupero SMTP
    const settings = await prisma.systemSetting.findMany();
    const config = {};
    settings.forEach(s => { config[s.key] = s.value; });

    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      return NextResponse.json({ error: 'SMTP non configurato' }, { status: 400 });
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key mancante' }, { status: 400 });
    }

    const baseUrlSetting = await prisma.systemSetting.findUnique({ where: { key: 'BASE_URL' } });
    let baseUrl = baseUrlSetting?.value || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));
    baseUrl = baseUrl.replace('https://https://', 'https://').replace('http://https://', 'https://');

    // 0. Sincronizzazione Automatica Google Sheets
    try {
      const csvUrlSetting = settings.find(s => s.key === 'SHEETS_CSV_URL');
      if (csvUrlSetting && csvUrlSetting.value) {
        console.log("Inizio sincronizzazione automatica Google Sheets in background...");
        fetch(`${baseUrl}/api/sync/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvUrl: csvUrlSetting.value })
        }).catch(e => console.error(e));
      }
    } catch(e) {
      console.error("Errore durante l'auto-sync di Google Sheets:", e);
    }

    // 2. Recupero Utenti e Schede Assegnate da fare
    const users = await prisma.user.findMany({
      include: {
        cards: {
          include: {
            list: true,
            labels: true,
            checklists: { include: { items: true } },
            project: { include: { client: true } }
          }
        }
      }
    });

    let emailsSent = 0;
    let whatsappSent = 0;

    const promises = users.map(async (user) => {
      if (!user.email) return;
      if (user.notifyDailyRecap === false) return; // Rispetta l'impostazione utente

      // Calcolo date (Fuso Orario Roma)
      const nowRomeStr = new Date().toLocaleString("en-US", {timeZone: "Europe/Rome"});
      const romeNow = new Date(nowRomeStr);
      romeNow.setHours(0,0,0,0);

      const romeTomorrow = new Date(romeNow);
      romeTomorrow.setDate(romeTomorrow.getDate() + 1);

      const romeDayAfterTomorrow = new Date(romeNow);
      romeDayAfterTomorrow.setDate(romeDayAfterTomorrow.getDate() + 2);

      // Filtra le schede: ignora quelle in liste "Fatto" o "Completato" e filtra per scadenza
      const todayCards = [];
      const tomorrowCards = [];

      user.cards.forEach(c => {
        if (!c.list || c.list.name.toLowerCase().includes('fatto') || c.list.name.toLowerCase().includes('completat')) return;
        if (!c.due) return;

        const dueRomeStr = new Date(c.due).toLocaleString("en-US", {timeZone: "Europe/Rome"});
        const romeDue = new Date(dueRomeStr);
        const daysOverdue = (romeNow - romeDue) / (1000 * 60 * 60 * 24);

        if (daysOverdue > 14) return; // Ignore cards overdue by more than 14 days

        if (romeDue < romeTomorrow) {
          todayCards.push(c);
        } else if (romeDue >= romeTomorrow && romeDue < romeDayAfterTomorrow) {
          tomorrowCards.push(c);
        }
      });

      if (todayCards.length === 0 && tomorrowCards.length === 0) return; // Niente da fare

      const renderCard = (c) => {
        const clientName = c.project?.client?.name ? `<strong style="color: #0f172a;">[${c.project.client.name}]</strong> ` : '';
        let labelsHtml = '';
        if (c.labels && c.labels.length > 0) {
          labelsHtml = c.labels.map(l => `<span style="background-color:${l.color}; color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:4px;">${l.name}</span>`).join('');
          labelsHtml = `<div style="margin-bottom: 4px;">${labelsHtml}</div>`;
        }
        const dueFormatted = new Date(c.due).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        const dueRomeStr = new Date(c.due).toLocaleString("en-US", {timeZone: "Europe/Rome"});
        const romeDueForCheck = new Date(dueRomeStr);
        const isOverdue = romeDueForCheck < romeNow;
        const dueColor = isOverdue ? 'color: #ef4444; font-weight: bold;' : 'color: #64748b;';
        
        const clientNotes = c.project?.client?.notes ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px; border-left: 2px solid #cbd5e1; padding-left: 6px;"><em>Note Cliente:</em> ${c.project.client.notes}</div>` : '';
        const cardDescription = c.description ? `<div style="font-size: 12px; color: #475569; margin-top: 6px;">📝 ${c.description}</div>` : '';
        
        let checklistsHtml = '';
        if (c.checklists && c.checklists.length > 0) {
          c.checklists.forEach(cl => {
            const pendingItems = cl.items.filter(i => !i.isCompleted);
            if (pendingItems.length > 0) {
              checklistsHtml += `<div style="font-size: 12px; color: #475569; margin-top: 6px;"><strong>☑️ ${cl.title}:</strong><ul style="margin-top: 2px; padding-left: 16px; margin-bottom: 2px;">`;
              pendingItems.forEach(i => {
                checklistsHtml += `<li>${i.text}</li>`;
              });
              checklistsHtml += `</ul></div>`;
            }
          });
        }

        return `
          <li style="margin-bottom: 10px; padding: 10px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #a1bdcf;">
            <div style="margin-bottom: 4px; font-size: 14px; font-weight: 500;">${clientName}${c.name}</div>
            ${labelsHtml}
            <div style="font-size: 12px; color: #64748b;">
              📍 ${c.list.name} &nbsp;|&nbsp; 🗓 <span style="${dueColor}">Scadenza: ${dueFormatted}</span>
            </div>
            ${cardDescription}
            ${checklistsHtml}
            ${clientNotes}
          </li>`;
      };

      let cardsHtmlList = '';
      if (todayCards.length > 0) {
        cardsHtmlList += `<h3 style="color: #ef4444; font-size: 16px; margin-top: 5px; margin-bottom: 10px;">🔴 In scadenza oggi (o scadute)</h3>`;
        cardsHtmlList += todayCards.map(renderCard).join('');
      }
      if (tomorrowCards.length > 0) {
        cardsHtmlList += `<h3 style="color: #f59e0b; font-size: 16px; margin-top: 15px; margin-bottom: 10px;">🟡 In scadenza domani</h3>`;
        cardsHtmlList += tomorrowCards.map(renderCard).join('');
      }

      const prompt = `Sei 'Roger', la mascotte canina (un cane felice e laborioso) dell'agenzia "GestionAle". Scrivi UNICAMENTE un brevissimo messaggio motivazionale del buongiorno (max 2 frasi) per ${user.name}, con un tono super simpatico, energico ed informale (aggiungi un "Woof!" o emoji a tema cane). Non includere saluti finali.`;

      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });

      const aiGreeting = aiRes.choices[0].message.content.trim();

      const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 20px; text-align: center; border-bottom: 4px solid #3b82f6;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">Gestion<span style="color: #3b82f6;">Ale</span> 🚀</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #0f172a; margin-top: 0; display: flex; align-items: center; gap: 10px;">
            <span>Buongiorno, ${user.name}! ☕</span>
          </h2>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; border: 2px dashed #cbd5e1; margin-bottom: 20px;">
            <p style="color: #334155; font-size: 15px; line-height: 1.6; font-style: italic; margin: 0;">
              🐾 <strong>Roger dice:</strong> "${aiGreeting}"
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 15px;">Le tue missioni di oggi:</h2>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${cardsHtmlList}
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}" style="background-color: #3b82f6; color: #ffffff; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);">Vola in Bacheca 🚀</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Ricevi questa email perché sei un campione di produttività (e hai le notifiche attive).<br>
          Puoi disattivarle dal tuo Profilo in GestionAle.
        </div>
      </div>`;

      // 1. Invio Notifica WhatsApp (se l'utente ha un numero e le credenziali sono presenti)
      const waPhoneId = config.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const waToken = config.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

      if (user.phone && waPhoneId && waToken) {
        try {
          const cleanPhone = user.phone.replace(/[^0-9]/g, '');
          
          // Costruisci il sommario compatto su singola riga (richiesto da Meta per i template)
          const taskItems = [];
          if (todayCards.length > 0) {
            taskItems.push(`🔴 Oggi: ${todayCards.map(c => (c.project?.client?.name ? `[${c.project.client.name}] ` : '') + c.name).join(', ')}`);
          }
          if (tomorrowCards.length > 0) {
            taskItems.push(`🟡 Domani: ${tomorrowCards.map(c => (c.project?.client?.name ? `[${c.project.client.name}] ` : '') + c.name).join(', ')}`);
          }
          const summaryParam = taskItems.join(' | ') || 'Nessun task urgente in scadenza.';

          // Prova prima con il Template WhatsApp approvato "daily_brief" (consegna sempre, anche fuori dalla finestra 24h)
          let waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
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
                      { type: 'text', parameter_name: 'nome', text: user.name || 'Collaboratore' },
                      { type: 'text', parameter_name: 'riassunto', text: summaryParam }
                    ]
                  }
                ]
              }
            })
          });

          // Se il template dovesse fallire, fallback al messaggio di testo libero
          if (!waRes.ok) {
            const errTemplate = await waRes.text();
            console.warn(`Template non riuscito, tento messaggio testo libero per ${user.name}:`, errTemplate);

            let waMessage = `☀️ *Buongiorno ${user.name}!* ☕\n\n🐾 _Roger dice:_ "${aiGreeting}"\n\n`;
            if (todayCards.length > 0) {
              waMessage += `🔴 *In scadenza oggi (o scadute):*\n`;
              todayCards.forEach(c => {
                const clName = c.project?.client?.name ? `[${c.project.client.name}] ` : '';
                waMessage += `• *${clName}${c.name}*\n`;
              });
              waMessage += `\n`;
            }
            if (tomorrowCards.length > 0) {
              waMessage += `🟡 *In scadenza domani:*\n`;
              tomorrowCards.forEach(c => {
                const clName = c.project?.client?.name ? `[${c.project.client.name}] ` : '';
                waMessage += `• *${clName}${c.name}*\n`;
              });
              waMessage += `\n`;
            }
            waMessage += `🚀 Apri la bacheca: ${baseUrl}`;

            waRes = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${waToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: { body: waMessage }
              })
            });
          }

          if (!waRes.ok) {
            const errBody = await waRes.text();
            console.error(`Errore risposta Meta invio recap WhatsApp a ${user.name} (${cleanPhone}):`, errBody);
          } else {
            whatsappSent++;
            console.log(`📱 WhatsApp Daily Recap inviato con successo a ${user.name} (${cleanPhone})`);
          }
        } catch (waErr) {
          console.error(`Errore invio WhatsApp recap a ${user.name}:`, waErr);
        }
      }

      // 2. Invio Email via SMTP
      try {
        await transporter.sendMail({
          from: `"GestionAle AI" <${config.SMTP_USER}>`,
          to: user.email,
          subject: `Buongiorno ${user.name}! Ecco il tuo Recap di oggi 🚀`,
          html: htmlEmail
        });
        emailsSent++;
      } catch (mailErr) {
        console.error(`Errore invio email recap a ${user.name} (${user.email}):`, mailErr);
      }
    });

    await Promise.all(promises);

    // Salva il log dell'ultimo invio nel database
    const logData = {
      lastRun: new Date().toISOString(),
      emailsSent,
      whatsappSent
    };

    try {
      await prisma.systemSetting.upsert({
        where: { key: 'DAILY_RECAP_LOG' },
        update: { value: JSON.stringify(logData) },
        create: { key: 'DAILY_RECAP_LOG', value: JSON.stringify(logData) }
      });
    } catch (dbErr) {
      console.error("Errore salvataggio DAILY_RECAP_LOG:", dbErr);
    }

    return NextResponse.json({ success: true, emailsSent, whatsappSent, log: logData });
  } catch (error) {
    console.error("Errore CRON daily-recap:", error);
    return NextResponse.json({ error: 'Errore durante il cronjob: ' + error.message, stack: error.stack }, { status: 500 });
  }
}
