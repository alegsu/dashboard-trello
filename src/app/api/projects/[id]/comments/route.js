import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import { processMentions } from '@/utils/mentions';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const comments = await prisma.projectComment.findMany({
      where: { projectId: id },
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching comments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { text, authorId, baseUrl } = await request.json(); // Passiamo il baseUrl dal frontend

    if (!text || !authorId) {
      return NextResponse.json({ error: 'Missing text or authorId' }, { status: 400 });
    }

    const comment = await prisma.projectComment.create({
      data: {
        text,
        projectId: id,
        authorId
      },
      include: { author: true }
    });

    const project = await prisma.project.findUnique({ where: { id }});
    const link = `${baseUrl || ''}/?view=projects&project=${id}`;

    // Processa Menzioni!
    await processMentions(text, authorId, link, `Progetto: ${project?.name || 'Sconosciuto'}`);

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Error creating comment' }, { status: 500 });
  }
}
