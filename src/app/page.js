import { fetchLists, fetchCards, fetchMembers } from '@/utils/trello';
import DashboardClient from '@/components/DashboardClient';

export default async function Home() {
  let lists = [], cards = [], members = [];
  let error = null;

  try {
    [lists, cards, members] = await Promise.all([
      fetchLists(),
      fetchCards(),
      fetchMembers()
    ]);
  } catch (err) {
    console.error(err);
    error = err.message;
  }

  if (error) {
    return (
      <main style={{ padding: '2rem', color: 'var(--status-danger)' }}>
        <h1>Errore di Connessione a Trello</h1>
        <p>{error}</p>
        <p>Assicurati che le chiavi API nel file .env.local siano corrette e che l'ID della board sia giusto.</p>
      </main>
    );
  }

  return <DashboardClient initialLists={lists} initialCards={cards} initialMembers={members} />;
}
