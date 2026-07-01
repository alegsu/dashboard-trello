import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const clientId = params.id;
    const notes = await prisma.knowledgeNote.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("Error fetching knowledge notes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const clientId = params.id;
    const { text, source = "MANUAL" } = await request.json();

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Testo mancante' }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 });
    }

    let openaiAssistantId = client.openaiAssistantId;
    let openaiVectorStoreId = client.openaiVectorStoreId;

    const apiKey = process.env.OPENAI_API_KEY;
    let openaiFileId = null;

    if (apiKey) {
      const openai = new OpenAI({ apiKey });

      // Create Vector Store if missing
      if (!openaiVectorStoreId) {
        const vectorStore = await openai.beta.vectorStores.create({
          name: `Client_${clientId}_VectorStore`
        });
        openaiVectorStoreId = vectorStore.id;
        
        await prisma.client.update({
          where: { id: clientId },
          data: { openaiVectorStoreId }
        });
      }

      // Create Assistant if missing
      if (!openaiAssistantId) {
        const assistant = await openai.beta.assistants.create({
          name: `Assistente Cliente ${client.name}`,
          instructions: `Sei l'assistente dedicato del cliente ${client.name}. Rispondi alle domande basandoti SOLO sulle informazioni presenti nei file allegati. Se l'informazione non è presente nei file, rispondi che non hai abbastanza dati. Non inventare o dedurre informazioni.`,
          model: "gpt-4o",
          tools: [{ type: "file_search" }],
          tool_resources: {
            file_search: {
              vector_store_ids: [openaiVectorStoreId]
            }
          }
        });
        openaiAssistantId = assistant.id;
        
        await prisma.client.update({
          where: { id: clientId },
          data: { openaiAssistantId }
        });
      }

      // Save the note as a temporary file to upload
      const tmpFilePath = path.join(os.tmpdir(), `note_${Date.now()}.txt`);
      fs.writeFileSync(tmpFilePath, text, 'utf-8');

      // Upload file to OpenAI
      const file = await openai.files.create({
        file: fs.createReadStream(tmpFilePath),
        purpose: 'assistants',
      });
      openaiFileId = file.id;

      // Attach file to Vector Store
      await openai.beta.vectorStores.files.create(
        openaiVectorStoreId,
        { file_id: file.id }
      );

      // Clean up tmp file
      fs.unlinkSync(tmpFilePath);
    }

    // Save note in DB
    const note = await prisma.knowledgeNote.create({
      data: {
        text,
        source,
        clientId,
        openaiFileId
      }
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Error creating knowledge note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
