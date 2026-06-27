import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.checklist.update({
      where: { id },
      data: {
        title: body.title,
        order: body.order
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.checklist.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
  }
}
