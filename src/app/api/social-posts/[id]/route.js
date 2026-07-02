import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, status, notes, type } = body;

    const dataToUpdate = {};
    if (date) dataToUpdate.date = new Date(date);
    if (status) dataToUpdate.status = status;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (type) dataToUpdate.type = type;

    const updatedPost = await prisma.socialPost.update({
      where: { id },
      data: dataToUpdate,
      include: { client: true, assignees: true, comments: { include: { author: true } } }
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error('Error updating social post:', error);
    return NextResponse.json({ error: 'Failed to update social post' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.socialPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social post:', error);
    return NextResponse.json({ error: 'Failed to delete social post' }, { status: 500 });
  }
}
