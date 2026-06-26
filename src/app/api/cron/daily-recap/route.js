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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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

      let cardsText = `Ecco le schede aperte di ${user.name}:\n\n`;
      todoCards.forEach(c => {
        const clientName = c.project?.client?.name ? `[${c.project.client.name}] ` : '';
        cardsText += `- ${clientName}${c.name} (Lista: ${c.list.name})\n`;
      });

      const prompt = `Sei l'assistente virtuale dell'agenzia "GestionAle". Genera un'email in HTML per ${user.name} come Recap mattutino.
Sii cordiale, motivante e professionale, usando un tono energico. L'email deve riassumere le sue attività aperte (mostrate sotto).
Formatta l'email in HTML pulito, usa grassetti per i nomi dei task, e saluta calorosamente.

${cardsText}`;

      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });

      let htmlEmail = aiRes.choices[0].message.content;
      if (htmlEmail.startsWith('```html')) {
        htmlEmail = htmlEmail.replace(/```html/g, '').replace(/```/g, '');
      }

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
