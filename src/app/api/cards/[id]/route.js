import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { sendNotificationEmail } from '@/utils/mailer';

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
    const data = await request.json();
    
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
        usersToNotify.forEach(user => {
          if (user.email) {
            sendNotificationEmail(user.email, 'Nuovo Task Assegnato', `Ciao ${user.name},\n\nSei stato appena assegnato al task "${updated.name}" sulla bacheca.\n\nAccedi al gestionale per vedere i dettagli.\n\nIl Team`);
          }
        });
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
