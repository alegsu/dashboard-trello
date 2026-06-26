import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { title, cardId } = await request.json();
    if (!title || !cardId) return NextResponse.json({ error: 'Title and cardId required' }, { status: 400 });

    const newChecklist = await prisma.checklist.create({
      data: { title, cardId }
    });
    return NextResponse.json(newChecklist, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating checklist' }, { status: 500 });
  }
}
