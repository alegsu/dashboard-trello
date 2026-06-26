import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { cardId } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'Missing cardId' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Chiave API OpenAI mancante. Aggiungi OPENAI_API_KEY nel pannello di Vercel o nel file .env locale.' 
      }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        comments: { include: { author: true }, orderBy: { createdAt: 'desc' }, take: 30 },
        checklists: { include: { items: true } }
      }
    });

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    const openai = new OpenAI({ apiKey });

    let prompt = `Analizza questa scheda e fornisci un riassunto chiaro dello stato dei lavori. Tieni in altissima considerazione sia la Descrizione principale che gli Ultimi Commenti, integrando queste informazioni con lo stato delle checklist per capire a che punto siamo.\n\nTitolo: ${card.name}\nDescrizione: ${card.description || 'Nessuna'}\n\n`;
    
    if (card.checklists.length > 0) {
      prompt += "Checklists:\n";
      card.checklists.forEach(cl => {
        prompt += `- ${cl.title}:\n`;
        cl.items.forEach(item => {
          prompt += `  * [${item.isCompleted ? 'X' : ' '}] ${item.text}\n`;
        });
      });
      prompt += "\n";
    }

    if (card.comments.length > 0) {
      prompt += "Ultimi commenti (dal più recente al più vecchio):\n";
      card.comments.forEach(c => {
        prompt += `- ${c.author?.name || 'Sconosciuto'}: ${c.text}\n`;
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sei un brillante project manager. Produci un riassunto discorsivo di 3-5 frasi (in italiano). Il riassunto DEVE sintetizzare la situazione basandosi su Descrizione e Commenti, spiegando a che punto siamo e le prossime azioni.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.5
    });

    const summary = response.choices[0].message.content.trim();

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
