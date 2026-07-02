import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force');

    // Vercel Cron Auth
    const authHeader = request.headers.get('authorization');
    const isCron = (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) || request.headers.get('user-agent')?.includes('vercel-cron');

    if (!isCron && force !== 'test') {
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
    const baseUrl = baseUrlSetting?.value || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));

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

      const prompt = `Sei l'assistente virtuale dell'agenzia "GestionAle". Scrivi UNICAMENTE un breve messaggio motivazionale di buongiorno (massimo 2-3 frasi) per ${user.name}, con un tono energico e professionale. Non includere saluti finali o liste di task, solo l'introduzione.`;

      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });

      const aiGreeting = aiRes.choices[0].message.content.trim();

      const htmlEmail = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-bottom: 4px solid #a1bdcf;">
          <img src="https://raw.githubusercontent.com/alegsu/dashboard-trello/main/public/logo.png" alt="ShinyUp" style="height: 40px; margin-bottom: 10px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;"><span style="color: #a1bdcf;">Gestion</span>Ale</h1>
        </div>
        <div style="padding: 30px;">
          <h2 style="color: #0f172a; margin-top: 0;">Buongiorno, ${user.name}! ☕</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.6; font-style: italic; background-color: #f1f5f9; padding: 15px; border-radius: 6px;">
            "${aiGreeting}"
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;">
          <h2 style="color: #0f172a; font-size: 18px; margin-bottom: 15px;">Le tue priorità aperte:</h2>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${cardsHtmlList}
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${baseUrl}" style="background-color: #a1bdcf; color: #0f172a; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Apri GestionAle</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Ricevi questa email perché hai attivato le notifiche giornaliere in GestionAle.<br>
          Puoi disattivarle in qualsiasi momento dal tuo Profilo.
        </div>
      </div>`;

      await transporter.sendMail({
        from: `"GestionAle AI" <${config.SMTP_USER}>`,
        to: user.email,
        subject: `Buongiorno ${user.name}! Ecco il tuo Recap di oggi 🚀`,
        html: htmlEmail
      });

      emailsSent++;
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, emailsSent });
  } catch (error) {
    console.error("Errore CRON daily-recap:", error);
    return NextResponse.json({ error: 'Errore durante il cronjob: ' + error.message, stack: error.stack }, { status: 500 });
  }
}
