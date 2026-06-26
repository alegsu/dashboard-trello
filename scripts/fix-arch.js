const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixArchitecture() {
  console.log("Ripristino cliente rimosso per errore...");
  
  const newClient = await prisma.client.create({
    data: { name: "3NDY + PORTALI Architettura" }
  });

  const hitClient = await prisma.client.findFirst({ where: { name: "HIT" } });
  
  if (hitClient) {
    // Cerchiamo i progetti che contengono 3NDY o PORTALI e li riassegniamo
    const projects = await prisma.project.findMany({
      where: { 
        clientId: hitClient.id,
        OR: [
          { name: { contains: "3NDY" } },
          { name: { contains: "PORTAL" } },
          { name: { contains: "Architettura" } }
        ]
      }
    });

    for (const p of projects) {
      await prisma.project.update({
        where: { id: p.id },
        data: { clientId: newClient.id, clientName: newClient.name }
      });
      console.log(`Progetto ripristinato: ${p.name}`);
    }

    // Facciamo lo stesso per le Card
    const cards = await prisma.card.findMany({
      where: {
        clientId: hitClient.id,
        OR: [
          { name: { contains: "3NDY" } },
          { name: { contains: "PORTAL" } }
        ]
      }
    });
    for (const c of cards) {
      await prisma.card.update({
        where: { id: c.id },
        data: { clientId: newClient.id }
      });
      console.log(`Card ripristinata: ${c.name}`);
    }
  }

  console.log("Fatto.");
  await prisma.$disconnect();
}

fixArchitecture().catch(console.error);
