import { NextResponse } from 'next/server';
import { fetchLists, fetchCards, fetchMembers } from '@/utils/trello';

export async function GET() {
  try {
    // Fetches all necessary data to bootstrap the dashboard
    const [lists, cards, members] = await Promise.all([
      fetchLists(),
      fetchCards(),
      fetchMembers(),
    ]);
    
    return NextResponse.json({ lists, cards, members });
  } catch (error) {
    console.error('Trello API Error:', error);
    return NextResponse.json(
      { error: 'Errore nel recupero dati da Trello. Controlla le chiavi API e l\'ID della Board.' },
      { status: 500 }
    );
  }
}
