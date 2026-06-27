const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.systemSetting.findMany().then(s => console.log(s)).catch(console.error).finally(() => prisma.$disconnect());
