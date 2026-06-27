import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    const { text, checklistId, parentId, order } = await request.json();
    if (!text || !checklistId) return NextResponse.json({ error: 'Text and checklistId required' }, { status: 400 });

    const newItem = await prisma.checklistItem.create({
      data: { 
        text, 
        checklistId,
        parentId: parentId || null,
        order: order || 0
      }
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Error creating checklist item' }, { status: 500 });
  }
}
