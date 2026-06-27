import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // allow updating name, startDate, endDate
    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.startDate !== undefined && { startDate: body.startDate }),
        ...(body.endDate !== undefined && { endDate: body.endDate }),
        ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
        ...(body.order !== undefined && { order: body.order }),
      }
    });
    
    return NextResponse.json(updatedList);
  } catch (err) {
    console.error('Error updating list:', err);
    return NextResponse.json({ error: 'Error updating list' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Delete all cards in this list (cascades to checklists, comments, attachments)
    await prisma.card.deleteMany({ where: { listId: id } });
    // Delete the list itself
    await prisma.list.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting list:', error);
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della lista' }, { status: 500 });
  }
}
