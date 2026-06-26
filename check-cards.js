const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const cards = await prisma.card.findMany({
    select: { id: true, name: true, listId: true, order: true }
  });
  console.log("Cards:");
  console.table(cards);
}

check()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
