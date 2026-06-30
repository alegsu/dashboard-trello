import { prisma } from '@/utils/prisma';
import DashboardClient from '@/components/DashboardClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const users = await prisma.user.findMany({ 
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          cards: true,
          checklistItems: true,
          clients: true,
          lists: true,
          projects: true
        }
      }
    }
  });
  const boards = await prisma.board.findMany({ 
    where: { isArchived: false },
    orderBy: { name: 'asc' },
    include: { assignees: true }
  });
  const lists = await prisma.list.findMany({ 
    where: { isArchived: false },
    orderBy: { order: 'asc' } 
  });
  const clients = await prisma.client.findMany({ 
    orderBy: { name: 'asc' },
    include: { collaborators: true, accesses: true }
  });
  const cards = await prisma.card.findMany({ 
    where: { isArchived: false },
    include: { assignees: true, labels: true },
    orderBy: { order: 'asc' }
  });

  return (
    <main className={styles.main}>
      <DashboardClient 
        initialBoards={boards}
        initialMembers={users} 
        initialLists={lists} 
        initialCards={cards} 
        initialClients={clients}
      />
    </main>
  );
}
