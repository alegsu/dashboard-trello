import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const prompt = formData.get('prompt');
    const listId = formData.get('listId');
    const boardId = formData.get('boardId');

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito.' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Nessun prompt fornito.' }, { status: 400 });
    }
    
    if (!listId || !boardId) {
      return NextResponse.json({ error: 'Lista o Bacheca di destinazione non fornita.' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API Key mancante' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let extractedText = '';

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileName.endsWith('.xlsx')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = xlsx.utils.sheet_to_json(sheet);
      extractedText = JSON.stringify(json, null, 2);
    } else if (fileName.endsWith('.csv')) {
      const records = csvParse(buffer, { columns: true, skip_empty_lines: true });
      extractedText = JSON.stringify(records, null, 2);
    } else if (fileName.endsWith('.txt')) {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Formato file non supportato.' }, { status: 400 });
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ error: 'Nessun testo estratto dal file o file vuoto.' }, { status: 400 });
    }

    // Limita il testo per evitare di superare i token (es. max 40k caratteri)
    if (extractedText.length > 40000) {
      extractedText = extractedText.substring(0, 40000) + '... [Testo troncato]';
    }

    const aiPrompt = `
Sei un estrattore di dati fedele. Il tuo compito è leggere il documento fornito e strutturarne i contenuti in una SINGOLA scheda Kanban con relative checklist, in base alle istruzioni dell'utente.

ATTENZIONE REGOLA FONDAMENTALE:
NON DEVI ASSOLUTAMENTE INVENTARE NULLA. NON inserire task generici (come "fare le valigie", "prenotare", "organizzare") se non sono ESPRESSAMENTE scritti nel documento. Limitati ESCLUSIVAMENTE a estrarre, raggruppare e formattare i dati reali presenti nel testo.

Istruzioni dell'utente:
"${prompt}"

Documento:
---
${extractedText}
---

Restituisci ESCLUSIVAMENTE un JSON valido, senza blocchi di codice markdown (niente \`\`\`json).
Il JSON deve avere QUESTA struttura esatta per una singola scheda:
{
  "name": "Titolo riassuntivo della scheda",
  "description": "Una breve descrizione basata sul documento",
  "checklists": [
    {
      "title": "Titolo del raggruppamento (es. Nome Regione o Categoria)",
      "items": ["Voce 1 estratta dal testo", "Voce 2 estratta dal testo"]
    }
  ]
}
Nota: "checklists" è opzionale. Se le istruzioni richiedono solo un testo, mettilo in "description" e lascia vuota la lista delle checklist. Se crei checklist, inserisci solo elementi PRESENTI nel testo.
`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: 0.1, // Temperatura bassissima per evitare allucinazioni
    });

    let rawText = aiRes.choices[0].message.content.trim();
    if (rawText.startsWith('```json')) rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    else if (rawText.startsWith('```')) rawText = rawText.replace(/```/g, '').trim();

    let cardData;
    try {
      cardData = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse AI JSON:", rawText);
      return NextResponse.json({ error: 'L\'AI non ha restituito un formato JSON valido.' }, { status: 500 });
    }

    if (!cardData.name) {
      return NextResponse.json({ error: 'La struttura generata dall\'AI non è conforme (manca il titolo della scheda).' }, { status: 500 });
    }

    // Calcoliamo l'ordine della nuova card (la mettiamo in fondo alla lista)
    const existingCards = await prisma.card.findMany({
      where: { listId },
      orderBy: { order: 'desc' },
      take: 1
    });
    const newOrder = existingCards.length > 0 ? existingCards[0].order + 1 : 0;

    // Inserimento su Database della singola Card
    const newCard = await prisma.card.create({
      data: {
        name: cardData.name,
        description: cardData.description || '',
        listId,
        boardId,
        order: newOrder
      }
    });

    // Crea le checklist
    if (cardData.checklists && cardData.checklists.length > 0) {
      let clOrder = 0;
      for (const cl of cardData.checklists) {
        await prisma.checklist.create({
          data: {
            title: cl.title,
            cardId: newCard.id,
            order: clOrder++,
            items: {
              create: (cl.items || []).map((text, idx) => ({
                text,
                order: idx,
                isCompleted: false
              }))
            }
          }
        });
      }
    }

    return NextResponse.json({ success: true, cardId: newCard.id });

  } catch (error) {
    console.error("Import Document Error:", error);
    return NextResponse.json({ error: `Errore durante l'importazione: ${error.message}` }, { status: 500 });
  }
}
