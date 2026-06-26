import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    let finalClientId = body.clientId;
    let finalClientName = body.clientName;

    if (body.newClientName) {
      const newClient = await prisma.client.create({ data: { name: body.newClientName } });
      finalClientId = newClient.id;
      finalClientName = newClient.name;
    } else if (body.clientId && body.clientId !== 'none') {
      const existingClient = await prisma.client.findUnique({ where: { id: body.clientId } });
      if (existingClient) finalClientName = existingClient.name;
    } else if (body.clientId === 'none') {
      finalClientId = null;
      finalClientName = null;
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(finalClientId !== undefined && { clientId: finalClientId }),
        ...(finalClientName !== undefined && { clientName: finalClientName }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : null }),
        ...(body.estimatedHours !== undefined && { estimatedHours: body.estimatedHours ? parseFloat(body.estimatedHours) : null }),
        ...(body.actualHours !== undefined && { actualHours: body.actualHours ? parseFloat(body.actualHours) : null }),
        ...(body.sellingPrice !== undefined && { sellingPrice: body.sellingPrice ? parseFloat(body.sellingPrice) : null }),
        ...(body.budget !== undefined && { budget: body.budget ? parseFloat(body.budget) : null }),
        ...(body.effort !== undefined && { effort: body.effort ? parseFloat(body.effort) : null }),
        ...(body.driveFolderId !== undefined && { driveFolderId: body.driveFolderId }),
        ...(body.notes !== undefined && { notes: body.notes }),
      }
    });
    
    return NextResponse.json(updatedProject);
  } catch (err) {
    console.error('Error updating project:', err);
    return NextResponse.json({ error: 'Error updating project' }, { status: 500 });
  }
}
