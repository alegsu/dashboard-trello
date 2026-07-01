import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function POST(request, { params }) {
  try {
    const clientId = params.id;
    const { message } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Messaggio mancante' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    const openaiAssistantId = client.openaiAssistantId;
    if (!openaiAssistantId) {
      return NextResponse.json({ error: 'Nessun assistente configurato. Aggiungi prima una nota.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Manca la chiave OpenAI' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    // Creiamo un nuovo thread
    const thread = await openai.beta.threads.create();

    // Aggiungiamo il messaggio dell'utente al thread
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: message
      }
    );

    // Eseguiamo l'assistente
    const run = await openai.beta.threads.runs.createAndPoll(
      thread.id,
      { assistant_id: openaiAssistantId }
    );

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      
      // I messaggi sono ordinati dal più recente al più vecchio
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (assistantMessage) {
        return NextResponse.json({ 
          success: true, 
          response: assistantMessage.content[0].text.value 
        });
      } else {
        return NextResponse.json({ error: 'Nessuna risposta generata dall\'assistente' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: `La run non è andata a buon fine. Status: ${run.status}` }, { status: 500 });
    }

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
