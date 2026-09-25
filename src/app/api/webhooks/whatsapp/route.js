import { NextResponse, after } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI, { toFile } from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  if (!phoneNumberId || !accessToken || !to || !text) {
    console.warn('Parametri mancanti per inviare messaggio WhatsApp:', { 
      phoneNumberId: !!phoneNumberId, 
      accessToken: !!accessToken, 
      to: !!to,
      hasText: !!text 
    });
    return;
  }

  const cleanPhone = to.toString().replace(/[^0-9]/g, '');

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
        to: cleanPhone,
        type: 'text',
        text: { body: text }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Errore risposta Meta invio messaggio WhatsApp:', errText);
    } else {
      console.log('✅ Risposta WhatsApp inviata con successo a', cleanPhone);
    }
  } catch (err) {
    console.error("Errore fetch invio WhatsApp:", err);
  }
}

// Helper per scaricare audio WhatsApp e trascriverlo con OpenAI Whisper
async function transcribeWhatsAppAudio(mediaId, accessToken, openai) {
  try {
    // 1. Ottieni l'URL del file multimediale da Meta
    const mediaMetaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!mediaMetaRes.ok) {
      console.error('Errore recupero media Meta:', await mediaMetaRes.text());
      return null;
    }
    const mediaMetaData = await mediaMetaRes.json();
    const downloadUrl = mediaMetaData.url;

    if (!downloadUrl) return null;

    // 2. Scarica il file audio binario
    const audioRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!audioRes.ok) {
      console.error('Errore download file audio da Meta:', await audioRes.text());
      return null;
    }
    const audioBuffer = await audioRes.arrayBuffer();
    const audioFile = await toFile(Buffer.from(audioBuffer), 'whatsapp_voice.ogg', { type: 'audio/ogg' });

    // 3. Trascrivi con Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'it'
    });

    return transcription.text;
  } catch (err) {
    console.error('Errore trascrizione vocale WhatsApp:', err);
    return null;
  }
}

// Elaborazione asincrona in background del messaggio WhatsApp
async function processWhatsAppMessage(body) {
  let phoneNumberId = null;
  let accessToken = null;
  let from = null;
  let contactName = 'Utente WhatsApp';

  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    if (!message) return;

    from = message.from;
    contactName = changes?.contacts?.[0]?.profile?.name || 'Utente';
    const messageType = message.type;

    // Recupera credenziali WhatsApp dal database o env
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'] }
      }
    });
    const settingMap = {};
    settings.forEach(s => { settingMap[s.key] = s.value; });

    phoneNumberId = settingMap['WHATSAPP_PHONE_NUMBER_ID'] || process.env.WHATSAPP_PHONE_NUMBER_ID;
    accessToken = settingMap['WHATSAPP_ACCESS_TOKEN'] || process.env.WHATSAPP_ACCESS_TOKEN;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY mancante.');
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        from,
        "⚠️ Ho ricevuto il tuo messaggio ma la chiave OpenAI non è configurata nel gestionale."
      );
      return;
    }

    const openai = new OpenAI({ apiKey });
    let textBody = '';

    // Gestione vocali e audio
    if (messageType === 'voice' || messageType === 'audio') {
      const mediaId = message.voice?.id || message.audio?.id;
      if (mediaId && accessToken) {
        console.log(`🎙️ Ricevuto vocale da ${contactName}, trascrizione in corso...`);
        textBody = await transcribeWhatsAppAudio(mediaId, accessToken, openai);
      }
      if (!textBody) {
        await sendWhatsAppMessage(
          phoneNumberId,
          accessToken,
          from,
          `👋 Ciao ${contactName}! Ho ricevuto il tuo vocale ma non sono riuscito a trascriverlo. Riprova con un messaggio vocale più chiaro o con un messaggio di testo!`
        );
        return;
      }
      console.log(`🎙️ Trascrizione vocale completata: "${textBody}"`);
    } else if (messageType === 'text') {
      textBody = message.text?.body?.trim() || '';
    } else {
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        from,
        `👋 Ciao ${contactName}! Al momento riesco ad elaborare messaggi di testo e note vocali. Inviami pure un testo o un audio del task o della nota che vuoi gestire!`
      );
      return;
    }

    if (!textBody) return;

    console.log(`📩 Messaggio WhatsApp ricevuto da ${contactName} (${from}): "${textBody}"`);

    // Carica contesto dal database: Clienti, Utenti/Collaboratori, Progetti, Schede aperte
    const [clients, users, projects, openCards] = await Promise.all([
      prisma.client.findMany({ select: { id: true, name: true, color: true } }),
      prisma.user.findMany({ select: { id: true, name: true, email: true, phone: true } }),
      prisma.project.findMany({
        where: { status: { not: 'Completato' } },
        select: { id: true, name: true, clientId: true, client: { select: { name: true } } }
      }),
      prisma.card.findMany({
        where: { 
          isArchived: false,
          list: { NOT: [{ name: { contains: 'fatto', mode: 'insensitive' } }, { name: { contains: 'completat', mode: 'insensitive' } }] }
        },
        select: {
          id: true,
          name: true,
          due: true,
          clientId: true,
          client: { select: { name: true } },
          assignees: { select: { id: true, name: true } },
          list: { select: { name: true } }
        },
        take: 60,
        orderBy: { due: 'asc' }
      })
    ]);

    const contextClients = clients.map(c => `- ID: "${c.id}" | Nome: "${c.name}"`).join('\n');
    const contextUsers = users.map(u => `- ID: "${u.id}" | Nome: "${u.name}" (${u.email}) | Tel: "${u.phone || 'N/D'}"`).join('\n');
    const contextProjects = projects.map(p => `- ID: "${p.id}" | Progetto: "${p.name}" | Cliente: "${p.client?.name || 'Nessuno'}"`).join('\n');
    const contextCards = openCards.map(c => `- ID: "${c.id}" | Titolo: "${c.name}" | Cliente: "${c.client?.name || 'Nessuno'}" | Assegnatari: "${c.assignees.map(a => a.name).join(', ') || 'Nessuno'}" | Scadenza: "${c.due ? c.due.toISOString().split('T')[0] : 'Nessuna'}" | Colonna: "${c.list?.name || 'In corso'}"`).join('\n');

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `
Sei l'assistente IA di GestionAle, un gestionale operativo per agenzie di marketing e comunicazione.
Ricevi messaggi da WhatsApp (sia scritti che note vocali) e devi comprenderne l'intento per compiere l'azione giusta o rispondere alla domanda.

DATA ODIERNA: ${todayStr} (usa questa per interpretare riferimenti temporali come "oggi", "domani", "giovedì", "entro venerdì", "fine mese").

CLIENTI REGISTRATI:
${contextClients || 'Nessun cliente registrato'}

COLLABORATORI / UTENTI:
${contextUsers || 'Nessun collaboratore'}

PROGETTI ATTIVI:
${contextProjects || 'Nessun progetto attivo'}

SCHEDE APERTE ATTUALMENTE IN BACHECA (NON ANCORA SU FATTO):
${contextCards || 'Nessuna scheda aperta'}

Istruzioni:
1. Riconosci l'intento dell'utente tra:
   - "CREATE_TASK": creare una nuova scheda/task da fare.
   - "ADD_NOTE": salvare una nota, promemoria informativo o appunto call nella Knowledge Base del cliente.
   - "COMPLETE_TASK": l'utente dice di aver finito, completato, smarcato o chiuso un task (es. "Ho completato il task del Guelfo", "Smarca la scheda proposta", "Segna come fatto...").
   - "QUERY_INFO": l'utente fa una domanda o chiede informazioni (es. "Cosa c'è da fare oggi?", "Quali task ha Carlo?", "Cosa c'è aperto per Guelfo?").
2. Se "CREATE_TASK":
   - Associa il cliente corrispondente (se nominato) estraendo il suo clientId esatto.
   - Se l'utente chiede di creare o aggiungere il cliente se non esiste (es. "se non esiste il cliente aggiungilo"), inserisci il nome in "newClientNameToCreate".
   - Se menziona una persona a cui assegnare il lavoro (es. "assegna a Carlo", "per Carlo"), associa il suo assigneeId esatto.
   - Se viene indicata una scadenza o termine, calcola la data nel formato ISO "YYYY-MM-DD" e mettila in "dueDate".
   - Se il messaggio contiene checklist o sotto-punti, inseriscili nell'array "checklists".
3. Se "COMPLETE_TASK":
   - Individua l'ID della scheda più pertinente dalla lista delle schede aperte ("cardIdToComplete").
4. Se "QUERY_INFO":
   - Consulta le schede aperte e genera una risposta chiara, puntuale ed elegante in "replyMessage" con punti elenco ed emoji.
5. In TUTTI i casi genera un messaggio di risposta ("replyMessage") amichevole, conciso, professionale con emoji, perfetto da leggere su WhatsApp.

Rispondi rigorosamente in formato JSON valido con questa struttura:
{
  "action": "CREATE_TASK" | "ADD_NOTE" | "COMPLETE_TASK" | "QUERY_INFO",
  "clientId": "id_cliente_o_null",
  "newClientNameToCreate": "Nome_nuovo_cliente_o_null",
  "projectId": "id_progetto_o_null",
  "assigneeId": "id_utente_o_null",
  "cardIdToComplete": "id_card_da_completare_o_null",
  "title": "Titolo conciso del task o della nota",
  "description": "Descrizione pulita ed esaustiva dell'attività",
  "dueDate": "YYYY-MM-DD o null",
  "checklists": ["voce checklist 1", "voce checklist 2"],
  "replyMessage": "Messaggio di conferma formattato per WhatsApp"
}
`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Mittente: ${contactName} (${from})\nMessaggio: ${textBody}` }
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
    } else if (aiResult.newClientNameToCreate) {
      const createdClient = await prisma.client.create({
        data: {
          name: aiResult.newClientNameToCreate.trim(),
          status: 'CLIENTE'
        }
      });
      aiResult.clientId = createdClient.id;
      clientName = createdClient.name;
      console.log(`✨ Creato nuovo cliente da WhatsApp: "${createdClient.name}"`);
    }

    let confirmationText = aiResult.replyMessage;

    // Esecuzione azione
    if (aiResult.action === 'QUERY_INFO') {
      confirmationText = aiResult.replyMessage || "Ecco le informazioni richieste dal gestionale.";
    } else if (aiResult.action === 'COMPLETE_TASK') {
      if (aiResult.cardIdToComplete) {
        const targetCard = await prisma.card.findUnique({
          where: { id: aiResult.cardIdToComplete },
          include: { board: { include: { lists: true } } }
        });

        if (targetCard) {
          const doneList = targetCard.board.lists.find(l => 
            l.name.toLowerCase().includes('fatto') || 
            l.name.toLowerCase().includes('completat')
          ) || targetCard.board.lists[targetCard.board.lists.length - 1];

          await prisma.card.update({
            where: { id: targetCard.id },
            data: {
              listId: doneList.id,
              completedAt: new Date()
            }
          });
          console.log(`✅ Scheda "${targetCard.name}" spostata in "${doneList.name}" via WhatsApp`);
          confirmationText = aiResult.replyMessage || `✅ Ho segnato come completata la scheda *"${targetCard.name}"*! 🎉`;
        } else {
          confirmationText = "Non sono riuscito a trovare la scheda specificata tra quelle aperte.";
        }
      } else {
        confirmationText = aiResult.replyMessage || "Non ho trovato nessuna scheda corrispondente da smarcare.";
      }
    } else if (aiResult.action === 'ADD_NOTE' && aiResult.clientId) {
      await prisma.knowledgeNote.create({
        data: {
          text: `[WhatsApp - ${aiResult.title || 'Nota'}]\n${aiResult.description || textBody}\n\n(Inviato da ${contactName})`,
          source: 'WHATSAPP',
          clientId: aiResult.clientId
        }
      });
      console.log(`✅ Nota WhatsApp aggiunta per ${clientName}`);
      confirmationText = aiResult.replyMessage || `📝 Nota salvata con successo per *${clientName}*!`;
    } else {
      // Default: CREATE_TASK
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

      const lastCard = await prisma.card.findFirst({
        where: { listId: todoList.id, boardId: board.id },
        orderBy: { order: 'desc' }
      });
      const newOrder = lastCard ? lastCard.order + 1000 : 1000;

      let waLabel = await prisma.label.findFirst({
        where: { boardId: board.id, name: { equals: 'DA WHATSAPP', mode: 'insensitive' } }
      });
      if (!waLabel) {
        waLabel = await prisma.label.create({
          data: {
            name: 'DA WHATSAPP',
            color: '#25D366',
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
      confirmationText = aiResult.replyMessage || `✅ Ricevuto! Ho inserito il task per ${clientName} su GestionAle.`;
    }

    // Rispondi al messaggio su WhatsApp
    await sendWhatsAppMessage(phoneNumberId, accessToken, from, confirmationText);

  } catch (err) {
    console.error('Errore durante l\'elaborazione del messaggio WhatsApp:', err);
    if (phoneNumberId && accessToken && from) {
      await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        from,
        "⚠️ Scusa, si è verificato un intoppo momentaneo nell'elaborazione del tuo messaggio. Riprova tra poco!"
      );
    }
  }
}

// 2. POST: Ricezione messaggi da WhatsApp (Immediata conferma 200 a Meta + elaborazione asincrona in background)
export async function POST(request) {
  try {
    const body = await request.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const message = changes?.messages?.[0];

    // Se è un aggiornamento di stato di Meta (es. "sent", "delivered", "read"), confermiamo e chiudiamo subito
    if (!message) {
      return NextResponse.json({ status: 'ok', detail: 'status update' });
    }

    // Esegui l'elaborazione (OpenAI, DB, invio WhatsApp) in background senza bloccare il webhook di Meta
    after(async () => {
      await processWhatsAppMessage(body);
    });

    // Rispondi a Meta in pochissimi millisecondi (<50ms) per evitare qualsiasi timeout a monte
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('Errore webhook WhatsApp POST root:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 });
  }
}
