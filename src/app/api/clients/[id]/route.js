import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.notebookLmUrl !== undefined && { notebookLmUrl: body.notebookLmUrl }),
        ...(body.notes !== undefined && { notes: body.notes })
      }
    });

    return NextResponse.json(updatedClient);
  } catch (err) {
    return NextResponse.json({ error: 'Errore durante aggiornamento cliente' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Errore durante eliminazione cliente' }, { status: 500 });
  }
}
