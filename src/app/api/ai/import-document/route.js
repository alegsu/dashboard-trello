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
    const clientId = formData.get('clientId');

    if (!file) {
      return NextResponse.json({ error: 'Nessun file fornito.' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Nessun prompt fornito.' }, { status: 400 });
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
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser(this, 1);
      extractedText = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
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
Sei un assistente AI specializzato in project management.
Devi analizzare il seguente documento e strutturarlo in una bacheca Kanban.
Segui attentamente queste istruzioni dell'utente:
"${prompt}"

Ecco il contenuto del documento:
---
${extractedText}
---

Restituisci ESCLUSIVAMENTE un JSON valido, senza blocchi di codice markdown (niente \`\`\`json).
Il JSON deve avere questa struttura esatta:
{
  "boardName": "Nome generato per la bacheca",
  "labels": [
    { "name": "Bug", "color": "#ef4444" },
    { "name": "Feature", "color": "#3b82f6" }
  ],
  "lists": [
    {
      "name": "Nome Lista (es. Da Fare)",
      "cards": [
        {
          "name": "Titolo Task",
          "description": "Descrizione dettagliata...",
          "labelNames": ["Bug"], // Nomi delle etichette da applicare (devono essere presenti in "labels")
          "checklists": [
            {
              "title": "Cose da controllare",
              "items": ["Item 1", "Item 2"]
            }
          ]
        }
      ]
    }
  ]
}
Nota: "labels", "labelNames" e "checklists" sono opzionali, inseriscili solo se utili e coerenti col documento e con le istruzioni dell'utente. Cerca di dedurre e categorizzare i task nel miglior modo possibile.
`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: 0.2,
    });

    let rawText = aiRes.choices[0].message.content.trim();
    if (rawText.startsWith('```json')) rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    else if (rawText.startsWith('```')) rawText = rawText.replace(/```/g, '').trim();

    let boardData;
    try {
      boardData = JSON.parse(rawText);
    } catch (e) {
      console.error("Failed to parse AI JSON:", rawText);
      return NextResponse.json({ error: 'L\'AI non ha restituito un formato JSON valido.' }, { status: 500 });
    }

    if (!boardData.boardName || !boardData.lists) {
      return NextResponse.json({ error: 'La struttura generata dall\'AI non è conforme.' }, { status: 500 });
    }

    // Inserimento su Database
    const newBoard = await prisma.board.create({
      data: {
        name: boardData.boardName,
        clientId: clientId && clientId !== 'none' ? clientId : null,
      }
    });

    const labelMap = {}; // name -> id
    if (boardData.labels && boardData.labels.length > 0) {
      for (const lbl of boardData.labels) {
        const created = await prisma.label.create({
          data: {
            name: lbl.name,
            color: lbl.color || '#3b82f6',
            boardId: newBoard.id
          }
        });
        labelMap[lbl.name] = created.id;
      }
    }

    let listOrder = 0;
    for (const list of boardData.lists) {
      const newList = await prisma.list.create({
        data: {
          name: list.name,
          boardId: newBoard.id,
          order: listOrder++
        }
      });

      let cardOrder = 0;
      for (const card of (list.cards || [])) {
        const newCardData = {
          name: card.name,
          description: card.description || '',
          listId: newList.id,
          boardId: newBoard.id,
          order: cardOrder++
        };
        
        if (clientId && clientId !== 'none') {
          newCardData.clientId = clientId;
        }

        const newCard = await prisma.card.create({ data: newCardData });

        // Connetti le etichette
        if (card.labelNames && card.labelNames.length > 0) {
          const labelIds = card.labelNames
            .map(name => labelMap[name])
            .filter(id => id); // Rimuove eventuali undefined
            
          if (labelIds.length > 0) {
            await prisma.card.update({
              where: { id: newCard.id },
              data: {
                labels: { connect: labelIds.map(id => ({ id })) }
              }
            });
          }
        }

        // Crea le checklist
        if (card.checklists && card.checklists.length > 0) {
          let clOrder = 0;
          for (const cl of card.checklists) {
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
      }
    }

    return NextResponse.json({ success: true, boardId: newBoard.id });

  } catch (error) {
    console.error("Import Document Error:", error);
    return NextResponse.json({ error: `Errore durante l'importazione: ${error.message}` }, { status: 500 });
  }
}
