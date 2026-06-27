import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId mancante' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        cards: {
          include: { list: true }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Progetto non trovato' }, { status: 404 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key mancante' }, { status: 400 });
    }

    const clientName = project.client?.name || "Nessun Cliente";
    
    // Preparo il sommario dei task
    const completedTasks = project.cards.filter(c => c.list?.name.toLowerCase().includes('fatto') || c.list?.name.toLowerCase().includes('completat')).map(c => c.name);
    const todoTasks = project.cards.filter(c => !c.list?.name.toLowerCase().includes('fatto') && !c.list?.name.toLowerCase().includes('completat')).map(c => c.name);

    const prompt = `Sei l'account manager dell'agenzia web "GestionAle". Devi scrivere un breve e cordiale messaggio (da copiare su WhatsApp/Email) per aggiornare il cliente "${clientName}" sul progetto "${project.name}".
Usa un tono professionale ma amichevole.

Task Completati di recente:
${completedTasks.length > 0 ? completedTasks.map(t => '- ' + t).join('\n') : 'Nessuno.'}

Task in lavorazione / da fare:
${todoTasks.length > 0 ? todoTasks.map(t => '- ' + t).join('\n') : 'Nessuno.'}

Genera UNICAMENTE il testo del messaggio finale (niente saluti iniziali generici del bot, inizia direttamente con "Ciao [Nome/Cliente]"). Non menzionare stime in ore se non fornite. Sii sintetico e positivo.`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    const report = aiRes.choices[0].message.content.trim();

    return NextResponse.json({ report });

  } catch (error) {
    console.error("Generazione Report AI Error:", error);
    return NextResponse.json({ error: 'Errore durante la generazione' }, { status: 500 });
  }
}
