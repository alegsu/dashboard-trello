import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  try {
    // Vercel Cron Security: Ensure the request is triggered by Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Troviamo tutte le board
    const boards = await prisma.board.findMany({ include: { lists: true } });
    let movedCardsCount = 0;

    for (const board of boards) {
      // Cerca la lista "Settimana in corso" e "Settimana prossima" (case insensitive)
      const listInCorso = board.lists.find(l => l.name.toLowerCase().includes('in corso'));
      const listProssima = board.lists.find(l => l.name.toLowerCase().includes('prossima'));

      if (listInCorso && listProssima) {
        // Troviamo le card nella settimana in corso (escludendo le liste "Fatto" se esistono, ma in questo caso la lista è proprio "Settimana in corso", quindi tutto ciò che c'è dentro non è smaltito)
        const cardsToMove = await prisma.card.findMany({
          where: { listId: listInCorso.id, isArchived: false }
        });

        for (const card of cardsToMove) {
          await prisma.card.update({
            where: { id: card.id },
            data: { listId: listProssima.id }
          });
          movedCardsCount++;
        }
      }
    }

    return NextResponse.json({ success: true, message: `Moved ${movedCardsCount} cards from In Corso to Prossima.` });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
