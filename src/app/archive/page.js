import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import styles from './Archive.module.css';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export default async function ArchivePage() {
  const archivedCards = await prisma.card.findMany({
    where: { isArchived: true },
    include: { board: true, list: true },
    orderBy: { name: 'asc' }
  });

  async function restoreCard(formData) {
    "use server";
    const id = formData.get('id');
    if (id) {
      await prisma.card.update({
        where: { id },
        data: { isArchived: false }
      });
      revalidatePath('/archive');
      revalidatePath('/');
      redirect('/');
    }
  }

  async function deleteCard(formData) {
    "use server";
    const id = formData.get('id');
    if (id) {
      await prisma.card.delete({
        where: { id }
      });
      revalidatePath('/archive');
      redirect('/archive');
    }
  }

  return (
    <div className={styles.archiveContainer}>
      <header className={styles.archiveHeader}>
        <h1>Archivio Schede</h1>
        <Link href="/" className={styles.backButton}>Torna alla Bacheca</Link>
      </header>

      <div className={styles.archiveContent}>
        {archivedCards.length === 0 ? (
          <p className={styles.emptyMessage}>Nessuna scheda archiviata.</p>
        ) : (
          <table className={styles.archiveTable}>
            <thead>
              <tr>
                <th>Nome Task</th>
                <th>Bacheca</th>
                <th>Lista Originale</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {archivedCards.map(card => (
                <tr key={card.id}>
                  <td><strong>{card.name}</strong></td>
                  <td>{card.board?.name || 'N/A'}</td>
                  <td>{card.list?.name || 'N/A'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <form action={restoreCard}>
                      <input type="hidden" name="id" value={card.id} />
                      <button type="submit" className={styles.restoreButton}>Ripristina</button>
                    </form>
                    <form action={deleteCard}>
                      <input type="hidden" name="id" value={card.id} />
                      <button type="submit" className={styles.deleteButton} style={{ background: '#b91c1c', color: 'white', padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }} title="Attenzione: questa azione è irreversibile">Elimina Definitivamente</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
