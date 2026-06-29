const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const access = await prisma.access.findFirst({ include: { clients: true }});
    console.log('Access before:', access.name, 'Clients:', access.clients.length);
    
    // Attempt to disconnect all clients
    const updated = await prisma.access.update({
      where: { id: access.id },
      data: {
        clients: {
          set: []
        }
      },
      include: { clients: true }
    });
    console.log('Access after set: [] :', updated.name, 'Clients:', updated.clients.length);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
