const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({ data: { role: 'admin' } });
  console.log('All users updated to admin');
}

main().catch(console.error).finally(() => prisma.$disconnect());
