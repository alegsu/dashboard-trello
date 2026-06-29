import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    // Check if clientIds are provided to update relationships
    let updateData = { ...data };
    delete updateData.clientIds;
    delete updateData.clients; // ensure nested objects aren't directly passed

    if (data.clientIds) {
      updateData.clients = {
        set: data.clientIds.map(clientId => ({ id: clientId }))
      };
    }

    const updatedAccess = await prisma.access.update({
      where: { id },
      data: updateData,
      include: {
        clients: true
      }
    });

    return NextResponse.json(updatedAccess);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update access' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.access.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete access' }, { status: 500 });
  }
}
