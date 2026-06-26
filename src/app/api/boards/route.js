import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    const boards = await prisma.board.findMany({
      where: { isArchived: false },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(boards);
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero bacheche' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Il nome è obbligatorio' }, { status: 400 });

    const newBoard = await prisma.board.create({
      data: { name }
    });
    return NextResponse.json(newBoard, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione bacheca' }, { status: 500 });
  }
}
