import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { sourceId, targetId } = await request.json();
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'sourceId e targetId obbligatori' }, { status: 400 });
    }

    // Sposta le card
    await prisma.card.updateMany({
      where: { clientId: sourceId },
      data: { clientId: targetId }
    });

    // Sposta i progetti
    await prisma.project.updateMany({
      where: { clientId: sourceId },
      data: { clientId: targetId }
    });

    // Elimina il client obsoleto
    await prisma.client.delete({
      where: { id: sourceId }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Errore durante fusione clienti' }, { status: 500 });
  }
}
