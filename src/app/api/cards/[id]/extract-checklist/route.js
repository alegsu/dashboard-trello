import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const cardId = id;
    
    // Controlla se la scheda esiste e prendi la descrizione
    const card = await prisma.card.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Scheda non trovata' }, { status: 404 });
    }

    if (!card.description || card.description.trim() === '') {
      return NextResponse.json({ error: 'Descrizione vuota, impossibile estrarre task.' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key mancante' }, { status: 500 });
    }

    const systemPrompt = `Sei un assistente specializzato nell'estrarre attività (to-do, task) dal testo.
Riceverai la descrizione di una scheda di un gestionale. 
Il tuo compito è individuare tutte le azioni da svolgere presenti nel testo ed estrarle come voci di una checklist.
- Riformula le voci in modo che siano chiare, concise e direttamente azionabili.
- Restituisci ESCLUSIVAMENTE un array JSON di stringhe.
- Non aggiungere markup markdown, solo l'array JSON puro, es. ["Fare X", "Chiamare Y"].
- Se non trovi nessuna azione chiara, restituisci un array vuoto [].`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Testo da analizzare:\n\n${card.description}` }
      ],
      temperature: 0.2,
    });

    let resultText = response.choices[0].message.content.trim();
    // Pulisci eventuali backtick markdown
    if (resultText.startsWith('```json')) resultText = resultText.replace(/^```json/, '');
    if (resultText.startsWith('```')) resultText = resultText.replace(/^```/, '');
    if (resultText.endsWith('```')) resultText = resultText.replace(/```$/, '');
    resultText = resultText.trim();

    const tasks = JSON.parse(resultText);

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ success: true, message: 'Nessun task trovato', tasks: [] });
    }

    // Crea la nuova checklist e aggiungi gli item nel database
    const newChecklist = await prisma.checklist.create({
      data: {
        cardId,
        title: 'Task da Descrizione',
      }
    });

    const itemsToCreate = tasks.map((taskText, index) => ({
      checklistId: newChecklist.id,
      text: taskText,
      isCompleted: false,
      order: index
    }));

    await prisma.checklistItem.createMany({
      data: itemsToCreate
    });

    // Ritorna la scheda aggiornata con le nuove checklist
    const updatedCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: true,
        labels: true,
        assignees: true,
        attachments: true,
        project: { include: { client: true } },
        checklists: {
          include: {
            items: {
              include: { assignees: true }
            }
          }
        },
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({ success: true, card: updatedCard });

  } catch (error) {
    console.error("Errore extract-checklist:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
