const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({
    where: {
      notes: {
        not: null,
        not: ''
      }
    }
  });

  console.log(`Found ${clients.length} clients with notes.`);

  for (const client of clients) {
    if (client.notes && client.notes.trim() !== '') {
      await prisma.access.create({
        data: {
          name: 'Appunti Veloci / Referenti',
          notes: client.notes,
          type: 'CLIENT',
          showInCard: true,
          clients: {
            connect: { id: client.id }
          }
        }
      });
      console.log(`Migrated notes for client ${client.name}`);

      // Optional: Clear notes on client
      await prisma.client.update({
        where: { id: client.id },
        data: { notes: '' }
      });
    }
  }

  console.log('Migration complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
