import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Carichiamo le variabili a mano da .env.local perché stiamo eseguendo lo script fuori da Next.js
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const prisma = new PrismaClient();

const API_KEY = process.env.TRELLO_API_KEY;
const API_TOKEN = process.env.TRELLO_API_TOKEN;
// Accettiamo sia il vecchio singolare che il nuovo plurale
const boardIdsStr = process.env.TRELLO_BOARD_IDS || process.env.TRELLO_BOARD_ID;
const BOARD_IDS = boardIdsStr ? boardIdsStr.split(',').map(id => id.trim()) : [];

const BASE_URL = 'https://api.trello.com/1';

function getAuthParams() {
  return `key=${API_KEY}&token=${API_TOKEN}`;
}

async function seed() {
  if (!API_KEY || !API_TOKEN) {
    console.error('ERRORE: Chiavi Trello mancanti in .env.local');
    process.exit(1);
  }

  if (BOARD_IDS.length === 0) {
    console.error('ERRORE: Nessun TRELLO_BOARD_ID o TRELLO_BOARD_IDS trovato in .env.local');
    process.exit(1);
  }

  console.log('🚀 Avvio migrazione da Trello al nuovo Database Locale...\n');
  
  for (const boardId of BOARD_IDS) {
    if (!boardId) continue;
    console.log(`\n⏳ Elaborazione Bacheca (Board): ${boardId}`);

    // Fetch Board
    const boardRes = await fetch(`${BASE_URL}/boards/${boardId}?${getAuthParams()}`);
    if (!boardRes.ok) {
        console.error(`Impossibile trovare la board ${boardId}. Salto...`);
        continue;
    }
    const boardData = await boardRes.json();
    
    await prisma.board.upsert({
      where: { id: boardData.id },
      update: { name: boardData.name },
      create: { id: boardData.id, name: boardData.name }
    });
    console.log(`✅ Bacheca salvata: ${boardData.name}`);
    
    // Fetch Members
    const memRes = await fetch(`${BASE_URL}/boards/${boardId}/members?${getAuthParams()}`);
    const members = await memRes.json();
    
    for (const mem of members) {
      await prisma.user.upsert({
        where: { id: mem.id },
        update: { name: mem.fullName, avatarUrl: mem.avatarUrl },
        create: { id: mem.id, name: mem.fullName, avatarUrl: mem.avatarUrl }
      });
    }
    console.log(`✅ Importati ${members.length} Utenti (Team).`);

    // Fetch Lists
    const listRes = await fetch(`${BASE_URL}/boards/${boardId}/lists?${getAuthParams()}`);
    const lists = await listRes.json();
    
    for (const [index, list] of lists.entries()) {
      await prisma.list.upsert({
        where: { id: list.id },
        update: { name: list.name, order: index, boardId: boardData.id },
        create: { id: list.id, name: list.name, order: index, boardId: boardData.id }
      });
    }
    console.log(`✅ Importati ${lists.length} Clienti (Liste).`);

    // Fetch Cards
    const cardRes = await fetch(`${BASE_URL}/boards/${boardId}/cards?${getAuthParams()}&members=true`);
    const cards = await cardRes.json();
    
    for (const [index, card] of cards.entries()) {
      const cardData = {
        name: card.name,
        description: card.desc || null,
        due: card.due ? new Date(card.due) : null,
        order: index,
        listId: card.idList,
        boardId: boardData.id,
      };

      await prisma.card.upsert({
        where: { id: card.id },
        update: { 
          ...cardData,
          assignees: {
            set: card.idMembers.map(id => ({ id }))
          }
        },
        create: {
          id: card.id,
          ...cardData,
          assignees: {
            connect: card.idMembers.map(id => ({ id }))
          }
        }
      });
    }
    console.log(`✅ Importati ${cards.length} Task (Card).`);
  }

  console.log('\n🎉 Migaazione Completata con Successo! I dati sono nel tuo Database.');
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
