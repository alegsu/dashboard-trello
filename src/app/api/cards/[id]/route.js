import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

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
    await prisma.card.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error deleting card' }, { status: 500 });
  }
}
