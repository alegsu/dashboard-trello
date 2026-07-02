const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accesses = await prisma.access.findMany({
    where: {
      name: 'Appunti Veloci / Referenti'
    },
    include: {
      clients: true
    }
  });

  console.log(`Found ${accesses.length} accesses to rename.`);

  for (const access of accesses) {
    if (access.clients && access.clients.length > 0) {
      // Use the first client's name
      const newName = `Appunti: ${access.clients[0].name}`;
      await prisma.access.update({
        where: { id: access.id },
        data: { name: newName }
      });
      console.log(`Renamed access ${access.id} to ${newName}`);
    }
  }

  console.log('Rename complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
