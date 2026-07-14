import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { del } from '@vercel/blob';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.isArchived !== undefined) {
      // Soft-delete la bacheca
      const updatedBoard = await prisma.board.update({
        where: { id },
        data: { isArchived: body.isArchived }
      });

      // Opzionale: potremmo voler archiviare a cascata liste e schede
      // Se si archivia la bacheca, archiviamo anche tutto il contenuto.
      // Se si de-archivia, de-archiviamo tutto.
      await prisma.list.updateMany({
        where: { boardId: id },
        data: { isArchived: body.isArchived }
      });
      await prisma.card.updateMany({
        where: { boardId: id },
        data: { isArchived: body.isArchived }
      });

      return NextResponse.json(updatedBoard);
    }

    if (body.name !== undefined || body.color !== undefined || body.type !== undefined || body.assignees !== undefined) {
      const updateData = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.type !== undefined) updateData.type = body.type;
      
      if (body.assignees !== undefined) {
        // body.assignees should be an array of user IDs
        updateData.assignees = {
          set: body.assignees.map(id => ({ id }))
        };
      }

      const updatedBoard = await prisma.board.update({
        where: { id },
        data: updateData,
        include: { assignees: true }
      });
      return NextResponse.json(updatedBoard);
    }

    return NextResponse.json({ error: 'Nessun dato valido da aggiornare' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento della bacheca' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Trova tutte le schede della bacheca
    const cards = await prisma.card.findMany({ where: { boardId: id }, select: { id: true } });
    const cardIds = cards.map(c => c.id);

    if (cardIds.length > 0) {
      // Trova tutti gli allegati di queste schede
      const attachments = await prisma.attachment.findMany({
        where: { cardId: { in: cardIds } }
      });

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
    }

    // Delete all cards in this board first (cascades to checklists, comments, attachments in DB)
    await prisma.card.deleteMany({ where: { boardId: id } });
    // Delete all lists in this board
    await prisma.list.deleteMany({ where: { boardId: id } });
    // Delete all labels in this board
    await prisma.label.deleteMany({ where: { boardId: id } });
    // Delete the board itself
    await prisma.board.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ error: 'Errore durante l\'eliminazione della bacheca' }, { status: 500 });
  }
}
