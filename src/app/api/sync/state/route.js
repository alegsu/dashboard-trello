import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const cards = await prisma.card.findMany({ 
      include: { assignees: true, labels: true },
      orderBy: { order: 'asc' }
    });
    
    const boards = await prisma.board.findMany({ orderBy: { name: 'asc' } });
    const lists = await prisma.list.findMany({ orderBy: { order: 'asc' } });
    const clients = await prisma.client.findMany({ 
      orderBy: { name: 'asc' },
      include: { collaborators: true }
    });

    return NextResponse.json({ cards, boards, lists, clients });
  } catch (error) {
    console.error("Sync Error:", error);
    return NextResponse.json({ error: 'Failed to sync state' }, { status: 500 });
  }
}
