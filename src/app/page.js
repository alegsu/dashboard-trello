import { prisma } from '@/utils/prisma';
import DashboardClient from '@/components/DashboardClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  const boards = await prisma.board.findMany({ orderBy: { name: 'asc' } });
  const lists = await prisma.list.findMany({ orderBy: { order: 'asc' } });
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
  const cards = await prisma.card.findMany({ 
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
