import { prisma } from '@/utils/prisma';
import ArchiveClient from '@/components/ArchiveClient';

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const archivedCards = await prisma.card.findMany({
    where: { isArchived: true },
    orderBy: { updatedAt: 'desc' }
  });

  const archivedBoards = await prisma.board.findMany({
    where: { isArchived: true },
    orderBy: { updatedAt: 'desc' }
  });

  const archivedLists = await prisma.list.findMany({
    where: { isArchived: true },
    orderBy: { updatedAt: 'desc' }
  });

  const archivedProjects = await prisma.project.findMany({
    where: { isArchived: true },
    orderBy: { updatedAt: 'desc' }
  });

  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' }
  });

  const initialArchive = {
    cards: archivedCards,
    boards: archivedBoards,
    lists: archivedLists,
    projects: archivedProjects
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <ArchiveClient initialArchive={initialArchive} clients={clients} />
    </div>
  );
}
