import { NextResponse } from 'next/server';
import { prisma } from '@/utils/prisma';
import OpenAI from 'openai';

export async function DELETE(request, { params }) {
  try {
    const { id: clientId, noteId } = await params;

    // Verify note belongs to client
    const note = await prisma.knowledgeNote.findFirst({
      where: {
        id: noteId,
        clientId: clientId
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Nota non trovata' }, { status: 404 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && note.openaiFileId) {
      const openai = new OpenAI({ apiKey });
      try {
        // Deleting the file globally in OpenAI also removes it from vector stores
        await openai.files.del(note.openaiFileId);
      } catch (openAiError) {
        console.error("Error deleting file from OpenAI:", openAiError);
        // We continue with local DB deletion even if OpenAI deletion fails
      }
    }

    await prisma.knowledgeNote.delete({
      where: { id: noteId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
