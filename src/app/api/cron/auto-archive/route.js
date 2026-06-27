import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function GET(request) {
  try {
    // Calcola la data limite (7 giorni fa)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 7);

    // Trova tutte le liste "Fatto" o "Completato"
    const doneLists = await prisma.list.findMany({
      where: {
        OR: [
          { name: { contains: 'fatto', mode: 'insensitive' } },
          { name: { contains: 'completat', mode: 'insensitive' } }
        ]
      }
    });

    const doneListIds = doneLists.map(l => l.id);

    if (doneListIds.length > 0) {
      // Archivia tutte le schede in quelle liste che non vengono aggiornate da 7 giorni e non sono già archiviate
      const result = await prisma.card.updateMany({
        where: {
          listId: { in: doneListIds },
          updatedAt: { lt: limitDate },
          isArchived: false
        },
        data: {
          isArchived: true
        }
      });

      console.log(`Auto-archiviate ${result.count} schede ferme in "Fatto" da più di 7 giorni.`);
      return NextResponse.json({ success: true, archivedCount: result.count });
    }

    return NextResponse.json({ success: true, archivedCount: 0 });
  } catch (error) {
    console.error("Errore nell'esecuzione dell'auto-archiviazione:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
