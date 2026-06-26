import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // allow updating name, startDate, endDate
    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.startDate !== undefined && { startDate: body.startDate }),
        ...(body.endDate !== undefined && { endDate: body.endDate }),
        ...(body.isArchived !== undefined && { isArchived: body.isArchived }),
      }
    });
    
    return NextResponse.json(updatedList);
  } catch (err) {
    console.error('Error updating list:', err);
    return NextResponse.json({ error: 'Error updating list' }, { status: 500 });
  }
}
