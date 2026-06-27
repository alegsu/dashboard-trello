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
    const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

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

    // 0. Sincronizzazione Automatica Google Sheets
    try {
      const baseUrlSetting = await prisma.systemSetting.findUnique({ where: { key: 'BASE_URL' } });
      const baseUrl = baseUrlSetting?.value || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const csvUrlSetting = settings.find(s => s.key === 'SHEETS_CSV_URL');
      if (csvUrlSetting && csvUrlSetting.value) {
        console.log("Inizio sincronizzazione automatica Google Sheets...");
        await fetch(`${baseUrl}/api/sync/sheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvUrl: csvUrlSetting.value })
        });
        console.log("Sincronizzazione completata.");
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
            project: { include: { client: true } }
          }
        }
      }
    });

    let emailsSent = 0;

    for (const user of users) {
      if (!user.email) continue;
      if (user.notifyDailyRecap === false) continue; // Rispetta l'impostazione utente

      // Filtra le schede: ignora quelle in liste "Fatto" o "Completato"
      const todoCards = user.cards.filter(c => 
        c.list && !c.list.name.toLowerCase().includes('fatto') && !c.list.name.toLowerCase().includes('completat')
      );

      if (todoCards.length === 0) continue; // Niente da fare

      let cardsHtmlList = '';
      todoCards.forEach(c => {
        const clientName = c.project?.client?.name ? `<strong>[${c.project.client.name}]</strong> ` : '';
        cardsHtmlList += `
          <li style="margin-bottom: 10px; padding: 10px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #a1bdcf;">
            ${clientName}${c.name} <br>
            <span style="font-size: 12px; color: #64748b;">📍 ${c.list.name}</span>
          </li>`;
      });

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
        <div style="padding: 30px; color: #334155; line-height: 1.6;">
          <div style="font-size: 16px; margin-bottom: 25px; background: #f0f4f8; padding: 15px; border-radius: 8px; font-style: italic; color: #475569;">
            ${aiGreeting}
          </div>
          <h2 style="color: #0f172a; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 20px;">Le tue priorità aperte:</h2>
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${cardsHtmlList}
          </ul>
          <div style="margin-top: 30px; text-align: center;">
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
    }

    return NextResponse.json({ success: true, emailsSent });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: 'Errore durante il cronjob' }, { status: 500 });
  }
}
