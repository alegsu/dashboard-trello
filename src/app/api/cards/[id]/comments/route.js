import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { processMentions } from '@/utils/mentions';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const comments = await prisma.comment.findMany({
      where: { cardId: id },
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching comments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { text, authorId, baseUrl } = await request.json();

    if (!text || !authorId) {
      return NextResponse.json({ error: 'Missing text or authorId' }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        cardId: id,
        authorId
      },
      include: { author: true }
    });

    const card = await prisma.card.findUnique({ where: { id }});
    const link = `${baseUrl || ''}/?card=${id}`;

    // Processa Menzioni!
    await processMentions(text, authorId, link, `Scheda: ${card?.name || 'Sconosciuta'}`);

    // Notifica tutti i collaboratori della bacheca
    if (card && card.boardId) {
      // Trova tutti gli utenti assegnati ad almeno una scheda o lista in questa bacheca
      const boardMembers = await prisma.user.findMany({
        where: {
          OR: [
            { cards: { some: { boardId: card.boardId } } },
            { lists: { some: { boardId: card.boardId } } }
          ]
        }
      });

      for (const member of boardMembers) {
        if (member.id !== authorId && member.email) {
          // Non duplicare le notifiche se è stato già menzionato?
          // Per semplicità inseriamo tutto in coda, l'utente vedrà "Nuovo commento" e "Sei stato menzionato"
          await prisma.pendingNotification.create({
            data: {
              userId: member.id,
              type: "BOARD_UPDATE",
              message: `${comment.author.name} ha commentato sulla scheda "${card.name}"`,
              link: link
            }
          });
        }
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating card comment:', error);
    return NextResponse.json({ error: 'Error creating comment' }, { status: 500 });
  }
}
