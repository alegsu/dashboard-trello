import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// 1. GET: Verifica del Webhook richiesta da Meta
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'WHATSAPP_VERIFY_TOKEN' }
    });
    const expectedVerifyToken = setting?.value || process.env.WHATSAPP_VERIFY_TOKEN || 'gestionale_whatsapp_secret_2026';

    if (mode === 'subscribe' && token === expectedVerifyToken) {
      console.log('✅ WhatsApp Webhook verificato con successo da Meta!');
      return new Response(challenge, { status: 200 });
    }

    console.warn('❌ Token di verifica WhatsApp non valido:', token);
    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Errore durante la verifica del webhook WhatsApp:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Helper per inviare un messaggio WhatsApp tramite Meta Cloud API
async function sendWhatsAppMessage(phoneNumberId, accessToken, to, text) {
  if (!phoneNumberId || !accessToken || !to) {
    console.warn('Parametri mancanti per inviare messaggio WhatsApp:', { phoneNumberId: !!phoneNumberId, accessToken: !!accessToken, to: !!to });
    return;
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Errore risposta Meta invio messaggio WhatsApp:', errText);
    } else {
      console.log('✅ Risposta WhatsApp inviata con successo a', to);
    }
  } catch (err) {
    console.error("Errore fetch invio WhatsApp:", err);
  }
}

// 2. POST: Ricezione messaggi da WhatsApp
export async function POST(request) {
  try {
    const body = await request.json();

    // Recupera credenziali WhatsApp dal database o env
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'] }
      }
    });
    const settingMap = {};
    settings.forEach(s => { settingMap[s.key] = s.value; });

    const phoneNumberId = settingMap['WHATSAPP_PHONE_NUMBER_ID'] || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = settingMap['WHATSAPP_ACCESS_TOKEN'] || process.env.WHATSAPP_ACCESS_TOKEN;

    // Ispeziona la struttura di Meta Webhook
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    // Se è un aggiornamento di stato (es. "sent", "delivered", "read"), confermiamo e chiudiamo
    if (!message) {
      return NextResponse.json({ status: 'ok', detail: 'no message (likely status update)' });
    }

    const from = message.from; // Es: "393401234567"
    const contactName = changes?.contacts?.[0]?.profile?.name || 'Utente WhatsApp';
    const messageType = message.type;

    if (messageType !== 'text') {
      // Se è un messaggio non testuale (audio, immagine, ecc.)
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        from,
        `👋 Ciao ${contactName}! Al momento riesco ad elaborare messaggi di testo. Inviami pure una descrizione testuale del task o della nota che vuoi creare!`
      );
      return NextResponse.json({ status: 'ok', detail: 'non-text message received' });
    }

    const textBody = message.text?.body?.trim();
    if (!textBody) {
      return NextResponse.json({ status: 'ok', detail: 'empty text' });
    }

    console.log(`📩 Messaggio WhatsApp ricevuto da ${contactName} (${from}): "${textBody}"`);

    // Carica contesto dal database: Clienti, Utenti/Collaboratori, Progetti
    const [clients, users, projects] = await Promise.all([
      prisma.client.findMany({ select: { id: true, name: true, color: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true } }),
      prisma.project.findMany({
        where: { status: { not: 'Completato' } },
        select: { id: true, name: true, clientId: true, client: { select: { name: true } } }
      })
    ]);

    const contextClients = clients.map(c => `- ID: "${c.id}" | Nome: "${c.name}"`).join('\n');
    const contextUsers = users.map(u => `- ID: "${u.id}" | Nome: "${u.name}" (${u.email})`).join('\n');
    const contextProjects = projects.map(p => `- ID: "${p.id}" | Progetto: "${p.name}" | Cliente: "${p.client?.name || 'Nessuno'}"`).join('\n');

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `
Sei l'assistente IA di GestionAle, un gestionale operativo per agenzie.
Ricevi messaggi da WhatsApp e devi interpretarli per creare un TASK (Scheda Kanban) oppure aggiungere una NOTA nella Knowledge Base di un cliente.

DATA ODIERNA: ${todayStr} (usa questa per interpretare riferimenti come "domani", "giovedì", "entro venerdì", "fine mese").

CLIENTI REGISTRATI:
${contextClients || 'Nessun cliente registrato'}

COLLABORATORI / UTENTI:
${contextUsers || 'Nessun collaboratore'}

PROGETTI ATTIVI:
${contextProjects || 'Nessun progetto attivo'}

Istruzioni:
1. Riconosci se l'utente vuole creare un TASK (da fare, promemoria, attività, richiesta) o una NOTA (appunto informativo, sintesi call, appunto generico). Se in dubbio, default su "CREATE_TASK".
2. Associa il cliente corrispondente (se nominato) estraendo il suo clientId esatto.
3. Se menziona una persona a cui assegnare il lavoro (es. "assegna a Carlo", "per Carlo", "chiedi a Carlo"), associa il suo assigneeId esatto.
4. Se viene indicata una scadenza o termine, calcola la data nel formato ISO "YYYY-MM-DD" e mettila in "dueDate".
5. Se il messaggio contiene più azioni o checklist, inseriscile nell'array "checklists".
6. Genera un messaggio di risposta cordiale, conciso e professionale ("replyMessage") con emoji, riassumendo chiaramente cosa hai creato nel gestionale.

Rispondi rigorosamente in formato JSON valido con questa struttura:
{
  "action": "CREATE_TASK" | "ADD_NOTE",
  "clientId": "id_cliente_o_null",
  "projectId": "id_progetto_o_null",
  "assigneeId": "id_utente_o_null",
  "title": "Titolo conciso del task o della nota",
  "description": "Descrizione pulita ed esaustiva dell'attività",
  "dueDate": "YYYY-MM-DD o null",
  "checklists": ["voce checklist 1", "voce checklist 2"],
  "replyMessage": "Messaggio di conferma formattato per WhatsApp"
}
`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY mancante.');
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        from,
        "⚠️ Ho ricevuto il tuo messaggio ma la chiave OpenAI non è configurata nel gestionale."
      );
      return NextResponse.json({ status: 'error', message: 'Missing OpenAI key' });
    }

    const openai = new OpenAI({ apiKey });
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Mittente: ${contactName}\nMessaggio: ${textBody}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const aiResult = JSON.parse(aiResponse.choices[0].message.content);
    console.log('🤖 Interpretazione IA WhatsApp:', aiResult);

    let clientName = 'Nessun cliente';
    if (aiResult.clientId) {
      const foundClient = clients.find(c => c.id === aiResult.clientId);
      if (foundClient) clientName = foundClient.name;
    }

    // Esecuzione azione
    if (aiResult.action === 'ADD_NOTE' && aiResult.clientId) {
      await prisma.knowledgeNote.create({
        data: {
          text: `[WhatsApp - ${aiResult.title || 'Nota'}]\n${aiResult.description || textBody}\n\n(Inviato da ${contactName})`,
          source: 'WHATSAPP',
          clientId: aiResult.clientId
        }
      });
      console.log(`✅ Nota WhatsApp aggiunta per ${clientName}`);
    } else {
      // Default: CREATE_TASK
      // Trova board principale e lista TO DO
      const board = await prisma.board.findFirst({
        where: { name: { contains: 'CLIENTI', mode: 'insensitive' } },
        include: { lists: true }
      }) || await prisma.board.findFirst({
        include: { lists: true }
      });

      if (!board) {
        throw new Error('Nessuna bacheca disponibile nel gestionale');
      }

      let todoList = board.lists.find(l => 
        l.name.toLowerCase().includes('to do') || 
        l.name.toLowerCase().includes('da fare') || 
        l.name.toLowerCase().includes('in coda')
      ) || board.lists[0];

      // Calcola ordine
      const lastCard = await prisma.card.findFirst({
        where: { listId: todoList.id, boardId: board.id },
        orderBy: { order: 'desc' }
      });
      const newOrder = lastCard ? lastCard.order + 1000 : 1000;

      // Trova o crea label "DA WHATSAPP"
      let waLabel = await prisma.label.findFirst({
        where: { boardId: board.id, name: { equals: 'DA WHATSAPP', mode: 'insensitive' } }
      });
      if (!waLabel) {
        waLabel = await prisma.label.create({
          data: {
            name: 'DA WHATSAPP',
            color: '#25D366', // Verde WhatsApp
            boardId: board.id
          }
        });
      }

      const cardData = {
        name: aiResult.title || textBody.slice(0, 80),
        description: `${aiResult.description || textBody}\n\n📱 *Inviato via WhatsApp da:* ${contactName} (+${from})`,
        order: newOrder,
        listId: todoList.id,
        boardId: board.id,
        clientId: aiResult.clientId || null,
        projectId: aiResult.projectId || null,
        labels: {
          connect: [{ id: waLabel.id }]
        }
      };

      if (aiResult.dueDate) {
        cardData.due = new Date(aiResult.dueDate);
      }

      if (aiResult.assigneeId) {
        cardData.assignees = {
          connect: [{ id: aiResult.assigneeId }]
        };
      }

      const newCard = await prisma.card.create({
        data: cardData
      });

      // Se ci sono checklist
      if (aiResult.checklists && Array.isArray(aiResult.checklists) && aiResult.checklists.length > 0) {
        await prisma.checklist.create({
          data: {
            title: 'Attività da completare',
            cardId: newCard.id,
            items: {
              create: aiResult.checklists.map((itemText, idx) => ({
                text: itemText,
                isCompleted: false,
                order: (idx + 1) * 1000
              }))
            }
          }
        });
      }

      console.log(`✅ Nuova Card creata via WhatsApp: "${newCard.name}"`);
    }

    // Rispondi al messaggio su WhatsApp
    const confirmationText = aiResult.replyMessage || `✅ Ricevuto! Ho inserito il task per ${clientName} su GestionAle.`;
    await sendWhatsAppMessage(phoneNumberId, accessToken, from, confirmationText);

    return NextResponse.json({ status: 'success', action: aiResult.action });
  } catch (err) {
    console.error('Errore webhook WhatsApp POST:', err);
    // Rispondiamo sempre 200 per evitare che Meta disabiliti il webhook per troppi errori 500
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 });
  }
}
