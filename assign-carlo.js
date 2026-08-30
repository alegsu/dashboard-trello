const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const carlo = await prisma.user.findFirst({
    where: {
      name: {
        contains: 'Carlo',
        mode: 'insensitive'
      }
    }
  });

  if (!carlo) {
    console.error("Utente Carlo non trovato!");
    return;
  }

  const result = await prisma.lead.updateMany({
    data: {
      assignedToId: carlo.id
    }
  });

  console.log(`Assegnati ${result.count} lead a Carlo (${carlo.id})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
