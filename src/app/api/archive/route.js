import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET() {
  try {
    const archivedBoards = await prisma.board.findMany({ where: { isArchived: true } });
    const archivedLists = await prisma.list.findMany({ where: { isArchived: true } });
    const archivedCards = await prisma.card.findMany({ where: { isArchived: true } });
    const archivedProjects = await prisma.project.findMany({ where: { isArchived: true } });

    return NextResponse.json({
      boards: archivedBoards,
      lists: archivedLists,
      cards: archivedCards,
      projects: archivedProjects
    });
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero archivio' }, { status: 500 });
  }
}
