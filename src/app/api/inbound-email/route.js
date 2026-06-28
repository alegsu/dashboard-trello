import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    const payload = await request.json();

    console.log("=== INBOUND EMAIL PAYLOAD RICEVUTO ===");
    // console.log(JSON.stringify(payload, null, 2));

    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    const expectedToken = process.env.INBOUND_WEBHOOK_SECRET || 'gestionale-ai-token-123';
    if (token !== expectedToken) {
      console.error("Token non valido o mancante:", token);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Estrai dati dalla mail (Resend Inbound payload)
    // Resend manda gli eventi webhook con la struttura: { type: "email.received", data: { from, to, subject, text, html } }
    const emailData = payload.data || payload; // Fallback se fosse un formato diverso
    const fromAddress = emailData.from || '';
    const subject = emailData.subject || '';
    // Alcuni client di posta mandano solo HTML, quindi usiamo html come fallback se text è vuoto
    const textBody = emailData.text || emailData.html || '';
    const htmlBody = emailData.html || '';

    // Estrai la vera email dal campo from (es. "Nome Cognome <email@dominio.it>")
    const emailMatch = fromAddress.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : fromAddress.toLowerCase();

    // Sicurezza: L'utente mittente deve esistere nel gestionale
    const user = await prisma.user.findUnique({
      where: { email: senderEmail }
    });

    if (!user) {
      console.error(`Mittente non autorizzato: ${senderEmail}`);
      // Ritorniamo 200 per dire a Resend che abbiamo gestito la richiesta (ignorandola)
      return NextResponse.json({ success: true, message: 'Ignorata: mittente non autorizzato' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Chiave API OpenAI mancante.');
      return NextResponse.json({ error: 'Missing OpenAI key' }, { status: 500 });
    }

    // Prepara il contesto: Clienti e Progetti
    const clients = await prisma.client.findMany({ select: { id: true, name: true } });
    const projects = await prisma.project.findMany({ 
      where: { status: { not: 'Completato' } },
      select: { id: true, name: true, clientId: true, client: { select: { name: true } } } 
    });

    const contextClients = clients.map(c => `- ID: ${c.id} | Nome: ${c.name}`).join('\n');
    const contextProjects = projects.map(p => `- ID: ${p.id} | Nome: ${p.name} | Cliente: ${p.client?.name || 'Nessuno'}`).join('\n');

    const systemPrompt = `
Sei un assistente AI integrato in un gestionale (CRM). Il tuo compito è leggere le email in entrata e decidere cosa fare.
L'utente che ha inoltrato la mail è: ${user.name} (${user.email}).

Hai a disposizione la seguente lista di CLIENTI nel database:
${contextClients || 'Nessun cliente'}

Hai a disposizione la seguente lista di PROGETTI aperti nel database:
${contextProjects || 'Nessun progetto'}

Analizza il seguente Oggetto e Testo dell'email.
Devi estrarre i dati in formato JSON strettamente aderente a questa struttura:
{
  "action": "CREATE_TASK" | "ADD_NOTE" | "UNKNOWN",
  "clientId": "id_del_cliente_oppure_null",
  "projectId": "id_del_progetto_oppure_null",
  "title": "Titolo breve per la scheda o la nota",
  "description": "Testo descrittivo o corpo dell'email ripulito",
  "checklists": ["voce 1", "voce 2"] // opzionale, array di stringhe se trovi una lista di cose da fare
}

Regole:
1. Se il testo contiene appunti o resoconti su un cliente, action = "ADD_NOTE" e metti il clientId.
2. Se il testo contiene cose da fare, action = "CREATE_TASK".
3. Se riconosci chiaramente il cliente o il progetto dal testo o dall'oggetto, inserisci i relativi ID. Se sei in dubbio o il cliente non esiste, lascia i campi a null.
4. Se trovi un elenco puntato o numerato di cose da fare, estrailo in "checklists".
5. Nel campo description inserisci le informazioni rilevanti ripulite (togli saluti inutili o le firme delle mail inoltrate).
`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Oggetto: ${subject}\n\nTesto:\n${textBody}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    console.log("=== AI DECISION ===", aiResult);

    // Esegui l'azione sul Database
    if (aiResult.action === "ADD_NOTE" && aiResult.clientId) {
      // Aggiungi nota al cliente
      const client = await prisma.client.findUnique({ where: { id: aiResult.clientId } });
      if (client) {
        const timestamp = new Date().toLocaleString('it-IT');
        const newNote = `[Nota generata da Email - ${timestamp} - ${user.name}]\n**${aiResult.title}**\n${aiResult.description}\n\n`;
        const updatedNotes = client.notes ? client.notes + '\n\n' + newNote : newNote;
        await prisma.client.update({
          where: { id: client.id },
          data: { notes: updatedNotes }
        });
      }
    } 
    else if (aiResult.action === "CREATE_TASK" || aiResult.action === "UNKNOWN" || !aiResult.action) {
      // Trova la board principale e la lista TO DO
      const board = await prisma.board.findFirst({
        where: { name: { contains: 'CLIENTI', mode: 'insensitive' } },
        include: { lists: true }
      });

      if (!board) {
        console.error("Nessuna board trovata.");
        return NextResponse.json({ error: 'Nessuna board trovata' }, { status: 500 });
      }

      let todoList = board.lists.find(l => l.name.toLowerCase().includes('to do') || l.name.toLowerCase().includes('da fare'));
      
      if (!todoList) {
        // Fallback alla prima lista se TO DO non esiste
        todoList = board.lists[0];
      }

      // Calcola l'ordine (mettila in fondo)
      const lastCard = await prisma.card.findFirst({
        where: { listId: todoList.id, boardId: board.id },
        orderBy: { order: 'desc' }
      });
      const newOrder = lastCard ? lastCard.order + 1000 : 1000;

      // Crea la Card
      const newCard = await prisma.card.create({
        data: {
          name: aiResult.title || subject || "Task da Email",
          description: aiResult.description || textBody,
          order: newOrder,
          listId: todoList.id,
          boardId: board.id,
          clientId: aiResult.clientId || null,
          projectId: aiResult.projectId || null,
        }
      });

      // Se ci sono checklist
      if (aiResult.checklists && Array.isArray(aiResult.checklists) && aiResult.checklists.length > 0) {
        await prisma.checklist.create({
          data: {
            name: "To-Do List (da Email)",
            cardId: newCard.id,
            items: {
              create: aiResult.checklists.map((itemTesto, index) => ({
                text: itemTesto,
                isCompleted: false,
                order: (index + 1) * 1000
              }))
            }
          }
        });
      }
    }

    return NextResponse.json({ success: true, aiResult });
  } catch (err) {
    console.error("Errore durante la ricezione dell'inbound email:", err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
