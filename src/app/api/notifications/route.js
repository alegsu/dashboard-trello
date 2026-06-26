import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

// Questa API recupererebbe le notifiche dell'utente loggato.
// Poiché non abbiamo un auth middleware strettissimo, passiamo il userId nella query per semplicità, 
// o assumiamo che l'app lo passi.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'UserId required' }, { status: 400 });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching notifications' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      // Mark all as read
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      if (userId) {
        await prisma.notification.updateMany({
          where: { userId, read: false },
          data: { read: true }
        });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating notification' }, { status: 500 });
  }
}
