import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    const { cardId } = await request.json();

    if (!cardId) {
      return NextResponse.json({ error: 'cardId mancante' }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        project: { include: { client: true } },
      }
    });

    if (!card) {
      return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key mancante' }, { status: 400 });
    }

    const clientName = card.project?.client?.name || "Interno";
    const projectName = card.project?.name || "Nessun Progetto";

    const prompt = `Sei un esperto project manager di un'agenzia web. 
Il tuo compito è generare una checklist logica passo-passo per completare questa attività.

Cliente: ${clientName}
Progetto: ${projectName}
Titolo Task: ${card.name}
Descrizione Task: ${card.description || 'Nessuna descrizione.'}

Restituisci ESCLUSIVAMENTE un JSON array di stringhe, dove ogni stringa è un passaggio della checklist.
Esempio:
[
  "Recuperare gli accessi FTP",
  "Scaricare il backup del database",
  "Aggiornare i plugin"
]
Non aggiungere markdown come \`\`\`json. Solo l'array nudo e crudo.`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    let rawText = aiRes.choices[0].message.content.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/```/g, '').trim();
    }

    let items;
    try {
      items = JSON.parse(rawText);
      if (!Array.isArray(items)) throw new Error("Not an array");
    } catch (e) {
      console.error("Failed to parse AI checklist JSON:", rawText);
      return NextResponse.json({ error: 'Formato AI non valido' }, { status: 500 });
    }

    // Crea la checklist nel database
    const newChecklist = await prisma.checklist.create({
      data: {
        name: 'AI: Piano di Lavoro',
        cardId: card.id,
        items: {
          create: items.map((text, index) => ({
            text,
            isCompleted: false,
            order: index
          }))
        }
      },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json(newChecklist);

  } catch (error) {
    console.error("Generazione Checklist AI Error:", error);
    return NextResponse.json({ error: 'Errore durante la generazione' }, { status: 500 });
  }
}
