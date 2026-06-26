import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { projectId } = await request.json();
    if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Chiave API OpenAI mancante. Aggiungi OPENAI_API_KEY nel pannello di Vercel o nel file .env locale.' 
      }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        comments: { include: { author: true }, orderBy: { createdAt: 'desc' }, take: 30 },
        cards: { 
          include: { list: true },
          where: { isArchived: false }
        }
      }
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const openai = new OpenAI({ apiKey });

    let prompt = `Analizza questo progetto e fornisci un riassunto chiaro dello stato dei lavori. Tieni in altissima considerazione la Descrizione, le Note Interne e gli Ultimi Commenti, integrando queste informazioni con lo stato e l'elenco dei task per capire a che punto siamo.\n\nTitolo: ${project.name}\nStato: ${project.status || 'Nessuno'}\nPriorità: ${project.priority || 'Normale'}\nDescrizione: ${project.description || 'Nessuna'}\nNote Interne: ${project.notes || 'Nessuna'}\n\n`;
    
    if (project.cards.length > 0) {
      prompt += "Task del Progetto:\n";
      project.cards.forEach(c => {
        prompt += `- [Lista: ${c.list?.name || 'Sconosciuta'}] ${c.name}\n`;
      });
      prompt += "\n";
    }

    if (project.comments.length > 0) {
      prompt += "Ultimi commenti (dal più recente al più vecchio):\n";
      project.comments.forEach(c => {
        prompt += `- ${c.author?.name || 'Sconosciuto'}: ${c.text}\n`;
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sei un brillante project manager. Produci un riassunto discorsivo di 3-5 frasi (in italiano). Il riassunto DEVE sintetizzare la situazione del progetto basandosi su Descrizione, Note Interne, Commenti e i Task collegati, spiegando a che punto siamo e le prossime azioni.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.5
    });

    const summary = response.choices[0].message.content.trim();

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('Error in AI project summary:', err);
    return NextResponse.json({ error: 'Errore durante la generazione del riassunto del progetto' }, { status: 500 });
  }
}
