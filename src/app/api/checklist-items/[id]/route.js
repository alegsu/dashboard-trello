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

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Error updating item' }, { status: 500 });
  }
}
