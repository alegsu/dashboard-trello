const API_KEY = process.env.TRELLO_API_KEY;
const API_TOKEN = process.env.TRELLO_API_TOKEN;
const BOARD_ID = process.env.TRELLO_BOARD_ID;

const BASE_URL = 'https://api.trello.com/1';

function getAuthParams() {
  if (!API_KEY || !API_TOKEN) {
    throw new Error('Trello API keys are missing in environment variables');
  }
  return `key=${API_KEY}&token=${API_TOKEN}`;
}

export async function fetchLists() {
  const res = await fetch(`${BASE_URL}/boards/${BOARD_ID}/lists?${getAuthParams()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch lists: ${res.statusText}`);
  return res.json();
}

export async function fetchCards() {
  // Richiediamo anche i dettagli estesi come membri, etichette e checklist
  const params = `${getAuthParams()}&members=true&checklists=all&labels=true&customFieldItems=true`;
  const res = await fetch(`${BASE_URL}/boards/${BOARD_ID}/cards?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.statusText}`);
  return res.json();
}

export async function fetchMembers() {
  const res = await fetch(`${BASE_URL}/boards/${BOARD_ID}/members?${getAuthParams()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch members: ${res.statusText}`);
  return res.json();
}

export async function updateCard(cardId, updates) {
  // updates può contenere { idList, due, name, desc, etc }
  const url = new URL(`${BASE_URL}/cards/${cardId}`);
  url.searchParams.append('key', API_KEY);
  url.searchParams.append('token', API_TOKEN);
  
  // Aggiungiamo i campi da aggiornare come query params
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
       url.searchParams.append(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`Failed to update card: ${res.statusText}`);
  return res.json();
}
