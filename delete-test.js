const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.card.deleteMany({
  where: { name: 'Inviare proposta e richiamare Hotel Il Guelfo Bianco' }
}).then(r => console.log('Deleted:', r.count)).finally(() => prisma.$disconnect());
