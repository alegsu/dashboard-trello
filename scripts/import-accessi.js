const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function importAccessi() {
  const jsonPath = path.join(__dirname, '..', '1M65ITMI - accessi-meet-e-report (1).json');
  if (!fs.existsSync(jsonPath)) {
    console.error('File JSON non trovato:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);

  // Trova le liste con "ACCESSI" nel nome
  const accessListIds = data.lists
    .filter(l => l.name.toUpperCase().includes('ACCESSI'))
    .map(l => l.id);

  console.log(`Trovate ${accessListIds.length} liste relative agli accessi.`);

  // Filtra le cards in queste liste
  const accessCards = data.cards.filter(c => accessListIds.includes(c.idList));
  console.log(`Trovate ${accessCards.length} schede accessi.`);

  let created = 0;
  let updated = 0;

  for (const card of accessCards) {
    const clientName = card.name.trim();
    if (!clientName) continue;

    // Crea un blocco testuale per le note
    let accessNotes = `--- ACCESSI DA TRELLO ---\n${card.desc || 'Nessuna descrizione'}`;

    // Cerca un cliente esistente in modo case-insensitive (approx)
    const existingClients = await prisma.client.findMany({
      where: {
        name: {
          contains: clientName,
          mode: 'insensitive'
        }
      }
    });

    if (existingClients.length > 0) {
      // Prendi il primo match
      const client = existingClients[0];
      const newNotes = client.notes ? `${client.notes}\n\n${accessNotes}` : accessNotes;
      await prisma.client.update({
        where: { id: client.id },
        data: { notes: newNotes }
      });
      updated++;
      console.log(`[AGGIORNATO] ${client.name}`);
    } else {
      // Crea un nuovo cliente
      await prisma.client.create({
        data: {
          name: clientName,
          notes: accessNotes
        }
      });
      created++;
      console.log(`[CREATO] ${clientName}`);
    }
  }

  console.log(`\nImportazione completata: ${created} clienti creati, ${updated} clienti aggiornati.`);
}

importAccessi()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
