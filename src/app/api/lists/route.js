import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');
  
  if (!boardId) {
    return NextResponse.json({ error: 'boardId required' }, { status: 400 });
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
    include: { assignees: true }
  });
  return NextResponse.json(lists);
}

export async function POST(request) {
  try {
    const { name, boardId, order } = await request.json();
    if (!name || !boardId) return NextResponse.json({ error: 'Name and boardId required' }, { status: 400 });

    const newList = await prisma.list.create({
      data: { name, boardId, order: order || 0 }
    });
    return NextResponse.json(newList, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating list' }, { status: 500 });
  }
}
