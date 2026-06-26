import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');
  if (!boardId) return NextResponse.json({ error: 'boardId required' }, { status: 400 });

  try {
    const labels = await prisma.label.findMany({ where: { boardId } });
    return NextResponse.json(labels);
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching labels' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, color, boardId } = await request.json();
    if (!name || !color || !boardId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const newLabel = await prisma.label.create({
      data: { name, color, boardId }
    });
    return NextResponse.json(newLabel, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating label' }, { status: 500 });
  }
}
