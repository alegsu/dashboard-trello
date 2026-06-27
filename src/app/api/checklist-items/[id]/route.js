import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { sendNotificationEmail } from '@/utils/mailer';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    let oldAssigneeIds = [];
    if (data.assignees) {
      const oldEntity = await prisma.checklistItem.findUnique({ where: { id }, include: { assignees: true } });
      if (oldEntity) oldAssigneeIds = oldEntity.assignees.map(a => a.id);
    }
    
    const updateData = { ...data };
    
    // Rimuovi campi non presenti nello schema DB
    delete updateData.baseUrl;
    delete updateData.authorId;
    
    if (data.assignees) {
      updateData.assignees = {
        set: data.assignees.map(userId => ({ id: userId }))
      };
    }
    
    const updated = await prisma.checklistItem.update({
      where: { id },
      data: updateData,
      include: { assignees: true, checklist: { include: { card: true } } }
    });

    if (data.assignees) {
      const addedIds = data.assignees.filter(userId => !oldAssigneeIds.includes(userId));
      if (addedIds.length > 0) {
        const usersToNotify = updated.assignees.filter(a => addedIds.includes(a.id));
        usersToNotify.forEach(user => {
          if (user.email) {
            sendNotificationEmail(user.email, 'Nuova Task Assegnata', `Ciao ${user.name},\n\nTi è stata assegnata una nuova voce nella checklist: "${updated.text}"\n(Card: ${updated.checklist?.card?.name || 'Sconosciuta'}).\n\nAccedi al gestionale per vedere i dettagli.\n\nIl Team`);
          }
        });
      }
    }

    if (data.notes && data.baseUrl && data.authorId) {
      const { processMentions } = require('@/utils/mentions');
      const link = `${data.baseUrl}/?card=${updated.checklist?.card?.id || ''}`;
      await processMentions(data.notes, data.authorId, link, `Checklist: ${updated.text}`);
    }

    // Automazione: Se tutte le voci della scheda sono completate, spostala in "Fatto"
    if (data.isCompleted !== undefined && updated.checklist?.cardId) {
      const cardId = updated.checklist.cardId;
      const incompleteCount = await prisma.checklistItem.count({
        where: {
          checklist: { cardId: cardId },
          isCompleted: false
        }
      });

      if (incompleteCount === 0) {
        const targetList = await prisma.list.findFirst({
          where: {
            boardId: updated.checklist.card.boardId,
            OR: [
              { name: { contains: 'fatto', mode: 'insensitive' } },
              { name: { contains: 'completat', mode: 'insensitive' } }
            ]
          }
        });
        if (targetList && updated.checklist.card.listId !== targetList.id) {
          await prisma.card.update({
            where: { id: cardId },
            data: { listId: targetList.id }
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Error updating item' }, { status: 500 });
  }
}
