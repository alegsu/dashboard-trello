const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const firstUser = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  if (firstUser) {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: 'admin' }
    });
    console.log('Made first user admin:', firstUser.name);
  } else {
    console.log('No user found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
