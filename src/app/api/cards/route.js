import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');
  if (!boardId) return NextResponse.json({ error: 'boardId required' }, { status: 400 });

  const cards = await prisma.card.findMany({
    where: { boardId, isArchived: false },
    orderBy: { order: 'asc' },
    include: { assignees: true, labels: true }
  });
  return NextResponse.json(cards);
}

import OpenAI from 'openai';

export async function POST(request) {
  try {
    const { name, listId, boardId, order, assignees, creatorId, clientId } = await request.json();
    if (!name || !listId || !boardId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    let finalOrder = order;
    if (finalOrder === undefined || finalOrder === null || finalOrder === 0) {
      const lastCard = await prisma.card.findFirst({
        where: { listId, boardId },
        orderBy: { order: 'desc' }
      });
      finalOrder = lastCard ? lastCard.order + 1000 : 1000;
    }

    const data = {
      name,
      listId,
      boardId,
      order: finalOrder
    };

    if (clientId) {
      data.clientId = clientId;
    }

    if (assignees && assignees.length > 0) {
      data.assignees = {
        connect: assignees.map(id => ({ id }))
      };
    }

    const newCard = await prisma.card.create({
      data,
      include: { assignees: true, labels: true }
    });

    // AI Feature C: Auto-Categorizer
    let finalCard = newCard;
    if (creatorId) {
      const creator = await prisma.user.findUnique({ where: { id: creatorId } });
      if (creator && creator.aiCategorizeEnabled !== false && process.env.OPENAI_API_KEY) {
        try {
          const boardLabels = await prisma.label.findMany({ where: { boardId } });
          if (boardLabels.length > 0) {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const prompt = `Analizza il nome di questo task: "${name}".
Ecco le etichette disponibili:
${boardLabels.map(l => `- ${l.name} (ID: ${l.id})`).join('\n')}

Se una o più etichette sono pertinenti al task, restituisci un JSON array contenente gli ID di quelle etichette.
Se nessuna è pertinente, restituisci un array vuoto [].
Non inventare nuovi ID. Restituisci SOLO l'array JSON (es. ["id1", "id2"]).`;

            const aiRes = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
            });

            let rawText = aiRes.choices[0].message.content.trim();
            if (rawText.startsWith('```json')) rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            else if (rawText.startsWith('```')) rawText = rawText.replace(/```/g, '').trim();

            const parsedIds = JSON.parse(rawText);
            if (Array.isArray(parsedIds) && parsedIds.length > 0) {
              const validIds = parsedIds.filter(id => boardLabels.find(l => l.id === id));
              if (validIds.length > 0) {
                finalCard = await prisma.card.update({
                  where: { id: newCard.id },
                  data: {
                    labels: { connect: validIds.map(id => ({ id })) }
                  },
                  include: { assignees: true, labels: true }
                });
              }
            }
          }
        } catch (aiErr) {
          console.error("AI Categorizer error:", aiErr);
        }
      }
    }

    // Notifica tutti i collaboratori della bacheca che è stata aggiunta una nuova scheda
    const boardMembers = await prisma.user.findMany({
      where: {
        OR: [
          { cards: { some: { boardId } } },
          { lists: { some: { boardId } } }
        ]
      }
    });

    for (const member of boardMembers) {
      if (member.email) {
        await prisma.pendingNotification.create({
          data: {
            userId: member.id,
            type: "CARD_ADD",
            message: `È stata aggiunta una nuova scheda "${name}" nella bacheca`,
            link: `/?card=${newCard.id}`
          }
        });
      }
    }

    return NextResponse.json(finalCard, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error creating card' }, { status: 500 });
  }
}
