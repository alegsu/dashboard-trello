const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accesses = await prisma.access.findMany({
    where: {
      name: {
        startsWith: 'Appunti: '
      }
    }
  });

  console.log(`Found ${accesses.length} accesses to rename.`);

  for (const access of accesses) {
    const newName = access.name.replace('Appunti: ', '');
    await prisma.access.update({
      where: { id: access.id },
      data: { name: newName }
    });
    console.log(`Renamed access to ${newName}`);
  }

  console.log('Rename complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
