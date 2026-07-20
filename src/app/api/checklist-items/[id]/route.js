import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { sendNotificationEmail } from '@/utils/mailer';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    let oldAssigneeIds = [];
    const oldEntity = await prisma.checklistItem.findUnique({ where: { id }, include: { assignees: true } });
    if (oldEntity) {
      oldAssigneeIds = oldEntity.assignees.map(a => a.id);
    }
    
    const updateData = { ...data };
    
    // Rimuovi campi non presenti nello schema DB
    delete updateData.baseUrl;
    delete updateData.authorId;
    
    if (data.isCompleted !== undefined) {
      updateData.completedAt = data.isCompleted ? new Date() : null;
      if (data.isCompleted && data.authorId) {
        updateData.completedById = data.authorId;
      } else if (!data.isCompleted) {
        updateData.completedById = null;
      }
    }
    
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
        for (const user of usersToNotify) {
          if (user.email && user.notifyAssignedCard !== false) {
            await prisma.pendingNotification.create({
              data: {
                userId: user.id,
                type: "ASSIGN_TASK",
                message: `Ti è stato assegnato il task "${updated.text}"`,
                link: data.baseUrl ? `${data.baseUrl}/?card=${updated.checklist?.card?.id || ''}` : `/?card=${updated.checklist?.card?.id || ''}`
              }
            });
          }
        }
      }
    }

    if (data.isCompleted === true && oldEntity && !oldEntity.isCompleted) {
      const checklist = await prisma.checklist.findUnique({
        where: { id: oldEntity.checklistId },
        include: { card: { include: { assignees: true } } }
      });
      if (checklist && checklist.card && checklist.card.assignees) {
        const authorId = data.authorId;
        for (const user of checklist.card.assignees) {
          if (authorId && user.id === authorId) continue;
          await prisma.notification.create({
            data: {
              userId: user.id,
              message: `✅ Il task "${updated.text}" è stato completato nella scheda "${checklist.card.name}"`,
              link: data.baseUrl ? `${data.baseUrl}/?card=${checklist.card.id}` : `/?card=${checklist.card.id}`
            }
          });
        }
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
            data: { listId: targetList.id, completedAt: new Date() }
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Error updating item' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.checklistItem.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json({ error: "Failed to delete checklist item" }, { status: 500 });
  }
}
