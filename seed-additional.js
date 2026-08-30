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

  const leads = [
    {
      companyName: "Hotel L'Orologio (Firenze)",
      notes: "Progetto Hotel L'Orologio a Firenze.",
      brand: "Daphlab",
      status: "CONTATTATO",
      assignedToId: carlo.id
    },
    {
      companyName: "Polo Lucca",
      notes: "Lucca: Polo Lucca, che comprende Grand Universe (5 stelle, 55 camere) e le relative residenze alberghiere.",
      brand: "Daphlab",
      status: "CONTATTATO",
      assignedToId: carlo.id
    },
    {
      companyName: "Polo Garfagnana",
      notes: "Castelvecchio Pascoli / Garfagnana: Polo Garfagnana, che comprende Renaissance (4 stelle, 200 camere), oltre a chalet, ville private e ristoranti.",
      brand: "Daphlab",
      status: "CONTATTATO",
      assignedToId: carlo.id
    }
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: lead
    });
    console.log(`Inserito: ${lead.companyName}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
