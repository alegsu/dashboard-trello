import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      where: { isArchived: false },
      include: {
        cards: {
          include: {
            list: true,
            board: true,
            assignees: true,
            checklists: {
              include: { 
                items: {
                  include: { assignees: true }
                } 
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { 
      name, clientName, description, clientId, newClientName,
      status, category, priority, dueDate, estimatedHours, actualHours,
      sellingPrice, budget, effort, driveFolderId, notes 
    } = await request.json();
    
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let finalClientId = clientId || null;
    let finalClientName = clientName || null;

    if (newClientName) {
      const newClient = await prisma.client.create({ data: { name: newClientName } });
      finalClientId = newClient.id;
      finalClientName = newClient.name;
    } else if (clientId && clientId !== 'none') {
      const existingClient = await prisma.client.findUnique({ where: { id: clientId } });
      if (existingClient) finalClientName = existingClient.name;
    } else if (clientId === 'none') {
      finalClientId = null;
      finalClientName = null;
    }

    const newProject = await prisma.project.create({
      data: { 
        name, 
        clientName: finalClientName, 
        description, 
        clientId: finalClientId,
        status: status || "In Coda",
        category,
        priority: priority || "Normale",
        ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        actualHours: actualHours ? parseFloat(actualHours) : null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        budget: budget ? parseFloat(budget) : null,
        effort: effort ? parseFloat(effort) : null,
        driveFolderId,
        notes
      }
    });
    return NextResponse.json(newProject, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error creating project' }, { status: 500 });
  }
}
