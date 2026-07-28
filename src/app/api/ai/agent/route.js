import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';

export async function POST(request) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Manca token di autorizzazione' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    
    const settings = await prisma.systemSetting.findUnique({ where: { key: 'AGENT_API_KEY' } });
    const validKey = settings?.value;
    
    if (!validKey || token !== validKey) {
      return NextResponse.json({ error: 'Token non valido o API disabilitata' }, { status: 401 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { title, client_name, assignees, description, board_name } = body;

    if (!title) {
      return NextResponse.json({ error: 'Il titolo (title) è obbligatorio' }, { status: 400 });
    }

    let targetClientId = null;
    let targetAssigneesIds = [];

    // 3. Find Client (fuzzy string match)
    if (client_name) {
      const clients = await prisma.client.findMany({ where: { status: 'CLIENTE' } });
      const searchTarget = client_name.toLowerCase();
      // Simple substring match first
      const matchedClient = clients.find(c => c.name.toLowerCase().includes(searchTarget)) 
                         || clients.find(c => searchTarget.includes(c.name.toLowerCase()));
      if (matchedClient) {
        targetClientId = matchedClient.id;
      }
    }

    // 4. Find Assignees (fuzzy string match)
    if (assignees && Array.isArray(assignees)) {
      const users = await prisma.user.findMany();
      for (const assigneeName of assignees) {
        const searchName = assigneeName.toLowerCase();
        const matchedUser = users.find(u => u.name.toLowerCase().includes(searchName)) 
                         || users.find(u => u.email?.toLowerCase().includes(searchName));
        if (matchedUser && !targetAssigneesIds.includes(matchedUser.id)) {
          targetAssigneesIds.push(matchedUser.id);
        }
      }
    }

    // 5. Find Board
    let targetBoardId = null;
    const allBoards = await prisma.board.findMany({ include: { lists: true } });
    
    if (allBoards.length === 0) {
      return NextResponse.json({ error: 'Nessuna bacheca esistente nel sistema.' }, { status: 400 });
    }

    if (board_name) {
      const s = board_name.toLowerCase();
      const matchedBoard = allBoards.find(b => b.name.toLowerCase().includes(s));
      if (matchedBoard) targetBoardId = matchedBoard.id;
    }

    // Fallback: If client has a project, use project's board
    if (!targetBoardId && targetClientId) {
      const projects = await prisma.project.findMany({ where: { clientId: targetClientId }, include: { board: true } });
      if (projects.length > 0 && projects[0].boardId) {
        targetBoardId = projects[0].boardId;
      }
    }

    // Fallback: Use "Generale", "Da Fare", "Inbox", or the first available board
    if (!targetBoardId) {
      const defaultBoards = allBoards.filter(b => b.name.toLowerCase().includes('general') || b.name.toLowerCase().includes('inbox') || b.name.toLowerCase().includes('da fare'));
      if (defaultBoards.length > 0) {
        targetBoardId = defaultBoards[0].id;
      } else {
        targetBoardId = allBoards[0].id;
      }
    }

    // 6. Find List
    const targetBoard = allBoards.find(b => b.id === targetBoardId);
    let targetListId = null;
    
    if (targetBoard && targetBoard.lists && targetBoard.lists.length > 0) {
      // Find a list like "To Do", "Da Fare", "Nuovi", or just pick the first one
      const todoLists = targetBoard.lists.filter(l => l.name.toLowerCase().includes('fare') || l.name.toLowerCase().includes('do') || l.name.toLowerCase().includes('nuov'));
      if (todoLists.length > 0) {
        targetListId = todoLists[0].id;
      } else {
        targetListId = targetBoard.lists[0].id; // fallback to the first list
      }
    } else {
      return NextResponse.json({ error: 'La bacheca selezionata non ha liste.' }, { status: 400 });
    }

    // Determine final order
    const lastCard = await prisma.card.findFirst({
      where: { listId: targetListId, boardId: targetBoardId },
      orderBy: { order: 'desc' }
    });
    const finalOrder = lastCard ? lastCard.order + 1000 : 1000;

    // 7. Create Card
    const data = {
      name: title,
      description: description || '',
      listId: targetListId,
      boardId: targetBoardId,
      order: finalOrder,
    };

    if (targetClientId) {
      data.clientId = targetClientId;
    }

    if (targetAssigneesIds.length > 0) {
      data.assignees = {
        connect: targetAssigneesIds.map(id => ({ id }))
      };
    }

    const newCard = await prisma.card.create({
      data,
      include: { assignees: true }
    });
    
    // Add a default comment mentioning it was created by Gemini
    await prisma.comment.create({
      data: {
        text: '✨ Task creato automaticamente tramite Assistente IA (Gemini).',
        cardId: newCard.id
      }
    });

    const appSettings = await prisma.systemSetting.findUnique({ where: { key: 'BASE_URL' } });
    const baseUrl = appSettings?.value || 'https://iltuogestionale.com';
    const cardUrl = `${baseUrl}/?card=${newCard.id}`;

    return NextResponse.json({
      success: true,
      message: `Task creato con successo nella bacheca ${targetBoard.name}`,
      cardUrl,
      card: newCard
    });

  } catch (err) {
    console.error("AI Agent Error:", err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
