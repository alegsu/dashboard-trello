const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeClients() {
  console.log("Iniziando il merge dei clienti...");
  const allClients = await prisma.client.findMany();

  // Mappa di "normalizzazione"
  const normalize = (name) => {
    let n = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Rimuove spazi e punteggiatura
      .replace(/srl$/g, '')
      .replace(/spa$/g, '')
      .replace(/snc$/g, '')
      .replace(/sas$/g, '');
    
    // Regole specifiche dall'utente:
    if (n.includes('cupipizza')) return 'cupipizzeria';
    if (n.includes('equinoxe')) return 'equinoxe';
    if (n.includes('hit') || n.includes('hiit')) return 'hitpadova';
    if (n.includes('ama3d')) return 'ama3d';
    
    return n;
  };

  const groups = {};
  for (const client of allClients) {
    const norm = normalize(client.name);
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(client);
  }

  let mergedCount = 0;

  for (const [norm, clients] of Object.entries(groups)) {
    if (clients.length > 1) {
      console.log(`Trovati duplicati per [${norm}]:`, clients.map(c => c.name).join(', '));
      
      // Scegli il primario: preferibilmente quello con sheetData, altrimenti il primo
      let primary = clients.find(c => c.sheetData) || clients[0];
      const duplicates = clients.filter(c => c.id !== primary.id);

      for (const dup of duplicates) {
        console.log(` - Unifico "${dup.name}" in "${primary.name}"`);
        
        // 1. Aggiorna le Card
        await prisma.card.updateMany({
          where: { clientId: dup.id },
          data: { clientId: primary.id }
        });

        // 2. Aggiorna i Progetti
        await prisma.project.updateMany({
          where: { clientId: dup.id },
          data: { clientId: primary.id }
        });

        // Se il primario non aveva sheetData ma il duplicato sì, lo copiamo
        if (!primary.sheetData && dup.sheetData) {
          await prisma.client.update({
            where: { id: primary.id },
            data: { sheetData: dup.sheetData }
          });
          primary.sheetData = dup.sheetData; // per i prossimi cicli
        }

        // 3. Elimina il duplicato
        await prisma.client.delete({
          where: { id: dup.id }
        });

        mergedCount++;
      }
    }
  }

  console.log(`Completato! ${mergedCount} clienti duplicati rimossi/unificati.`);
  await prisma.$disconnect();
}

mergeClients().catch(console.error);
