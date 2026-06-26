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

export async function POST(request) {
  try {
    const { name, listId, boardId, order, assignees } = await request.json();
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

    if (assignees && assignees.length > 0) {
      data.assignees = {
        connect: assignees.map(id => ({ id }))
      };
    }

    const newCard = await prisma.card.create({
      data,
      include: { assignees: true, labels: true }
    });
    return NextResponse.json(newCard, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating card' }, { status: 500 });
  }
}
