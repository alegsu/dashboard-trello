import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { del } from '@vercel/blob';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({
      where: { id },
      include: { 
        assignees: true, 
        labels: true,
        checklists: { include: { items: { include: { assignees: true }, orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        comments: { include: { author: true }, orderBy: { createdAt: 'desc' } }
      }
    });
    return NextResponse.json(card);
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching card' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { baseUrl, ...data } = await request.json();
    
    let oldAssigneeIds = [];
    if (data.assignees) {
      const oldEntity = await prisma.card.findUnique({ where: { id }, include: { assignees: true } });
      if (oldEntity) oldAssigneeIds = oldEntity.assignees.map(a => a.id);
    }
    
    const updateData = { ...data };
    
    if (data.assignees) {
      updateData.assignees = {
        set: data.assignees.map(userId => ({ id: userId }))
      };
    }
    if (data.labels) {
      updateData.labels = {
        set: data.labels.map(lblId => ({ id: lblId }))
      };
    }

    if (data.listId) {
      const newList = await prisma.list.findUnique({ where: { id: data.listId } });
      if (newList) {
        const isFatto = newList.name.toLowerCase().includes('fatto') || newList.name.toLowerCase().includes('completat');
        if (isFatto) {
          updateData.completedAt = new Date();
          const checklists = await prisma.checklist.findMany({ where: { cardId: id } });
          for (const cl of checklists) {
            await prisma.checklistItem.updateMany({
              where: { checklistId: cl.id, isCompleted: false },
              data: { isCompleted: true, completedAt: new Date() }
            });
          }
        } else {
          updateData.completedAt = null;
        }
      }
    }

    const updated = await prisma.card.update({
      where: { id },
      data: updateData,
      include: { assignees: true, labels: true }
    });

    // Notify newly assigned users
    if (data.assignees) {
      const addedIds = data.assignees.filter(userId => !oldAssigneeIds.includes(userId));
      if (addedIds.length > 0) {
        const usersToNotify = updated.assignees.filter(a => addedIds.includes(a.id));
        for (const user of usersToNotify) {
          if (user.email && user.notifyAssignedCard !== false) {
            await prisma.pendingNotification.create({
              data: {
                userId: user.id,
                type: "ASSIGN",
                message: `Sei stato assegnato alla scheda "${updated.name}"`,
                link: baseUrl ? `${baseUrl}/?card=${id}` : `/?card=${id}`
              }
            });
          }
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Error updating card' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Trova tutti gli allegati della scheda
    const attachments = await prisma.attachment.findMany({ where: { cardId: id } });
    
    // Elimina i blob da Vercel
    for (const att of attachments) {
      if (att.url.includes('public.blob.vercel-storage.com')) {
        try {
          await del(att.url);
        } catch (e) {
          console.error('Failed to delete blob:', e);
        }
      }
    }

    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error deleting card' }, { status: 500 });
  }
}
