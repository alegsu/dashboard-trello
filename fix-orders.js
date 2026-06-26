const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const lists = await prisma.list.findMany({ select: { id: true } });
  
  for (const list of lists) {
    const cards = await prisma.card.findMany({
      where: { listId: list.id },
      orderBy: [
        { order: 'asc' },
        { id: 'asc' } // Fallback per ordini identici
      ]
    });
    
    for (let i = 0; i < cards.length; i++) {
      await prisma.card.update({
        where: { id: cards[i].id },
        data: { order: (i + 1) * 1000 } // Spaziatura ampia
      });
    }
  }
  
  console.log("Ordini ricalcolati e distanziati.");
}

fix().catch(console.error).finally(() => prisma.$disconnect());
