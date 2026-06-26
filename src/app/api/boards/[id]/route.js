import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

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

    if (body.name !== undefined) {
      const updatedBoard = await prisma.board.update({
        where: { id },
        data: { name: body.name }
      });
      return NextResponse.json(updatedBoard);
    }

    return NextResponse.json({ error: 'Nessun dato valido da aggiornare' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Errore durante l\'aggiornamento della bacheca' }, { status: 500 });
  }
}
