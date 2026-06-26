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

    let prompt = `Sei un assistente per il project management. Riassumi brevemente questa scheda, evidenziando lo stato attuale e cosa manca da fare.\n\nTitolo: ${card.name}\nDescrizione: ${card.description || 'Nessuna'}\n\n`;
    
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
      prompt += "Ultimi commenti:\n";
      card.comments.forEach(c => {
        prompt += `- ${c.author?.name || 'Sconosciuto'}: ${c.text}\n`;
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Sei un assistente agile. Rispondi con un riassunto conciso in massimo 3 o 4 frasi, in italiano.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.5
    });

    const summary = response.choices[0].message.content.trim();

    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
