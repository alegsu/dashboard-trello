import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Fetch the original card with all relations we want to copy
    const originalCard = await prisma.card.findUnique({
      where: { id },
      include: {
        labels: true,
        checklists: {
          include: { items: true }
        }
      }
    });

    if (!originalCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Get the max order in the list to append to the end
    const lastCard = await prisma.card.findFirst({
      where: { listId: originalCard.listId },
      orderBy: { order: 'desc' }
    });
    const newOrder = lastCard ? lastCard.order + 1024 : 1024;

    // Create the new card
    const newCard = await prisma.card.create({
      data: {
        name: `${originalCard.name} (Copia)`,
        description: originalCard.description,
        order: newOrder,
        due: originalCard.due,
        color: originalCard.color,
        listId: originalCard.listId,
        boardId: originalCard.boardId,
        projectId: originalCard.projectId,
        labels: {
          connect: originalCard.labels.map(l => ({ id: l.id }))
        },
        checklists: {
          create: originalCard.checklists.map(cl => ({
            title: cl.title,
            order: cl.order,
            items: {
              create: cl.items.map(item => ({
                text: item.text,
                isCompleted: false, // reset completion on copy
                order: item.order
              }))
            }
          }))
        }
      }
    });

    return NextResponse.json(newCard);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error copying card' }, { status: 500 });
  }
}
