import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  try {
    // Vercel Cron Security: Ensure the request is triggered by Vercel
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const boards = await prisma.board.findMany({ include: { lists: true } });
    let operationsLog = [];

    const now = new Date();
    // Assuming cron runs on Monday. If it runs on another day, adjust accordingly.
    // Let's get the Monday of the current week (just to be safe)
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1); 
    const currentMonday = new Date(now.setDate(diffToMonday));
    currentMonday.setHours(0, 0, 0, 0);

    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    currentSunday.setHours(23, 59, 59, 999);

    const nextMonday = new Date(currentSunday);
    nextMonday.setDate(currentSunday.getDate() + 1);
    nextMonday.setHours(0, 0, 0, 0);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    for (const board of boards) {
      const oldScorse = board.lists.filter(l => l.name.toLowerCase().includes('scorsa') && !l.isArchived);
      const listInCorso = board.lists.find(l => l.name.toLowerCase().includes('in corso') && !l.isArchived);
      const listProssima = board.lists.find(l => l.name.toLowerCase().includes('prossima') && !l.isArchived);
      const listToDo = board.lists.find(l => (l.name.toLowerCase() === 'to do' || l.name.toLowerCase() === 'todo') && !l.isArchived);

      let newScorsaId = null;
      let newInCorsoId = null;
      let newProssimaId = null;

      // 1. "Settimana in Corso" diventa "Settimana Scorsa"
      if (listInCorso) {
        await prisma.list.update({
          where: { id: listInCorso.id },
          data: { name: 'Settimana Scorsa' }
        });
        newScorsaId = listInCorso.id;
        operationsLog.push(`[${board.name}] Rinominata '${listInCorso.name}' in 'Settimana Scorsa'.`);

        // 1.b Se ci sono vecchie "Settimana Scorsa", uniamo le schede in quella nuova e le eliminiamo
        for (const oldScorsa of oldScorse) {
          if (oldScorsa.id !== listInCorso.id) {
            await prisma.card.updateMany({
              where: { listId: oldScorsa.id },
              data: { listId: listInCorso.id }
            });
            await prisma.list.delete({ where: { id: oldScorsa.id } });
            operationsLog.push(`[${board.name}] Ereditate schede dalla vecchia '${oldScorsa.name}' ed eliminata.`);
          }
        }
      } else if (oldScorse.length > 0) {
        // Se non avevamo In Corso, ma abbiamo vecchie Scorsa, compattiamole nella prima
        newScorsaId = oldScorse[0].id;
        for (let i = 1; i < oldScorse.length; i++) {
          await prisma.card.updateMany({
            where: { listId: oldScorse[i].id },
            data: { listId: newScorsaId }
          });
          await prisma.list.delete({ where: { id: oldScorse[i].id } });
        }
      }

      // 2. "Prossima Settimana" diventa "Settimana in Corso"
      if (listProssima) {
        await prisma.list.update({
          where: { id: listProssima.id },
          data: { name: 'Settimana in Corso' }
        });
        newInCorsoId = listProssima.id;
        operationsLog.push(`[${board.name}] Rinominata '${listProssima.name}' in 'Settimana in Corso'.`);
      }

      // 3. Creazione della nuova "Prossima Settimana"
      // L'ordine dovrebbe essere subito dopo "Settimana in Corso"
      const order = listProssima ? listProssima.order + 0.1 : (listInCorso ? listInCorso.order + 0.1 : 0);
      const nuovaProssima = await prisma.list.create({
        data: {
          name: 'Prossima Settimana',
          boardId: board.id,
          order: order
        }
      });
      newProssimaId = nuovaProssima.id;
      operationsLog.push(`[${board.name}] Creata nuova lista 'Prossima Settimana'.`);

      // 4. Smistamento intelligente dal "TO DO"
      if (listToDo && newInCorsoId && newProssimaId) {
        const todoCards = await prisma.card.findMany({
          where: { listId: listToDo.id, isArchived: false, due: { not: null } }
        });

        let movedToInCorso = 0;
        let movedToProssima = 0;

        for (const card of todoCards) {
          const dueDate = new Date(card.due);
          
          if (dueDate >= currentMonday && dueDate <= currentSunday) {
            await prisma.card.update({
              where: { id: card.id },
              data: { listId: newInCorsoId }
            });
            movedToInCorso++;
          } else if (dueDate >= nextMonday && dueDate <= nextSunday) {
            await prisma.card.update({
              where: { id: card.id },
              data: { listId: newProssimaId }
            });
            movedToProssima++;
          }
        }
        
        if (movedToInCorso > 0 || movedToProssima > 0) {
          operationsLog.push(`[${board.name}] Smistate ${movedToInCorso} schede verso In Corso e ${movedToProssima} verso Prossima da TO DO.`);
        }
      }
    }

    return NextResponse.json({ success: true, log: operationsLog });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
