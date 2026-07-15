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

    // Create the new card (without checklists initially)
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
        }
      }
    });

    // Manually create checklists and items to preserve hierarchy
    for (const cl of originalCard.checklists) {
      const newChecklist = await prisma.checklist.create({
        data: {
          title: cl.title,
          order: cl.order,
          cardId: newCard.id
        }
      });

      // We need to process items so that parents are always created before their children
      const idMap = new Map();
      let remainingItems = [...cl.items];
      
      while (remainingItems.length > 0) {
        const processable = remainingItems.filter(item => !item.parentId || idMap.has(item.parentId));
        
        // If we have items but none are processable, there's a circular dependency or dangling parentId (shouldn't happen, but safeguard to break loop)
        if (processable.length === 0) break;

        for (const item of processable) {
          const newItem = await prisma.checklistItem.create({
            data: {
              text: item.text,
              isCompleted: false, // reset completion
              order: item.order,
              dueDate: item.dueDate,
              notes: item.notes,
              checklistId: newChecklist.id,
              parentId: item.parentId ? idMap.get(item.parentId) : null
            }
          });
          idMap.set(item.id, newItem.id);
        }
        
        // Remove processed items
        remainingItems = remainingItems.filter(item => !processable.includes(item));
      }
    }

    const finalCard = await prisma.card.findUnique({
      where: { id: newCard.id },
      include: {
        labels: true,
        checklists: { include: { items: true } }
      }
    });

    return NextResponse.json(finalCard);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error copying card' }, { status: 500 });
  }
}
